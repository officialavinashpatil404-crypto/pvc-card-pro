import os
import io
import sys
import gzip
import zlib
import base64
import re
from typing import Optional, List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import fitz  # PyMuPDF
import numpy as np
from PIL import Image
import zxingcpp
import cv2
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="PVC Card Deterministic Aadhaar & Indic Script Extractor")

# Enable CORS for Next.js app communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Indic Unicode Script Definitions
# ---------------------------------------------------------------------------
SCRIPT_RANGES = [
    ("devanagari", 0x0900, 0x097F),
    ("gujarati", 0x0A80, 0x0AFF),
    ("bengali", 0x0980, 0x09FF),
    ("tamil", 0x0B80, 0x0BFF),
    ("telugu", 0x0C00, 0x0C7F),
    ("kannada", 0x0C80, 0x0CFF),
    ("malayalam", 0x0D00, 0x0D7F),
    ("oriya", 0x0B00, 0x0B7F),
    ("gurmukhi", 0x0A00, 0x0A7F),
]

def detect_script(text: str) -> str:
    for ch in text:
        code = ord(ch)
        for name, lo, hi in SCRIPT_RANGES:
            if lo <= code <= hi:
                return name
    return "latin"

def has_local_script(line: str) -> bool:
    return detect_script(line) != "latin"

# ---------------------------------------------------------------------------
# QR Candidate Extractor (Image Streams + Rendered Regions)
# ---------------------------------------------------------------------------
def extract_candidate_qr_images(doc: fitz.Document) -> List[Image.Image]:
    candidates = []
    pages_to_scan = [doc[i] for i in range(min(2, len(doc)))]

    # 1. Direct PDF image streams
    for page in pages_to_scan:
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                img_bytes = base_image["image"]
                pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                w, h = pil_img.size
                aspect = w / h if h else 0
                if 0.80 <= aspect <= 1.25 and w >= 80:
                    candidates.append(pil_img)
            except Exception:
                continue

    # 2. Render pages at 300 DPI to catch scanned PDFs and vector-embedded QR codes
    for page in pages_to_scan:
        try:
            pix = page.get_pixmap(dpi=300)
            page_img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            w, h = page_img.size
            candidates.append(page_img)
            if h > 1000:
                bottom_area = page_img.crop((0, int(h * 0.55), w, h))
                candidates.append(bottom_area)
                bw, bh = bottom_area.size
                candidates.append(bottom_area.crop((int(bw * 0.20), int(bh * 0.30), int(bw * 0.52), bh)))
                candidates.append(bottom_area.crop((int(bw * 0.50), int(bh * 0.15), int(bw * 0.85), bh)))
        except Exception:
            pass

    return candidates

# ---------------------------------------------------------------------------
# QR Decoder with Multi-Engine Fallback (ZXing-C++ / OpenCV)
# ---------------------------------------------------------------------------
def decode_qr_to_bytes(pil_img: Image.Image) -> Optional[bytes]:
    # 1. Try ZXing-C++ directly
    try:
        results = zxingcpp.read_barcodes(pil_img)
        for res in results:
            if res.text or res.bytes:
                payload = res.text or res.bytes.decode("latin-1", errors="ignore")
                # Case A: UIDAI Numeric QR Mode (decimal string of big integer)
                if payload.isdigit() and len(payload) > 50:
                    big_int = int(payload)
                    byte_length = (big_int.bit_length() + 7) // 8
                    return big_int.to_bytes(byte_length, byteorder="big")
                
                # Case B: Raw bytes
                if res.bytes and len(res.bytes) > 20:
                    return res.bytes
                if payload:
                    return payload.encode("latin-1", errors="ignore")
    except Exception:
        pass

    # 2. Try OpenCV QRCodeDetector as fallback
    try:
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2GRAY)
        detector = cv2.QRCodeDetector()
        val, _, _ = detector.detectAndDecode(cv_img)
        if val and val.isdigit() and len(val) > 50:
            big_int = int(val)
            byte_length = (big_int.bit_length() + 7) // 8
            return big_int.to_bytes(byte_length, byteorder="big")
    except Exception:
        pass

    return None

# ---------------------------------------------------------------------------
# Payload Decompressor
# ---------------------------------------------------------------------------
def decompress_payload(raw: bytes) -> bytes:
    for fn in [gzip.decompress, zlib.decompress, lambda b: zlib.decompress(b, -zlib.MAX_WBITS)]:
        try:
            return fn(raw)
        except Exception:
            continue
    return raw

