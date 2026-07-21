import * as fs from 'fs';
import * as path from 'path';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';

async function checkPdf(filePath: string) {
  const fileBuffer = fs.readFileSync(filePath);
  
  let isEncrypted = false;
  try {
    const { PDFDocument } = require('pdf-lib');
    await PDFDocument.load(fileBuffer, { ignoreEncryption: false });
  } catch (e: any) {
    if (e.message?.includes('encrypted') || e.message?.includes('decrypt') || e.name === 'EncryptedPDFError') {
      isEncrypted = true;
    }
  }

  let decryptedBuffer = fileBuffer;
  let correctPwd = '';

  if (isEncrypted) {
    // Brute force LILE/PATI passwords
    const prefixes = ['LILE', 'lile', 'PATI', 'pati', 'LILESH', 'lilesh'];
    for (const prefix of prefixes) {
      for (let year = 1940; year <= 2026; year++) {
        const pwd = `${prefix}${year}`;
        try {
          decryptedBuffer = Buffer.from(await decryptPDF(fileBuffer, pwd));
          correctPwd = pwd;
          break;
        } catch (err) {}
      }
      if (decryptedBuffer !== fileBuffer) break;
    }
  }

  if (isEncrypted && decryptedBuffer === fileBuffer) {
    // Failed to decrypt
    return;
  }

  try {
    const parser = new PDFParse({ data: decryptedBuffer });
    const data = await parser.getText();
    const text = data.text || '';
    if (text.toLowerCase().includes('lilesh') || text.toLowerCase().includes('patil') || text.toLowerCase().includes('4473')) {
      console.log(`\n==================================================`);
      console.log(`FOUND PDF: ${filePath}`);
      console.log(`Password: ${correctPwd || 'None (Unencrypted)'}`);
      console.log(`Text Length: ${text.length}`);
      console.log(`Raw Text:\n${text}`);
      console.log(`==================================================`);
    }
    await parser.destroy();
  } catch (e: any) {
    // Ignore error
  }
}

async function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  console.log(`Scanning directory: ${dir}`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const fullPath = path.join(dir, file);
      try {
        await checkPdf(fullPath);
      } catch (err: any) {
        // ignore errors
      }
    }
  }
}

async function main() {
  await scanDir('C:/Users/NANO/Desktop/AVINASH');
  await scanDir('C:/Users/NANO/Downloads');
  await scanDir('C:/Users/NANO/Desktop');
  console.log('Search complete.');
}

main().catch(console.error);
