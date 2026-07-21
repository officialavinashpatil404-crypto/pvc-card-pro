import * as fs from 'fs';
import * as path from 'path';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';

const pdfs = [
  { file: 'CHAU1974.pdf', pwd: 'CHAU1974' },
  { file: 'CHOU1973.pdf', pwd: 'CHOU1973' },
  { file: 'KEVI2019.pdf', pwd: 'KEVI2019' },
  { file: 'OBHU1975.pdf', pwd: 'OBHU1975' },
  { file: 'POON1997.pdf', pwd: 'POON1997' },
  { file: 'SONA1972.pdf', pwd: 'SONA1972' },
  { file: 'SONA1974.pdf', pwd: 'SONA1974' }
];

async function main() {
  for (const item of pdfs) {
    const filePath = path.join('C:/Users/NANO/Downloads', item.file);
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${item.file}`);
      continue;
    }
    try {
      const buffer = fs.readFileSync(filePath);
      const decrypted = await decryptPDF(buffer, item.pwd);
      const parser = new PDFParse({ data: Buffer.from(decrypted) });
      const data = await parser.getText();
      await parser.destroy();
      const text = data.text || '';
      console.log(`\n========================================`);
      console.log(`FILE: ${item.file}`);
      console.log(`Length: ${text.length}`);
      if (text.toLowerCase().includes('surat') || text.includes('સુરત')) {
        console.log(`Found "Surat" in text!`);
        console.log(`TEXT PREVIEW:`);
        console.log(text.substring(0, 500));
      } else {
        console.log(`Did not find "Surat" in text.`);
      }
    } catch (err: any) {
      console.log(`Failed for ${item.file}: ${err.message}`);
    }
  }
}

main();
