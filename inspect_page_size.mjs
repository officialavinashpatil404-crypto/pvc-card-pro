import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 1.0 });
  console.log(`Page 1 Size: Width = ${page.view[2]}, Height = ${page.view[3]}`);
  console.log(`Viewport Size: Width = ${viewport.width}, Height = ${viewport.height}`);
  console.log(`Rotation: ${page.rotate}`);
}

main().catch(console.error);
