const fs = require('fs');
const path = require('path');
const { decryptPDF } = require('@pdfsmaller/pdf-decrypt');
const PDFParse = require('pdf-parse');

async function findInPdf(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  let decryptedBuffer = fileBuffer;
  let isEncrypted = false;
  
  try {
    const { PDFDocument } = require('pdf-lib');
    await PDFDocument.load(fileBuffer, { ignoreEncryption: false });
  } catch (e) {
    if (e.message?.includes('encrypted') || e.message?.includes('decrypt') || e.name === 'EncryptedPDFError') {
      isEncrypted = true;
    }
  }

  if (isEncrypted) {
    // Try decrypting with LILE prefix
    for (let year = 1940; year <= 2026; year++) {
      const pwd = `LILE${year}`;
      try {
        decryptedBuffer = await decryptPDF(fileBuffer, pwd);
        console.log(`[Success] Decrypted ${path.basename(filePath)} with password ${pwd}`);
        break;
      } catch (err) {}
    }
  }

  // If we couldn't decrypt, skip this file
  if (isEncrypted && decryptedBuffer === fileBuffer) {
    return null;
  }

  try {
    const data = await PDFParse(decryptedBuffer);
    const text = data.text || '';
    if (text.toLowerCase().includes('lilesh') || text.toLowerCase().includes('patil') || text.toLowerCase().includes('4473')) {
      console.log(`\n*** FOUND MATCHING PDF! ***`);
      console.log(`File: ${filePath}`);
      console.log(`Text Length: ${text.length}`);
      console.log(`Text Preview: ${text.substring(0, 800)}`);
      return text;
    }
  } catch (e) {
    // ignore parse errors
  }
  return null;
}

async function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  console.log(`Scanning files under ${dir}...`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const fullPath = path.join(dir, file);
      await findInPdf(fullPath);
    }
  }
}

async function main() {
  await scanDirectory('C:/Users/NANO/Desktop/AVINASH');
  await scanDirectory('C:/Users/NANO/Downloads');
  await scanDirectory('C:/Users/NANO/Desktop');
  console.log('Search complete.');
}

main().catch(console.error);
