const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const SEARCH_PATTERNS = ['45-1513-6605-3831', '45151366053831@abdm', 'Avinash Naval Patil'];

async function scanPdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    if (dataBuffer.subarray(0, 4).toString() !== '%PDF') return false;

    const parsedData = await pdf(dataBuffer);
    const text = parsedData.text || '';
    
    for (const pat of SEARCH_PATTERNS) {
      if (text.includes(pat)) {
        console.log(`[MATCH FOUND] File: ${filePath} matched pattern: "${pat}"`);
        return true;
      }
    }
  } catch (err) {
    // Ignore errors
  }
  return false;
}

async function main() {
  const dirs = ['C:/Users/NANO/Downloads', 'C:/Users/NANO/Desktop', 'C:/Users/NANO/Desktop/AVINASH', 'C:/Users/NANO/Documents'];
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
  console.log('Search completed.');
}

main().catch(console.error);
