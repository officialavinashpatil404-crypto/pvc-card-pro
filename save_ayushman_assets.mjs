import fs from 'fs';
import path from 'path';
import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream, PDFDict } from 'pdf-lib';
import * as zlib from 'zlib';

function crc32(buf) {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const buf = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, data.length);
  buf.set(Buffer.from(type, 'ascii'), 4);
  buf.set(data, 8);
  const crcInput = buf.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return buf;
}

function rawToPng(rawPixels, width, height, bytesPerPixel) {
  const scanlineLength = width * bytesPerPixel;
  const filtered = new Uint8Array(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    const srcOffset = y * scanlineLength;
    const destOffset = y * (scanlineLength + 1);
    filtered[destOffset] = 0; // Filter type 0
    filtered.set(rawPixels.subarray(srcOffset, srcOffset + scanlineLength), destOffset + 1);
  }
  const compressed = zlib.deflateSync(filtered);
  const ihdrData = new Uint8Array(13);
  const view = new DataView(ihdrData.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdrData[8] = 8;
  ihdrData[9] = bytesPerPixel === 3 ? 2 : (bytesPerPixel === 4 ? 6 : 0);
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function rawStreamToBase64(rawStream, width, height, filter) {
  if (filter.includes('DCTDecode') || filter.includes('DCT')) {
    const bytes = rawStream.getContents();
    return { ext: 'jpg', buffer: Buffer.from(bytes) };
  } else {
    try {
      const decodedStream = decodePDFRawStream(rawStream);
      const bytes = decodedStream.getBytes();
      const pixelCount = width * height;
      const bpp = Math.floor(bytes.length / pixelCount);

      if (bpp === 1 || bpp === 3 || bpp === 4) {
        const pngBuffer = rawToPng(bytes, width, height, bpp);
        return { ext: 'png', buffer: pngBuffer };
      } else {
        return { ext: 'png', buffer: Buffer.from(bytes) };
      }
    } catch (err) {
      console.error('Error converting raw stream:', err.message);
      try {
        const bytes = rawStream.getContents();
        return { ext: 'png', buffer: Buffer.from(bytes) };
      } catch (e) {
        return null;
      }
    }
  }
}

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(new Uint8Array(buffer));
  const candidates = [];

  const resolveXObjects = (xObjectDict) => {
    const keys = xObjectDict.keys();
    for (const key of keys) {
      try {
        const obj = xObjectDict.lookup(key);
        if (!obj) continue;

        const isRawStream = obj && (
          obj.constructor?.name === 'PDFRawStream' ||
          (typeof obj === 'object' && 'dict' in obj && typeof obj.dict?.get === 'function' && typeof obj.getContents === 'function')
        );

        if (isRawStream) {
          const rawStream = obj;
          const { dict } = rawStream;
          const subtype = dict.get(PDFName.of('Subtype'));
          const subtypeStr = subtype ? subtype.toString() : '';

          if (subtypeStr === '/Image' || subtypeStr === 'Image') {
            const widthObj = dict.get(PDFName.of('Width'));
            const heightObj = dict.get(PDFName.of('Height'));
            const filterObj = dict.get(PDFName.of('Filter'));

            const width = widthObj ? Number(widthObj.toString()) : 0;
            const height = heightObj ? Number(heightObj.toString()) : 0;
            const filter = filterObj ? filterObj.toString() : '';

            if (width > 0 && height > 0) {
              candidates.push({ key: key.toString(), width, height, filter, rawStream });
            }
          } else if (subtypeStr === '/Form' || subtypeStr === 'Form') {
            const nestedResources = dict.get(PDFName.of('Resources'));
            if (nestedResources && nestedResources instanceof PDFDict) {
              const nestedXObject = nestedResources.lookupMaybe(PDFName.of('XObject'), PDFDict);
              if (nestedXObject) {
                resolveXObjects(nestedXObject);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error resolving XObject:', e.message);
      }
    }
  };

  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const resources = page.node.Resources();
    if (resources) {
      const xObjectDict = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
      if (xObjectDict) {
        resolveXObjects(xObjectDict);
      }
    }
  }

  console.log(`Found ${candidates.length} images. Saving to C:/Users/NANO/Downloads/...`);
  candidates.forEach((c, idx) => {
    const res = rawStreamToBase64(c.rawStream, c.width, c.height, c.filter);
    if (res) {
      const filename = `extracted_${idx}_${c.key.replace('/', '')}_${c.width}x${c.height}.${res.ext}`;
      const savePath = path.join('C:/Users/NANO/Downloads/', filename);
      fs.writeFileSync(savePath, res.buffer);
      console.log(`Saved: ${filename}`);
    }
  });
}

main().catch(console.error);
