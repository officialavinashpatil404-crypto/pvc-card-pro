import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('=== RUNNING OFFLINE CARD GENERATION VERIFICATION ===');
  
  const pdfPath = 'C:/Users/NANO/Downloads/SONA1974.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  
  // 1. Simulate Extraction Endpoint
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('file', blob, 'SONA1974.pdf');
  formData.append('password', 'SONA1974');
  
  console.log('Sending extraction POST request...');
  const extractRes = await fetch('http://localhost:3000/api/extract', {
    method: 'POST',
    body: formData
  });
  
  console.log(`Extract Status: ${extractRes.status}`);
  const extractJson = await extractRes.json();
  if (!extractRes.ok || extractJson.error) {
    console.error('Extraction failed:', extractJson.error);
    return;
  }
  
  const extractedData = extractJson.data;
  console.log('Extracted name:', extractedData.name);
  console.log('Extracted localAddressLabel:', extractedData.localAddressLabel);
  console.log('Extracted dobLine:', extractedData.dobLine);
  console.log('Extracted genderLine:', extractedData.genderLine);
  console.log('Extracted decryptedPdfBase64 length:', extractedData.decryptedPdfBase64?.length);
  console.log('Extracted photoBase64 length:', extractedData.photoBase64 ? extractedData.photoBase64.length : 'null');
  console.log('Extracted photoError:', extractedData.photoError);
  console.log('Extracted qrBase64 length:', extractedData.qrBase64 ? extractedData.qrBase64.length : 'null');
  console.log('Extracted qrError:', extractedData.qrError);

  // 2. Simulate Card Generation Endpoint
  console.log('Sending card generation POST request...');
  const generateRes = await fetch('http://localhost:3000/api/generate-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...extractedData,
      exportType: 'pdf_a4'
    })
  });
  
  console.log(`Generation Status: ${generateRes.status}`);
  const generateJson = await generateRes.json();
  if (!generateRes.ok || generateJson.error) {
    console.error('Generation failed:', generateJson.error || generateJson.details);
    return;
  }
  
  console.log('Front PNG size:', generateJson.frontPng?.length);
  console.log('Back PNG size:', generateJson.backPng?.length);
  console.log('PDF size:', generateJson.pdfUrl?.length);

  // Save outputs to downloads
  const frontBuffer = Buffer.from(generateJson.frontPng.split(',')[1], 'base64');
  const backBuffer = Buffer.from(generateJson.backPng.split(',')[1], 'base64');
  
  fs.writeFileSync('C:/Users/NANO/Downloads/sona_front.png', frontBuffer);
  fs.writeFileSync('C:/Users/NANO/Downloads/sona_back.png', backBuffer);
  
  if (generateJson.pdfUrl) {
    const pdfBuffer = Buffer.from(generateJson.pdfUrl.split(',')[1], 'base64');
    fs.writeFileSync('C:/Users/NANO/Downloads/sona.pdf', pdfBuffer);
  }
  
  console.log('Dynamic crop verification artifacts successfully written to Downloads directory.');
}

main().catch(console.error);
