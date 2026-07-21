import fs from 'fs';
import path from 'path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/2021.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  console.log(`Loaded PDF: ${pdfPath} (${(buffer.length/1024).toFixed(1)} KB)`);

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  console.log(`Pages: ${pdf.numPages}`);
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items.map(item => item.str);
    console.log(`\n--- PAGE ${i} TEXT ITEMS ---`);
    console.log(JSON.stringify(items, null, 2));
    const text = items.join(' ');
    console.log(`\n--- PAGE ${i} MERGED TEXT ---`);
    console.log(text);
  }
}

main().catch(console.error);
