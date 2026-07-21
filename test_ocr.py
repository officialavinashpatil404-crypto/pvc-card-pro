import urllib.request
import urllib.parse
import uuid

pdf_path = 'C:/Users/NANO/Downloads/EAadhaar_0000002719656920260615174427_27062026114455.pdf'

def test():
    print("Sending OCR request via urllib...")
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    boundary = uuid.uuid4().hex
    
    # Construct multipart form body
    body = []
    
    # Add pdf_file
    body.append(f'--{boundary}'.encode('utf-8'))
    body.append('Content-Disposition: form-data; name="pdf_file"; filename="document.pdf"'.encode('utf-8'))
    body.append('Content-Type: application/pdf'.encode('utf-8'))
    body.append(b'')
    body.append(pdf_bytes)
    
    # Add target_lang
    body.append(f'--{boundary}'.encode('utf-8'))
    body.append('Content-Disposition: form-data; name="target_lang"'.encode('utf-8'))
    body.append(b'')
    body.append('hindi'.encode('utf-8'))
    
    # Add password
    body.append(f'--{boundary}'.encode('utf-8'))
    body.append('Content-Disposition: form-data; name="password"'.encode('utf-8'))
    body.append(b'')
    body.append('ANIL1977'.encode('utf-8'))
    
    body.append(f'--{boundary}--'.encode('utf-8'))
    body.append(b'')
    
    body_data = b'\r\n'.join(body)
    
    req = urllib.request.Request(
        'http://127.0.0.1:8000/process-pdf',
        data=body_data,
        headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'Content-Length': str(len(body_data))
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            print("Status Code:", response.status)
            print("Response:", response.read().decode('utf-8'))
    except Exception as e:
        print("Failed:", str(e))

if __name__ == '__main__':
    test()
