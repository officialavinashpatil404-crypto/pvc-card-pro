import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  const buffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // We want to map it to a target card size of 1013 x 638 pixels.
  // The official page is 306 x 154 points. 
  // Let's get the viewport at scale 1.0 first, and see what the rotation does.
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();

  console.log(`Rotated Viewport: width=${viewport.width}, height=${viewport.height}`);

  textContent.items.forEach((item, idx) => {
    // pdfJS transform
    const tx = item.transform;
    const x = tx[4];
    const y = tx[5];
    
    // Convert to viewport coordinates (origin at top-left of the viewport)
    // convertToViewportPoint returns [vpX, vpY]
    const [vpX, vpY] = viewport.convertToViewportPoint(x, y);
    
    // Let's scale these coordinates to a 1013 x 638 card size.
    // Wait! Since the viewport width is 306 and height is 154, let's see.
    // If the card is cropped horizontally:
    // In points, the original page width is 306, height is 154.
    // If we map page height (154 pt) to card height (638 px), the scale factor is 638 / 154 = 4.1428.
    // The width would be 306 * 4.1428 = 1267px.
    // Since the card width is 1013px, there is a horizontal crop.
    // The crop starting x was: 256px at 600 DPI.
    // Let's scale 256px to 300 DPI: 256 * (300 / 600) = 128px.
    // So the crop starts at 128px relative to a 1267px width.
    // Let's verify this mathematically!
    const scaledX = vpX * 4.1428;
    const scaledY = vpY * 4.1428;
    const cardX = scaledX - 128; // Shift due to horizontal cropping
    const cardY = scaledY;

    console.log(`[${idx}] Text: "${item.str}" | VpX: ${vpX.toFixed(1)}, VpY: ${vpY.toFixed(1)} | CardX: ${cardX.toFixed(1)}, CardY: ${cardY.toFixed(1)}`);
  });
}

main().catch(console.error);
