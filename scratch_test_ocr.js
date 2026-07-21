const fs = require('fs');
const path = require('path');

async function testOCR() {
  const pdfPath = 'C:/Users/NANO/Desktop/AVINASH/doc02967620260523210029.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.log(`Test PDF not found at ${pdfPath}`);
    return;
  }

  console.log(`Sending test PDF to local OCR: ${pdfPath}`);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('pdf_file', blob, 'document.pdf');
  formData.append('target_lang', 'gujarati');

  const start = Date.now();
  try {
    const res = await fetch('http://127.0.0.1:8000/process-pdf', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server returned status ${res.status}: ${errText}`);
    }

    const json = await res.json();
    console.log(`OCR Success in ${Date.now() - start}ms:`, JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('OCR failed:', err.message);
  }
}

testOCR();
