import fitz
from PIL import Image
import io
import numpy as np
import easyocr
import sys
import time

pdf_path = 'C:/Users/NANO/Downloads/EAadhaar_0000002719656920260615174427_27062026114455.pdf'
password = 'ANIL1977'

def run():
    print("1. Opening PDF...")
    sys.stdout.flush()
    doc = fitz.open(pdf_path)
    
    if doc.is_encrypted:
        doc.authenticate(password)
        
    print("2. Rendering first page at 150 DPI (instead of 300)...")
    sys.stdout.flush()
    page = doc[0]
    
    t0 = time.time()
    pix = page.get_pixmap(dpi=150) # 150 DPI
    img_data = pix.tobytes("png")
    img = Image.open(io.BytesIO(img_data))
    
    w, h = img.size
    print(f"Rendered image size: {w}x{h} ({w*h} pixels)")
    
    left_card = img.crop((0, 0, w // 2, h))
    right_card = img.crop((w // 2, 0, w, h))
    
    left_np = np.array(left_card)
    right_np = np.array(right_card)
    
    print("3. Initializing EasyOCR Reader for hi + en...")
    sys.stdout.flush()
    reader = easyocr.Reader(['hi', 'en'], gpu=False)
    
    print("4. Running EasyOCR on left card (150 DPI)...")
    sys.stdout.flush()
    t_start = time.time()
    left_results = reader.readtext(left_np)
    t_left = time.time() - t_start
    print(f"Left Card OCR took {t_left:.2f} seconds. Results count: {len(left_results)}")
    
    with open('ocr_results_fast.txt', 'w', encoding='utf-8') as f:
        f.write("=== LEFT CARD ===\n")
        for res in left_results:
            f.write(f"{res[1]} (conf: {res[2]:.2f})\n")
            
        print("5. Running EasyOCR on right card (150 DPI)...")
        sys.stdout.flush()
        t_start = time.time()
        right_results = reader.readtext(right_np)
        t_right = time.time() - t_start
        print(f"Right Card OCR took {t_right:.2f} seconds. Results count: {len(right_results)}")
        
        f.write("\n=== RIGHT CARD ===\n")
        for res in right_results:
            f.write(f"{res[1]} (conf: {res[2]:.2f})\n")
            
    sys.stdout.flush()
    
    total_time = time.time() - t0
    print(f"Total pipeline took {total_time:.2f} seconds.")

if __name__ == '__main__':
    run()