# ---------------------------------------------------------------------------
# Delimited Field Parser (UIDAI Standard Specification)
# ---------------------------------------------------------------------------
FIELD_MAPPING = {
    0: "version",
    2: "reference_id",
    3: "full_name",
    4: "dob",
    5: "gender",
    6: "care_of",
    7: "district",
    8: "landmark",
    9: "house",
    10: "location",
    11: "pincode",
    12: "post_office",
    13: "state",
    14: "sub_district",
    15: "vtc",
    17: "masked_number",
}

TEXT_FIELD_COUNT = 19

def parse_qr_fields(decompressed: bytes) -> Dict[str, Any]:
    parts = decompressed.split(b"\xff")
    data: Dict[str, Any] = {
        "full_name": "",
        "dob": "",
        "gender": "",
        "care_of": "",
        "district": "",
        "landmark": "",
        "house": "",
        "location": "",
        "pincode": "",
        "post_office": "",
        "state": "",
        "sub_district": "",
        "vtc": "",
        "masked_number": "",
        "photo_png_base64": None,
    }

    for idx, attr in FIELD_MAPPING.items():
        if idx < len(parts):
            try:
                data[attr] = parts[idx].decode("utf-8", errors="replace").strip()
            except Exception:
                data[attr] = ""

    # Reconstruct formatted English address
    address_parts = [
        data.get("care_of"),
        data.get("house"),
        data.get("landmark"),
        data.get("location"),
        data.get("vtc"),
        data.get("post_office"),
        data.get("sub_district"),
        data.get("district"),
        data.get("state"),
        data.get("pincode"),
    ]
    cleaned_address = ", ".join([p for p in address_parts if p and len(p.strip()) > 0])
    data["address_english"] = cleaned_address

    # Extract embedded JPEG2000 photo from TEXT_FIELD_COUNT
    if len(parts) > TEXT_FIELD_COUNT:
        try:
            photo_bytes = b"\xff" + b"\xff".join(parts[TEXT_FIELD_COUNT:])
            img = Image.open(io.BytesIO(photo_bytes)).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            data["photo_png_base64"] = base64.b64encode(buf.getvalue()).decode("ascii")
        except Exception as e:
            print(f"[Aadhaar-QR] Photo JP2 decode warning: {e}")

    return data

# ---------------------------------------------------------------------------
# 100% Deterministic Indic Local Language Extractor (PyMuPDF CMap Resolving)
# ---------------------------------------------------------------------------
SYSTEM_NOISE = [
    "unique identification", "authority of india", "government of india",
    "ભારત સરકાર", "વિશિષ્ટ ઓળખ સત્તામંડળ", "મેરા આધાર મારી ઓળખ", "મારો આધાર મારી ઓળખ",
    "भारत सरकार", "भारतीय विशिष्ट पहचान प्राधिकरण", "मेरा आधार मेरी पहचान",
    "மத்திய அரசு", "இந்திய தனித்துவ அடையாள ஆணையம்", "என் ஆதார் என் அடையாளம்",
    "భారత ప్రభుత్వం", "భారత విశిష్ట గుర్तिంపు ప్రాధికార సంస్థ",
    "ಪ್ರಭುತ್ವ", "భారతీయ విశిష్ట గుర్తింపు ప్రాధికార",
    "ഭാരത സർക്കാർ", "പൗരത്വ തിരിച്ചറിയൽ",
    "প্ৰশাসন", "পশ্চিমবঙ্গ", "পশ্চিম বঙ্গ",
    "enrolment", "enrollment", "નામાંકન", "ક્રમ", "સંખ્યા", "help@", "1947", "uidai",
    "તારીખ", "dob", "year", "birth", "male", "female", "પુરુષ", "સ્ત્રી", "transgender",
    "વિશિષ્ટ ઓળખ"
]

def is_noise_block(text: str) -> bool:
    txt_lower = text.lower()
    return any(noise in txt_lower for noise in SYSTEM_NOISE)

