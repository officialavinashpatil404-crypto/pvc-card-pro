import os
import io
import sys
import fitz  # PyMuPDF
import numpy as np
from PIL import Image
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import easyocr
import ssl



# Bypass SSL certificate verification for EasyOCR model downloads
ssl._create_default_https_context = ssl._create_unverified_context

app = FastAPI(title="PVC Card Local OCR & Transliteration Service")

# Enable CORS for Next.js app communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global cache for EasyOCR readers to save RAM and initialization time
readers = {}

def get_ocr_reader(lang_code: str):
    """
    Returns or initializes the cached EasyOCR reader for the target language.
    """
    lang_code = (lang_code or 'gujarati').lower().strip()
    if lang_code not in readers:
        # Map target language names to EasyOCR codes (paired with English)
        lang_map = {
            'gujarati': ['en'],  # EasyOCR does not support 'gu' code, fallback to English to avoid crashes
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
        print(f"[OCR-Service] Initializing EasyOCR Reader for: {lang_code} (codes={codes})...")
        readers[lang_code] = easyocr.Reader(codes, gpu=False)  # Run on CPU by default for CPU servers
    return readers[lang_code]

def reconstruct_lines(ocr_results):
    """
    Groups OCR bounding boxes into lines by grouping elements that have 
    similar vertical center coordinates, and sorts elements from left to right.
    """
    if not ocr_results:
        return []
        
    # Each result is: [ [[x0,y0], [x1,y1], [x2,y2], [x3,y3]], text, confidence ]
    boxes = []
    for bbox, text, conf in ocr_results:
        # Calculate bounding box bounds and center y
        ys = [pt[1] for pt in bbox]
        xs = [pt[0] for pt in bbox]
        min_y, max_y = min(ys), max(ys)
        min_x, max_x = min(xs), max(xs)
        center_y = (min_y + max_y) / 2
        boxes.append({
            'min_x': min_x,
            'max_x': max_x,
            'min_y': min_y,
            'max_y': max_y,
            'center_y': center_y,
            'height': max_y - min_y,
            'text': text.strip(),
            'conf': conf
        })

    # Sort boxes vertically
    boxes.sort(key=lambda b: b['center_y'])

    lines = []
    if not boxes:
        return lines

    current_line = [boxes[0]]
    for box in boxes[1:]:
        # If the vertical distance between centers is less than half the height of the current box,
        # we consider them to be on the same horizontal line.
        vertical_threshold = max(box['height'], current_line[-1]['height']) * 0.45
        if abs(box['center_y'] - current_line[-1]['center_y']) < vertical_threshold:
            current_line.append(box)
        else:
            # Sort the completed line horizontally (left to right)
            current_line.sort(key=lambda b: b['min_x'])
            lines.append(current_line)
            current_line = [box]

    # Add the last line
    if current_line:
        current_line.sort(key=lambda b: b['min_x'])
        lines.append(current_line)

    return lines

@app.post("/process-pdf")
async def process_pdf(
    pdf_file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    target_lang: str = Form("gujarati")
):
    try:
        print(f"[OCR-Service] Received PDF processing request for language: {target_lang}")
        
        # 1. Read PDF bytes
        pdf_bytes = await pdf_file.read()
        
        # 2. Open PDF with PyMuPDF
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid PDF file format: {str(e)}")

        # 3. Decrypt PDF if password protected
        if doc.is_encrypted:
            if not password:
                raise HTTPException(status_code=400, detail="PASSWORD_REQUIRED")
            auth_success = doc.authenticate(password)
            if not auth_success:
                raise HTTPException(status_code=400, detail="INVALID_PASSWORD")

        # Get OCR reader for target language
        reader = get_ocr_reader(target_lang)

        # 4. Render pages to images and run OCR
        pages_left_lines = []
        pages_right_lines = []
        
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            
            # Render page at 150 DPI for balanced speed and OCR accuracy
            zoom = 150 / 72
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert PyMuPDF pixmap to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Optimization: If A4/vertical page, crop the bottom 32% (Aadhaar cards area)
            # to make OCR run 3x-4x faster and avoid CPU timeout.
            w, h = img.size
            if h > w * 1.2:
                img = img.crop((0, int(h * 0.68), w, h))
                
            img_arr = np.array(img)
            
            # Run EasyOCR on page image
            ocr_results = reader.readtext(img_arr)
            
            # Horizontal division for A4 sheet side-by-side Aadhaar templates
            # A4 width at 150 DPI is ~1240px. If width > 750, we split left (front) and right (back)
            if img.width > 750:
                mid_x = img.width / 2
                left_results = []
                right_results = []
                for res in ocr_results:
                    bbox = res[0]
                    xs = [pt[0] for pt in bbox]
                    center_x = sum(xs) / len(xs)
                    if center_x < mid_x:
                        left_results.append(res)
                    else:
                        right_results.append(res)
                
                left_lines = reconstruct_lines(left_results)
                right_lines = reconstruct_lines(right_results)
                pages_left_lines.append(left_lines)
                pages_right_lines.append(right_lines)
            else:
                # Pre-cropped single page or individual card
                lines = reconstruct_lines(ocr_results)
                pages_left_lines.append(lines)
                pages_right_lines.append(lines)

        # 5. Extract name and address using horizontal layouts & Indian script heuristics
        local_name = ""
        local_address = ""

        # Flat lists of text lines for left (front) and right (back) card areas
        left_lines_str = []
        for page_lines in pages_left_lines:
            for line in page_lines:
                line_str = " ".join([box['text'] for box in line])
                left_lines_str.append(line_str)

        right_lines_str = []
        for page_lines in pages_right_lines:
            for line in page_lines:
                line_str = " ".join([box['text'] for box in line])
                right_lines_str.append(line_str)

        # Logs disabled to prevent Windows terminal encoding crashes and preserve privacy
        pass

        # Heuristic 1: Find Regional Address block from the right (back) lines
        address_keywords = [
            'સરનામું', 'સરનામુ', 'સરનામ', 'સરનામી', 'પતા', 'पता', 'पत्ता', 'मुखवरी', 'முகவரி', 
            'చిరునామా', 'ವಿಳಾಸ', 'മേൽവിലാസം', 'ঠিকানা', 'ଠିକଣา', 'ਪતા'
        ]

        address_lines = []
        in_address_block = False
        
        for line in right_lines_str:
            has_addr_keyword = any(kw in line for kw in address_keywords)
            if has_addr_keyword:
                in_address_block = True
                cleaned_line = line
                for kw in address_keywords:
                    cleaned_line = cleaned_line.replace(kw, '').replace(':', '').replace('-', '').strip()
                if cleaned_line:
                    address_lines.append(cleaned_line)
                continue
                
            if in_address_block:
                address_lines.append(line)
                import re
                if re.search(r'\b\d{6}\b', line):
                    # Found PIN code, end address block
                    in_address_block = False

        if address_lines:
            local_address = ", ".join(address_lines)

        # Heuristic 2: Find Regional Name from the left (front) lines
        # Exclude common noise, government slogans, and address keywords
        exclude_keywords = [
            'government', 'india', 'unique', 'enrolment', 'enrollment', 'help', 'address', 'signature',
            'authority', 'dob', 'year of birth', 'male', 'female', 'transgender', 'yob', 'जन्म',
            'information', 'सूचना', 'पहचान', 'आधार', 'मेरा', 'मेरी',
            'ताथे', 'uidai', 'govt', 'प्रमाण', 'नागरिकता',
            'भारत सरकार', 'भारत', 'सरकार', 'भारतीय', 'of india',
            'તારીખ', 'જન્મ', 'પુરુષ', 'સ્ત્રી', 'આધાર', 'ભારત', 'ઓળખ',
            'w/o', 'c/o', 's/o', 'd/o', 'road', 'street', 'society', 'flat', 'nagar', 'sector', 
            'village', 'taluka', 'district', 'state', 'floor', 'building', 'plot', 'house',
            'ડબલ્યુ/ઓ', 'સી/ઓ', 'એસ/ઓ', 'ડી/ઓ', 'પાસે', 'સામે', 'નજીક', 'રોડ', 'શેરી', 'સોસાયટી', 
            'ફ્લેટ', 'મકાન', 'ઘર', 'નગર', 'સેક્ટર', 'વિભાગ', 'ગામ', 'તાલુકો', 'જિલ્લો', 'રાજ્ય', 
            'સરનામું', 'સરનામુ', 'સર્કલ', 'ચોક', 'માર્ગ'
        ]

        best_name = ''
        print(f"[OCR-Debug] Total left lines for name search: {len(left_lines_str)}")
        for i, line in enumerate(left_lines_str[:20]):  # Print first 20 lines
            print(f"[OCR-Debug] Line {i}: {line!r}")
        for line in left_lines_str:
            line_lower = line.lower()
            has_regional = any(ord(char) > 127 for char in line)
            is_noise = any(kw in line_lower for kw in exclude_keywords)
            has_digits = any(char.isdigit() for char in line)
            
            # Name lines are typically 2-4 words, no digits, no noise keywords
            words = line.split()
            word_count = len(words)
            # All words must be at least 2 characters (filter out OCR noise like ':')
            all_words_valid = all(len(w) >= 2 for w in words)
            if has_regional and not is_noise and not has_digits and all_words_valid and 2 <= word_count <= 4:
                # Prefer shorter lines (names are usually 2-3 words in regional script)
                if not best_name or word_count < len(best_name.split()):
                    best_name = line
                    if word_count == 2:  # Perfect short name, stop searching
                        break
        local_name = best_name


        print(f"[OCR-Service] Extraction complete: localName len={len(local_name)}, localAddress len={len(local_address)}")

        return {
            "success": True,
            "localName": local_name.strip(),
            "localAddress": local_address.strip()
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[OCR-Service] Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "cached_readers": list(readers.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, access_log=False)
