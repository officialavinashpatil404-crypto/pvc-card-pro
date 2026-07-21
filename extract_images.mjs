import * as pdfjs from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
import fs from 'fs';

// Wait, we can write a simple PNG generator using canvas in a puppet page or write pixel buffer manually.
// Or we can just use the canvas from canvas package if available, or write a raw BMP / PNG.
// Wait, we can use the `pngjs` package if it's installed, or write a quick PNG parser.
// Let's check if pngjs is in node_modules. No, it wasn't in package.json.
// Wait, can we use canvas or use jspdf / canvas in puppeteer to save the image?
// Yes! Or we can write a small script that runs in Node.js and saves raw RGB data as a BMP file, which is very easy to write from scratch without dependencies!
// BMP format is extremely simple: header (54 bytes) + pixel data.
// Let's write a helper to save raw pixel data (RGB/RGBA) as BMP.

function saveBmp(rgbaData, width, height, outPath) {
  // BMP Header
  const rowSize = Math.floor((3 * width + 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buffer = Buffer.alloc(fileSize);

  // File Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10); // Offset to pixel data

  // Image Header
  buffer.writeUInt32LE(40, 14); // Header size
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22); // Positive height means bottom-to-top BMP
  buffer.writeUInt16LE(1, 26); // Planes
  buffer.writeUInt16LE(24, 28); // 24-bit RGB
  buffer.writeUInt32LE(0, 30); // No compression
  buffer.writeUInt32LE(pixelDataSize, 34);

  // Write pixels (BMP is bottom-to-top, BGR format)
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // Bottom-to-top
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const destIdx = 54 + y * rowSize + x * 3;

      const r = rgbaData[srcIdx];
      const g = rgbaData[srcIdx + 1];
      const b = rgbaData[srcIdx + 2];

      buffer[destIdx] = b;
      buffer[destIdx + 1] = g;
      buffer[destIdx + 2] = r;
    }
  }

  fs.writeFileSync(outPath, buffer);
}

async function main() {
  const filePath = 'C:/Users/NANO/Downloads/881133162662944_signed.pdf';
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: '21092003',
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  
  // We need to render the page or trigger operator list execution to populate page.objs
  const viewport = page.getViewport({ scale: 1.0 });
  
  // We can mock a canvas or a task to execute the operator list
  // Wait, the simplest way to populate page.objs is to get the operator list and then load images.
  const operatorList = await page.getOperatorList();
  
  console.log('Total objects in page.objs before lookup:', Object.keys(page.objs).length);
  
  const fns = operatorList.fnArray;
  const args = operatorList.argsArray;
  
  const imageNames = new Set();
  for (let i = 0; i < fns.length; i++) {
    const fn = fns[i];
    if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject || fn === pdfjs.OPS.paintImageMaskXObject) {
      const imgName = args[i][0];
      imageNames.add(imgName);
    }
  }
  
  console.log('Found image names in operators:', Array.from(imageNames));
  
  for (const imgName of imageNames) {
    try {
      // In PDF.js, page.objs.get(name) is a promise or callback, or synchronous.
      // Let's resolve the object. If page.objs.get(imgName) is a promise/async:
      console.log(`Retrieving image object: ${imgName}`);
      const imgObj = await new Promise((resolve, reject) => {
        page.objs.get(imgName, (obj) => {
          if (obj) resolve(obj);
          else reject(new Error('Object not found: ' + imgName));
        });
      });
      
      console.log(`Image ${imgName} metadata: width=${imgObj.width}, height=${imgObj.height}, kind=${imgObj.kind}`);
      
      // Convert to RGBA
      let rgba;
      if (imgObj.data) {
        // If it's RGB or Grayscale or RGBA
        const size = imgObj.width * imgObj.height * 4;
        rgba = new Uint8ClampedArray(size);
        const data = imgObj.data;
        
        if (data.length === imgObj.width * imgObj.height * 3) {
          // RGB -> RGBA
          for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
            rgba[j] = data[i];
            rgba[j+1] = data[i+1];
            rgba[j+2] = data[i+2];
            rgba[j+3] = 255;
          }
        } else if (data.length === imgObj.width * imgObj.height) {
          // Grayscale -> RGBA
          for (let i = 0, j = 0; i < data.length; i++, j += 4) {
            const val = data[i];
            rgba[j] = val;
            rgba[j+1] = val;
            rgba[j+2] = val;
            rgba[j+3] = 255;
          }
        } else if (data.length === size) {
          rgba = data;
        } else {
          console.log(`Unexpected data length: ${data.length} for size ${size}`);
          continue;
        }
        
        const bmpPath = `C:/Users/NANO/Downloads/${imgName}.bmp`;
        saveBmp(rgba, imgObj.width, imgObj.height, bmpPath);
        console.log(`Saved image to ${bmpPath}`);
      }
    } catch (err) {
      console.log(`Error loading image ${imgName}:`, err.message);
    }
  }
}

main().catch(console.error);
