const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function main() {
  const filePath = 'C:/Users/NANO/Desktop/AVINASH/doc03115220260622143112.pdf';
  if (!fs.existsSync(filePath)) {
    console.log('File not found');
    return;
  }
  const fileBuffer = fs.readFileSync(filePath);
  try {
    const doc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    console.log('Title:', doc.getTitle());
    console.log('Author:', doc.getAuthor());
    console.log('Subject:', doc.getSubject());
    console.log('Creator:', doc.getCreator());
    console.log('Producer:', doc.getProducer());
    console.log('Creation Date:', doc.getCreationDate());
    console.log('Modification Date:', doc.getModificationDate());
  } catch (e) {
    console.error('Error reading metadata:', e.message);
  }
}

main().catch(console.error);
