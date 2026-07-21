const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const KEYWORDS = ['ABHA Number', 'Ayushman Bharat Health Account', 'abdm', 'Avinash Naval Patil'];

async function scanPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    if (dataBuffer.subarray(0, 4).toString() !== '%PDF') return false;

    const parsedData = await pdf(dataBuffer);
    const text = (parsedData.text || '').toLowerCase();

    for (const kw of KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        console.log(`[MATCH] Found keyword "${kw}" in PDF: ${filePath}`);
        return true;
      }
    }
  } catch (err) {
    // Ignore errors
  }
  return false;
}

async function main() {
  const dirs = ['C:/Users/NANO/Downloads', 'C:/Users/NANO/Desktop', 'C:/Users/NANO/Desktop/AVINASH'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    console.log(`Scanning PDFs in ${dir}...`);
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        const fullPath = path.join(dir, file);
        await scanPdf(fullPath);
      }
    }
  }
  console.log('Scan finished.');
}

main().catch(console.error);
