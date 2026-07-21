import fitz
from PIL import Image
import io
import numpy as np
import easyocr
import sys

pdf_path = 'C:/Users/NANO/Downloads/EAadhaar_0000002719656920260615174427_27062026114455.pdf'
password = 'ANIL1977'

def run():
    print("1. Opening PDF...")
    sys.stdout.flush()
    doc = fitz.open(pdf_path)
    
    if doc.is_encrypted:
        print("Decrypting PDF...")
        sys.stdout.flush()
        doc.authenticate(password)
        
    print("2. Rendering first page...")
    sys.stdout.flush()
    page = doc[0]
    pix = page.get_pixmap(dpi=300)
    img_data = pix.tobytes("png")
    img = Image.open(io.BytesIO(img_data))
    
    w, h = img.size
    left_card = img.crop((0, 0, w // 2, h))
    right_card = img.crop((w // 2, 0, w, h))
    
    left_np = np.array(left_card)
    right_np = np.array(right_card)
    
    print("3. Initializing EasyOCR Reader for hi + en...")
    sys.stdout.flush()
    reader = easyocr.Reader(['hi', 'en'], gpu=False)
    
    print("4. Running EasyOCR on left card...")
    sys.stdout.flush()
    left_results = reader.readtext(left_np)
    print(f"Left Card Results count: {len(left_results)}")
    for res in left_results[:5]:
        print("  -", res[1])
    sys.stdout.flush()
    
    print("5. Running EasyOCR on right card...")
    sys.stdout.flush()
    right_results = reader.readtext(right_np)
    print(f"Right Card Results count: {len(right_results)}")
    for res in right_results[:5]:
        print("  -", res[1])
    sys.stdout.flush()
    
    print("Inference completed successfully!")

if __name__ == '__main__':
    run()