def extract_indic_local_fields(doc: fitz.Document) -> Dict[str, str]:
    """
    Extracts regional name & address with 100% matra & conjunct fidelity
    using PyMuPDF's CMap-resolved text layer.
    """
    if len(doc) == 0:
        return {"local_full_name": "", "local_address": "", "local_script": ""}

    text = doc[0].get_text("text")
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    blocks = []
    current_block = []
    for line in lines:
        if has_local_script(line):
            current_block.append(line)
        else:
            if current_block:
                blocks.append(current_block)
                current_block = []
    if current_block:
        blocks.append(current_block)

    # Filter out system titles & government headers
    valid_blocks = []
    for b in blocks:
        block_text = " ".join(b)
        if not is_noise_block(block_text) and len(block_text) >= 2:
            valid_blocks.append(b)

    result = {"local_full_name": "", "local_address": "", "local_script": ""}

    if valid_blocks:
        name_block = valid_blocks[0]
        result["local_full_name"] = " ".join(name_block).strip()
        result["local_script"] = detect_script(result["local_full_name"])

        # Longest multi-line block candidate or block containing address keywords is the regional address
        address_candidates = [b for b in valid_blocks[1:] if len(b) >= 2 or any(kw in " ".join(b) for kw in ["સરનામું", "પતા", "पत्ता", "મુગવરી", "చిరునామా", "വിളಾಸ", "Address"])]
        if address_candidates:
            best = max(address_candidates, key=lambda b: len(" ".join(b)))
            result["local_address"] = " ".join(best).strip()
        elif len(valid_blocks) > 1:
            result["local_address"] = " ".join(valid_blocks[1]).strip()

    return result

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.post("/extract-aadhaar")
@app.post("/process-pdf")
async def extract_aadhaar_endpoint(
    pdf_file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    target_lang: Optional[str] = Form("gujarati"),
):
    try:
        pdf_bytes = await pdf_file.read()
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid PDF file format: {str(e)}")

        if doc.is_encrypted or doc.needs_pass:
            if not password:
                raise HTTPException(status_code=400, detail="PASSWORD_REQUIRED")
            if not doc.authenticate(password):
                raise HTTPException(status_code=400, detail="INVALID_PASSWORD")

        print(f"[Deterministic-Extractor] Processing PDF with {len(doc)} pages...")

        # 1. Deterministic QR Extraction
        qr_data = {}
        qr_success = False
        candidates = extract_candidate_qr_images(doc)
        print(f"[Deterministic-Extractor] Found {len(candidates)} QR candidate images.")

        for pil_img in candidates:
            raw_bytes = decode_qr_to_bytes(pil_img)
            if raw_bytes:
                decompressed = decompress_payload(raw_bytes)
                parsed = parse_qr_fields(decompressed)
                if parsed.get("full_name") and len(parsed["full_name"]) > 1:
                    qr_data = parsed
                    qr_success = True
                    print(f"[Deterministic-Extractor] QR Decoded: Name='{qr_data.get('full_name')}', DOB='{qr_data.get('dob')}'")
                    break

        # 2. Deterministic Indic Script Extraction from PDF CMap Layer
        local_fields = extract_indic_local_fields(doc)
        print(f"[Deterministic-Extractor] Local Fields: Name='{local_fields.get('local_full_name')}', Script='{local_fields.get('local_script')}'")

        # --- CORRUPTION CHECK ---
        # Detect invalid control characters (Unicode 0x80-0x9F) or single Latin letters wedged between Indic characters
        is_corrupted = False
        indic_range = r'[\u0900-\u0D7F]'
        weird_ranges = r'[\u10A0-\u10FF\uAA80-\uAADF\u10B0-\u10FF]' # Georgian, Tai Viet, etc.
        
        all_indic_combining = (
            r'[\u0900-\u0903\u093C-\u094D\u0945-\u0948\u094E-\u0954'
            r'\u0980-\u0983\u09BC\u09BE-\u09CD\u09D7'
            r'\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A51\u0A70-\u0A71\u0A75'
            r'\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0AE2-\u0AE3'
            r'\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B56-\u0B57\u0B62-\u0B63'
            r'\u0B82\u0BBE-\u0BCD\u0BD7'
            r'\u0C00-\u0C03\u0C3E-\u0C4D\u0C55-\u0C56\u0C62-\u0C63'
            r'\u0C80-\u0C83\u0CBC\u0CBE-\u0CCD\u0CD5-\u0CD6\u0CE2-\u0CE3'
            r'\u0D00-\u0D03\u0D3B-\u0D3C\u0D3E-\u0D4D\u0D57\u0D62-\u0D63]'
        )
        
        name_val = local_fields.get("local_full_name", "")
        addr_val = local_fields.get("local_address", "")
        
        for val in [name_val, addr_val]:
            if val:
                if re.search(r'[\x80-\x9F]', val):
                    is_corrupted = True
                if re.search(f'{indic_range}[a-zA-Z]{indic_range}', val):
                    is_corrupted = True
                if re.search(weird_ranges, val):
                    is_corrupted = True
                if re.search(r'\s' + all_indic_combining, val):
                    is_corrupted = True
                    
        if is_corrupted:
            print("[Deterministic-Extractor] Corruption detected in local text layer. Clearing fields to trigger EasyOCR fallback.")
            local_fields = {"local_full_name": "", "local_address": "", "local_script": target_lang}

        # 3. Fallback OCR for scanned/photocopy PDFs if vector text layer was empty or corrupted
        if not local_fields.get("local_full_name") and len(doc) > 0:
            print("[Deterministic-Extractor] Vector text layer empty or corrupted, running fast EasyOCR fallback...")
            try:
                import easyocr
                page = doc[0]
                pix = page.get_pixmap(dpi=150)
                page_img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                w, h = page_img.size
                if h > w * 1.2:
                    page_img = page_img.crop((0, int(h * 0.65), w, h))
                
                lang_code = (target_lang or 'gujarati').lower().strip()
                lang_map = {
                    'gujarati': ['en'],
                    'hindi': ['hi', 'en'],
                    'marathi': ['mr', 'en'],
                    'tamil': ['ta', 'en'],
                    'telugu': ['te', 'en'],
                    'kannada': ['kn', 'en'],
                    'malayalam': ['ml', 'en'],
                    'bengali': ['bn', 'en'],
                    'punjabi': ['pa', 'en'],
                    'odia': ['or', 'en']
                }
                codes = lang_map.get(lang_code, ['en'])
                reader = easyocr.Reader(codes, gpu=False)
                ocr_results = reader.readtext(np.array(page_img))
                for res in ocr_results:
                    txt = res[1].strip()
                    if has_local_script(txt) and 2 <= len(txt.split()) <= 4 and not local_fields["local_full_name"]:
                        local_fields["local_full_name"] = txt
                        local_fields["local_script"] = detect_script(txt)
                        break
            except Exception as ocr_err:
                print(f"[Deterministic-Extractor] Fallback OCR notice: {ocr_err}")

        # Try to extract full unmasked Aadhaar number from the text layer first
        full_aadhaar = ""
        try:
            text = doc[0].get_text("text")
            # Look for 12 digits separated by space or hyphen (unmasked)
            match_unmasked = re.search(r'\b\d{4}[\s-]\d{4}[\s-]\d{4}\b', text)
            if match_unmasked:
                full_aadhaar = match_unmasked.group(0).strip().replace('-', ' ')
            else:
                # Look for 12 consecutive digits
                match_digits = re.search(r'\b\d{12}\b', text)
                if match_digits:
                    val = match_digits.group(0)
                    full_aadhaar = f"{val[0:4]} {val[4:8]} {val[8:12]}"
        except Exception:
            pass

        aadhaar_num = full_aadhaar if full_aadhaar else qr_data.get("masked_number", "")
        # Format masked number properly as XXXX XXXX 1234 if it's not spaced
        if aadhaar_num:
            val = aadhaar_num.replace(" ", "").replace("-", "")
            if len(val) == 12:
                if val.isdigit():
                    aadhaar_num = f"{val[0:4]} {val[4:8]} {val[8:12]}"
                else:
                    masked_part = "XXXX XXXX"
                    last_4 = val[-4:]
                    aadhaar_num = f"{masked_part} {last_4}"

        doc.close()

        name_val = local_fields.get("local_full_name", "")
        addr_val = local_fields.get("local_address", "")

        # Build combined response
        response = {
            "success": True,
            "source": "qr_deterministic" if qr_success else "text_layer",
            "nameEnglish": qr_data.get("full_name", ""),
            "nameLocalScript": name_val,
            "dob": qr_data.get("dob", ""),
            "gender": qr_data.get("gender", ""),
            "aadhaarNumber": aadhaar_num,
            "addressEnglish": qr_data.get("address_english", ""),
            "addressLocalScript": addr_val,
            "careOf": qr_data.get("care_of", ""),
            "pincode": qr_data.get("pincode", ""),
            "state": qr_data.get("state", ""),
            "district": qr_data.get("district", ""),
            "localScript": local_fields.get("local_script", target_lang),
            "photoPngBase64": qr_data.get("photo_png_base64"),
            # Backwards compatibility fields
            "localName": name_val,
            "localAddress": addr_val,
        }

        return response

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[Deterministic-Extractor] Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "PyMuPDF-ZXing-Indic-Deterministic-v2",
        "supported_scripts": [s[0] for s in SCRIPT_RANGES],
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, access_log=False)
