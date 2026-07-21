const fs = require('fs');
const path = require('path');
const { decryptPDF } = require('@pdfsmaller/pdf-decrypt');
const { PDFParse } = require('pdf-parse');

async function inspect(filePath) {
  console.log(`\n----------------------------------------------------`);
  console.log(`INSPECTING: ${filePath}`);
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

  console.log(`Is Encrypted: ${isEncrypted}`);
  if (!isEncrypted) {
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const data = await parser.getText();
      const text = data.text || '';
      console.log(`Text Length: ${text.length}`);
      console.log(`Text Preview: ${text.substring(0, 1000)}`);
      await parser.destroy();
    } catch (e) {
      console.log(`Error parsing unencrypted PDF:`, e.message);
    }
    return;
  }

  // Brute force passwords for common names and all years
  const prefixes = [
    'LILE', 'LILA', 'LALI', 'SONA', 'OBHU', 'POON', 'KEVI', 'AMOL', 
    'lile', 'lila', 'lali', 'sona', 'obhu', 'poon', 'kevi', 'amol',
    'PATI', 'pati', 'RAJE', 'raje', 'KUMA', 'kuma'
  ];

  let decryptedBuffer = null;
  let correctPwd = '';

  for (const prefix of prefixes) {
    for (let year = 1940; year <= 2026; year++) {
      const pwd = `${prefix}${year}`;
      try {
        decryptedBuffer = await decryptPDF(fileBuffer, pwd);
        correctPwd = pwd;
        break;
      } catch (err) {}
    }
    if (decryptedBuffer) break;
  }

  if (decryptedBuffer) {
    console.log(`[Success] Decrypted with password: ${correctPwd}`);
    try {
      const parser = new PDFParse({ data: decryptedBuffer });
      const data = await parser.getText();
      const text = data.text || '';
      console.log(`Text Length: ${text.length}`);
      console.log(`Text Preview: ${text.substring(0, 1000)}`);
      await parser.destroy();
    } catch (e) {
      console.log(`Error parsing decrypted PDF:`, e.message);
    }
  } else {
    console.log(`[Failed] Could not decrypt PDF using any common password prefixes.`);
  }
}

async function main() {
  const targets = [
    'C:/Users/NANO/Downloads/AADHAR.pdf',
    'C:/Users/NANO/Desktop/AVINASH/doc03132220260624224114.pdf',
    'C:/Users/NANO/Desktop/AVINASH/doc03132320260624224130.pdf'
  ];

  for (const t of targets) {
    if (fs.existsSync(t)) {
      await inspect(t);
    } else {
      console.log(`File not found: ${t}`);
    }
  }
}

main().catch(console.error);
