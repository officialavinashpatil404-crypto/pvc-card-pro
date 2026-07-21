const fs = require('fs');
const path = require('path');

async function isPdfEncrypted(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  try {
    const { PDFDocument } = require('pdf-lib');
    await PDFDocument.load(fileBuffer, { ignoreEncryption: false });
    return false;
  } catch (e) {
    if (e.message?.includes('encrypted') || e.message?.includes('decrypt') || e.name === 'EncryptedPDFError') {
      return true;
    }
  }
  return false;
}

async function scan(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const fullPath = path.join(dir, file);
      try {
        const encrypted = await isPdfEncrypted(fullPath);
        if (encrypted) {
          const stat = fs.statSync(fullPath);
          console.log(`ENCRYPTED: ${fullPath} | Size: ${(stat.size/1024).toFixed(1)} KB | Modified: ${stat.mtime.toLocaleString()}`);
        }
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
