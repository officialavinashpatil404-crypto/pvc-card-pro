import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();

  console.log('--- PAGE 1 TEXT ITEMS WITH COORDINATES ---');
  textContent.items.forEach((item, idx) => {
    // transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
    const x = item.transform[4];
    const y = item.transform[5];
    console.log(`[${idx}] Text: "${item.str}" | X: ${x.toFixed(2)} | Y: ${y.toFixed(2)} | Width: ${item.width.toFixed(2)} | Height: ${item.height.toFixed(2)}`);
  });
}

main().catch(console.error);
