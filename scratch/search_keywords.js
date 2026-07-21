const fs = require('fs');
const path = require('path');
const { decryptPDF } = require('@pdfsmaller/pdf-decrypt');
const { PDFParse } = require('pdf-parse');

async function checkFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  let isEncrypted = false;
  try {
    const { PDFDocument } = require('pdf-lib');
    await PDFDocument.load(fileBuffer, { ignoreEncryption: false });
  } catch (e) {
    if (e.message?.includes('encrypted') || e.message?.includes('decrypt') || e.name === 'EncryptedPDFError') {
      isEncrypted = true;
    }
  }

  let decryptedBuffer = fileBuffer;
  let correctPwd = '';

  if (isEncrypted) {
    // Try to decrypt with common password patterns or recent passwords
    const prefixes = ['LILE', 'LALI', 'OBHU', 'POON', 'SONA', 'KEVI', 'AMOL', 'RAJE'];
    for (const prefix of prefixes) {
      for (let year = 1940; year <= 2026; year++) {
        const pwd = `${prefix}${year}`;
        try {
          decryptedBuffer = await decryptPDF(fileBuffer, pwd);
          correctPwd = pwd;
          break;
        } catch (err) {}
      }
      if (decryptedBuffer !== fileBuffer) break;
    }
  }

  if (isEncrypted && decryptedBuffer === fileBuffer) {
    // Skip if encrypted and couldn't decrypt
    return;
  }

  try {
    const parser = new PDFParse({ data: decryptedBuffer });
    const data = await parser.getText();
    const text = data.text || '';
    const textUpper = text.toUpperCase();
    
    const isAadhaar = (textUpper.includes('GOVERNMENT OF INDIA') && textUpper.includes('UNIQUE IDENTIFICATION')) ||
                      textUpper.includes('AUTHORITY OF INDIA') ||
                      textUpper.includes('MERA AADHAAR') ||
                      textUpper.includes('MY AADHAAR') ||
                      textUpper.includes('AADHAAR NO') ||
                      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(text);

    if (isAadhaar) {
      console.log(`\n==================================================`);
      console.log(`MATCHED AADHAAR PDF: ${filePath}`);
      console.log(`Password: ${correctPwd || 'None'}`);
      console.log(`Text length: ${text.length}`);
      console.log(`Text sample:\n${text.substring(0, 400)}`);
      console.log(`==================================================`);
    }
    await parser.destroy();
  } catch (e) {
    // ignore
  }
}

async function scan(dir) {
  if (!fs.existsSync(dir)) return;
  console.log(`Scanning ${dir}...`);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const fullPath = path.join(dir, file);
      try {
        await checkFile(fullPath);
      } catch (err) {}
    }
  }
}

async function main() {
  await scan('C:/Users/NANO/Desktop/AVINASH');
  await scan('C:/Users/NANO/Downloads');
  await scan('C:/Users/NANO/Desktop');
}

main().catch(console.error);
