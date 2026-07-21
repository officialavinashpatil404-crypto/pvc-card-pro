import easyocr
import sys

def check():
    print("Attempting to load EasyOCR Reader for 'hi' (Devanagari)...")
    sys.stdout.flush()
    try:
        reader = easyocr.Reader(['hi'], gpu=False)
        print("Model loaded successfully!")
    except Exception as e:
        print("Failed to load model:", str(e))

if __name__ == '__main__':
    check()
