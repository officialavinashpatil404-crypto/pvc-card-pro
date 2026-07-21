const fs = require('fs');
const path = require('path');

async function run() {
  const filename = 'doc03132220260624224114.pdf';
  const pdfPath = path.join('C:/Users/NANO/Desktop/AVINASH', filename);
  
  if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    return;
  }

  console.log(`Uploading ${filename} to extraction API on http://localhost:3000/api/extract...`);
  const fileBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, filename);

  try {
    const res = await fetch('http://localhost:3000/api/extract', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    console.log('Status Code:', res.status);
    console.log('API Response data:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Request failed:', err);
  }
}

run().catch(console.error);
