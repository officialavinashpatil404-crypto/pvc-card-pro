const fs = require('fs');
const path = require('path');

async function testAll() {
  const candidates = [
    'Nishad Ganeshbhai Dindyalbhai.pdf',
    'MANOJ.pdf',
    '0104104000241144_1781627957951.pdf'
  ];

  for (const filename of candidates) {
    const pdfPath = path.join('C:/Users/NANO/Downloads', filename);
    if (!fs.existsSync(pdfPath)) {
      console.log(`Candidate ${filename} not found.`);
      continue;
    }

    console.log(`\n======================================`);
    console.log(`TESTING: ${filename}`);
    console.log(`======================================`);

    const pdfBuffer = fs.readFileSync(pdfPath);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, filename);

    const start = Date.now();
    try {
      const res = await fetch('http://localhost:3000/api/extract', {
        method: 'POST',
        body: formData
      });
      
      const json = await res.json();
      console.log(`API response for ${filename} received in ${Date.now() - start}ms:`, JSON.stringify(json, null, 2).substring(0, 1000));
    } catch (err) {
      console.error(`API request for ${filename} failed in ${Date.now() - start}ms:`, err);
    }
  }
}

testAll();
