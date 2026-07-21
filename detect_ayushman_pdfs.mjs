import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

async function getPdfText(pdfBytes) {
  const parser = new PDFParse({ data: pdfBytes });
  const data = await parser.getText();
  await parser.destroy();
  return data.text || '';
}

async function scanDir(dir) {
  const list = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          list.push({ path: fullPath, size: stat.size });
        } catch (e) {}
      }
    }
  } catch (e) {}
  return list;
}

async function main() {
  const dirs = ['C:/Users/NANO/Downloads', 'C:/Users/NANO/Desktop', 'C:/Users/NANO/Desktop/AVINASH'];
  let all = [];
  for (const dir of dirs) {
    all = all.concat(await scanDir(dir));
  }

  console.log(`Scanning ${all.length} PDFs...`);
  for (const item of all) {
    try {
      const buffer = fs.readFileSync(item.path);
      // Skip encrypted files for this scan
      let isEncrypted = false;
      if (buffer.readUInt32BE(0) !== 0x25504446) continue; // Not a PDF

      const text = await getPdfText(buffer);
      const textUpper = text.toUpperCase();
      
      const isAyushman = textUpper.includes('PRADHAN MANTRI JAN AROGYA') || 
                          textUpper.includes('PMJAY') || 
                          textUpper.includes('AYUSHMAN');
      if (isAyushman) {
        console.log(`\nFOUND AYUSHMAN PDF: ${item.path} (${(item.size/1024).toFixed(1)} KB)`);
        console.log('--- RAW TEXT ---');
        console.log(text.trim());
        console.log('----------------');
      }
    } catch (e) {
      // Ignore errors
    }
  }
}

main().catch(console.error);
