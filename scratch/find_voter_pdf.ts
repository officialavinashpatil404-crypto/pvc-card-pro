import * as fs from 'fs';
import * as path from 'path';
const pdf = require('pdf-parse');

const KEYWORDS = [
  'epic', 'election', 'elector', 'voter', 'identity card',
  'ચૂંટણી', 'મતદાર', 'મતદાતા', 'मतदाता', 'निर्वाचन'
];

async function scanPdf(filePath: string): Promise<boolean> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    if (dataBuffer.subarray(0, 4).toString() !== '%PDF') return false;

    // Use standard pdf-parse package API
    const parsedData = await pdf(dataBuffer);
    const text = (parsedData.text || '').toLowerCase();

    for (const kw of KEYWORDS) {
      if (text.includes(kw.toLowerCase())) {
        console.log(`[MATCH] Found keyword "${kw}" in PDF: ${filePath}`);
        console.log(`Preview text: "${text.substring(0, 300).replace(/\s+/g, ' ')}"`);
        return true;
      }
    }
  } catch (err: any) {
    // Ignore errors
  }
  return false;
}

async function main() {
  const dir = 'C:/Users/NANO/Downloads';
  console.log(`Scanning PDFs in ${dir} for Voter ID keyword matches...`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const fullPath = path.join(dir, file);
      await scanPdf(fullPath);
    }
  }
  console.log('Scan finished.');
}

main().catch(console.error);
