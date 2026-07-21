const fs = require('fs');
const { PDFParse } = require('pdf-parse');

async function main() {
  const filePath = 'C:/Users/NANO/Downloads/da6c3ba4-0aa9-4f23-a6d6-0362dfdc9b22.pdf';
  if (!fs.existsSync(filePath)) {
    console.log('File not found');
    return;
  }
  const fileBuffer = fs.readFileSync(filePath);
  try {
    const parser = new PDFParse({ data: fileBuffer });
    const data = await parser.getText();
    const text = data.text || '';
    console.log(`Text Length: ${text.length}`);
    console.log(`Text Content:\n${text}`);
    await parser.destroy();
  } catch (e) {
    console.error('Error parsing:', e.message);
  }
}

main().catch(console.error);
