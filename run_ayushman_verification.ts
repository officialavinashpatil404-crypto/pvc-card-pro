import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('=== RUNNING OFFLINE AYUSHMAN CARD GENERATION VERIFICATION ===');
  
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  
  // 1. Simulate Extraction Endpoint
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/pdf' });
  formData.append('file', blob, 'orginal ayushman card pdf.pdf');
  
  console.log('Sending extraction POST request to http://localhost:3000/api/extract...');
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
  console.log('Extracted details:');
  console.log('  Name:', extractedData.name);
  console.log('  DOB:', extractedData.dob);
  console.log('  Gender:', extractedData.gender);
  console.log('  PMJAY ID:', extractedData.documentNumber);
  console.log('  ABHA Number (vid):', extractedData.vid);
  console.log('  State:', extractedData.state);
  console.log('  District:', extractedData.district);
  console.log('  Village:', extractedData.village);
  console.log('  Subdivision:', extractedData.subdivision);
  console.log('  Mobile:', extractedData.mobile);
  console.log('  Ration ID:', extractedData.rationId);
  console.log('  photoBase64 length:', extractedData.photoBase64 ? extractedData.photoBase64.length : 'null');
  console.log('  photoError:', extractedData.photoError);
  console.log('  qrBase64 length:', extractedData.qrBase64 ? extractedData.qrBase64.length : 'null');
  console.log('  qrError:', extractedData.qrError);
  console.log('  frontCardBase64 length:', extractedData.frontCardBase64 ? extractedData.frontCardBase64.length : 'null');
  console.log('  backCardBase64 length:', extractedData.backCardBase64 ? extractedData.backCardBase64.length : 'null');

  // Verify that required assets exist
  if (!extractedData.frontCardBase64 || !extractedData.backCardBase64) {
    console.error('Error: Dynamic background templates were not extracted!');
    return;
  }
  if (!extractedData.photoBase64) {
    console.error('Error: Photo was not extracted!');
    return;
  }
  if (!extractedData.qrBase64) {
    console.error('Error: QR code was not cropped/validated!');
    return;
  }

  // 2. Simulate Card Generation Endpoint
  console.log('Sending card generation POST request to http://localhost:3000/api/generate-card...');
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

  // Save output files
  const frontBuffer = Buffer.from(generateJson.frontPng.split(',')[1], 'base64');
  const backBuffer = Buffer.from(generateJson.backPng.split(',')[1], 'base64');
  
  fs.writeFileSync('C:/Users/NANO/Downloads/ayushman_front_crop_dynamic.png', frontBuffer);
  fs.writeFileSync('C:/Users/NANO/Downloads/ayushman_back_crop_dynamic.png', backBuffer);
  
  if (generateJson.pdfUrl) {
    const pdfBuffer = Buffer.from(generateJson.pdfUrl.split(',')[1], 'base64');
    fs.writeFileSync('C:/Users/NANO/Downloads/ayushman_crop_dynamic.pdf', pdfBuffer);
  }
  
  console.log('=== AYUSHMAN CARD VERIFICATION COMPLETED SUCCESSFULLY ===');
  console.log('Artifacts successfully written to Downloads directory:');
  console.log('  1. ayushman_front_crop_dynamic.png');
  console.log('  2. ayushman_back_crop_dynamic.png');
  console.log('  3. ayushman_crop_dynamic.pdf');
}

main().catch(console.error);
