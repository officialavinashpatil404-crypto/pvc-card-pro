import * as fs from 'fs';

const amolPdfPath = 'C:/Users/NANO/Downloads/SONA1974.pdf';
const password = 'SONA1974';

async function verify() {
  console.log('Sending extract POST request...');
  const pdfBytes = fs.readFileSync(amolPdfPath);
  const extractForm = new FormData();
  const extractBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  extractForm.append('file', extractBlob, 'document.pdf');
  extractForm.append('password', password);

  const extractRes = await fetch('http://localhost:3000/api/extract', {
    method: 'POST',
    body: extractForm
  });

  const extractJson = await extractRes.json();
  console.log('=== EXTRACTION RESULT ===');
  console.log('status:', extractRes.status);
  console.log('error:', extractJson.error);
  if (extractJson.data) {
    console.log('name:', extractJson.data.name);
    console.log('localName:', extractJson.data.localName);
    console.log('address:', extractJson.data.address);
    console.log('localAddress:', extractJson.data.localAddress);
    console.log('textSource:', extractJson.data.textSource);
    console.log('languageSource:', extractJson.data.languageSource);
  } else {
    console.log('data property is missing in response!');
  }
  process.exit(0);
}

verify().catch(console.error);
