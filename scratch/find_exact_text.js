const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function testFile(filePath) {
  console.log(`\n==================================================`);
  console.log(`PARSING: ${filePath}`);
  const fileBuffer = fs.readFileSync(filePath);
  try {
    const parser = new PDFParse({ data: fileBuffer });
    const data = await parser.getText();
    const text = data.text || '';
    console.log(`Success! Raw Text Length: ${text.length}`);
    console.log(`--- RAW TEXT ---`);
    console.log(text);
    console.log(`--- END RAW TEXT ---`);
    await parser.destroy();
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e.message);
  }
}

async function main() {
  const files = [
    'C:/Users/NANO/Downloads/AADHAR.pdf',
    'C:/Users/NANO/Desktop/AVINASH/doc03132220260624224114.pdf',
    'C:/Users/NANO/Desktop/AVINASH/doc03132320260624224130.pdf'
  ];
  for (const f of files) {
    if (fs.existsSync(f)) {
      await testFile(f);
    } else {
      console.log(`File not found: ${f}`);
    }
  }
}

main().catch(console.error);
