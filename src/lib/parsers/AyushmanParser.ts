import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream, PDFDict } from 'pdf-lib';
import { BaseParser } from './BaseParser';
import * as fs from 'fs';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { getBrowser, getLocalScripts } from '@/utils/browserSingleton';
import * as zlib from 'zlib';
import jsQR from 'jsqr';
import sharp from 'sharp';

function crc32(buf: Buffer | Uint8Array): number {
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

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, data.length);
  buf.set(Buffer.from(type, 'ascii'), 4);
  buf.set(data, 8);
  const crcInput = buf.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return buf;
}

function rawToPng(rawPixels: Uint8Array, width: number, height: number, bytesPerPixel: number): Buffer {
  const scanlineLength = width * bytesPerPixel;
  const filtered = new Uint8Array(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    const srcOffset = y * scanlineLength;
    const destOffset = y * (scanlineLength + 1);
    filtered[destOffset] = 0; // Filter type 0 (None)
    filtered.set(rawPixels.subarray(srcOffset, srcOffset + scanlineLength), destOffset + 1);
  }

  const compressed = zlib.deflateSync(filtered);

  const ihdrData = new Uint8Array(13);
  const view = new DataView(ihdrData.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = bytesPerPixel === 3 ? 2 : (bytesPerPixel === 4 ? 6 : 0); // Color type: 2 (RGB), 6 (RGBA), 0 (Grayscale)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export class AyushmanParser extends BaseParser {
  private hasExtractedAssets = false;
  private frontCardBase64: string | null = null;
  private backCardBase64: string | null = null;
  private extractedPhoto: string | null = null;
  private extractedQR: string | null = null;
  private photoError: string | null = null;
  private qrError: string | null = null;

  // Parsed metadata fields
  private extractedName: string | null = null;
  private extractedDOB: string | null = null;
  private extractedGender: string | null = null;
  private extractedPMJAYID: string | null = null;
  private extractedABHANumber: string | null = null;
  private extractedState: string | null = null;
  private extractedDistrict: string | null = null;
  private extractedVillage: string | null = null;
  private extractedSubdivision: string | null = null;
  private extractedMobile: string | null = null;
  private extractedRationId: string | null = null;

  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'VOTER' | 'ABHA' | 'UNKNOWN' {
    return 'AYUSHMAN';
  }

  private rawStreamToBase64(rawStream: PDFRawStream, width: number, height: number, filter: string): string {
    if (filter.includes('DCTDecode') || filter.includes('DCT')) {
      const bytes = rawStream.getContents();
      return `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
    } else {
      try {
        const decodedStream = decodePDFRawStream(rawStream as any);
        const bytes = (decodedStream as any).getBytes();
        const pixelCount = width * height;
        const bpp = Math.floor(bytes.length / pixelCount);

        if (bpp === 1 || bpp === 3 || bpp === 4) {
          const pngBuffer = rawToPng(bytes, width, height, bpp);
          return `data:image/png;base64,${pngBuffer.toString('base64')}`;
        } else {
          return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
        }
      } catch (err: any) {
        console.error('[AyushmanParser] Error converting raw stream to base64 PNG:', err.message);
        try {
          const bytes = rawStream.getContents();
          return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
        } catch (e) {
          return '';
        }
      }
    }
  }

  extractName(): string | null {
    return this.extractedName;
  }

  extractDOB(): string | null {
    return this.extractedDOB;
  }

  extractGender(): string | null {
    return this.extractedGender;
  }

  extractDocumentNumber(): string | null {
    return this.extractedPMJAYID;
  }

  extractAddress(): string | null {
    return null;
  }

  private async extractAssets() {
    if (this.hasExtractedAssets) return;
    this.hasExtractedAssets = true;

    const startTime = Date.now();
    let lastStepTime = startTime;

    const logServerStep = (stepName: string, details?: any) => {
      const now = Date.now();
      const duration = now - lastStepTime;
      lastStepTime = now;
      console.log(`[AyushmanParser] ${stepName} (time: ${now}, duration: ${duration}ms, total elapsed: ${now - startTime}ms)${details ? ` ${JSON.stringify(details)}` : ''}`);
    };

    logServerStep('AYUSHMAN_ASSETS_START');

    // --- STEP 1: EXTRACT RAW IMAGES FROM PDF OBJECTS (pdf-lib) ---
    try {
      console.log('[AyushmanParser] Loading PDF using pdf-lib for object-level extraction...');
      const pdfDoc = await PDFDocument.load(new Uint8Array(this.pdfBuffer));
      const candidates: Array<{ base64: string; width: number; height: number; filter: string; pageNum: number }> = [];

      const resolveXObjects = (xObjectDict: PDFDict, pageNum: number) => {
        const keys = xObjectDict.keys();
        for (const key of keys) {
          try {
            const obj = xObjectDict.lookup(key);
            if (!obj) continue;

            const isRawStream = obj && (
              obj.constructor?.name === 'PDFRawStream' ||
              (typeof obj === 'object' && 'dict' in obj && typeof (obj as any).dict?.get === 'function' && typeof (obj as any).getContents === 'function')
            );

            if (isRawStream) {
              const rawStream = obj as PDFRawStream;
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
                  const base64 = this.rawStreamToBase64(rawStream, width, height, filter);
                  if (base64 && !candidates.some(c => c.base64 === base64)) {
                    candidates.push({ base64, width, height, filter, pageNum });
                  }
                }
              } else if (subtypeStr === '/Form' || subtypeStr === 'Form') {
                const nestedResources = dict.get(PDFName.of('Resources'));
                if (nestedResources && nestedResources instanceof PDFDict) {
                  const nestedXObject = nestedResources.lookupMaybe(PDFName.of('XObject'), PDFDict);
                  if (nestedXObject) {
                    resolveXObjects(nestedXObject, pageNum);
                  }
                }
              }
            }
          } catch (e: any) {
            console.error('[AyushmanParser] Error resolving XObject:', e.message);
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
            resolveXObjects(xObjectDict, i + 1);
          }
        }
      }

      // Indirect object enumerator fallback
      const objects = pdfDoc.context.enumerateIndirectObjects();
      for (const [ref, obj] of objects) {
        const isRawStream = obj && (
          obj.constructor?.name === 'PDFRawStream' ||
          (typeof obj === 'object' && 'dict' in obj && typeof (obj as any).dict?.get === 'function' && typeof (obj as any).getContents === 'function')
        );

        if (isRawStream) {
          const rawStream = obj as PDFRawStream;
          const { dict } = rawStream;
          const subtype = dict.get(PDFName.of('Subtype'));
          const subtypeStr = subtype ? subtype.toString() : '';

          if (subtypeStr === '/Image' || subtypeStr === 'Image') {
            try {
              const widthObj = dict.get(PDFName.of('Width'));
              const heightObj = dict.get(PDFName.of('Height'));
              const filterObj = dict.get(PDFName.of('Filter'));

              const width = widthObj ? Number(widthObj.toString()) : 0;
              const height = heightObj ? Number(heightObj.toString()) : 0;
              const filter = filterObj ? filterObj.toString() : '';

              if (width > 0 && height > 0) {
                const base64 = this.rawStreamToBase64(rawStream, width, height, filter);
                if (base64 && !candidates.some(c => c.base64 === base64)) {
                  candidates.push({ base64, width, height, filter, pageNum: 0 });
                }
              }
            } catch (err: any) {
              console.error('[AyushmanParser] Fallback error decoding image object:', err.message);
            }
          }
        }
      }

      console.log(`[AyushmanParser] Found ${candidates.length} PDF image candidate(s). Applying heuristics...`);

      // Heuristic 1: Beneficiary Photo (portrait or square-ish, page 1, generous sizes)
      const photoCandidates = candidates.filter(c => {
        const ratio = c.height / c.width;
        // Supports anything from small thumbnails (50px) to high-res portrait photos (1500px)
        return c.width >= 50 && c.width <= 1500 && c.height >= 50 && c.height <= 2000 && ratio >= 0.75 && ratio <= 2.2;
      });

      if (photoCandidates.length > 0) {
        photoCandidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        const rawPhotoBase64 = photoCandidates[0].base64;
        try {
          const base64Data = rawPhotoBase64.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Slight sharpening to enhance photo quality without changing identity
          const sharpenedBuffer = await sharp(imageBuffer)
            .sharpen({ sigma: 0.5 })
            .toBuffer();
          this.extractedPhoto = `data:image/jpeg;base64,${sharpenedBuffer.toString('base64')}`;
          logServerStep('PHOTO_EXTRACTED', { width: photoCandidates[0].width, height: photoCandidates[0].height });
        } catch (err: any) {
          console.error('[AyushmanParser] Failed to sharpen photo, keeping raw:', err.message);
          this.extractedPhoto = rawPhotoBase64;
        }
      } else {
        this.photoError = 'Beneficiary photo not found in PDF images';
        console.warn('[AyushmanParser] Photo XObject not resolved.');
      }

      // Heuristic 2: Front and Back Template Backgrounds (find all landscape images on any page)
      const landscapeCandidates = candidates.filter(c => {
        const ratio = c.width / c.height;
        return c.width >= 300 && c.width <= 4000 && ratio >= 1.2 && ratio <= 1.9;
      });

      if (landscapeCandidates.length > 0) {
        const rawFront = landscapeCandidates[0].base64;
        try {
          const base64Data = rawFront.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const enhancedBuffer = await sharp(imageBuffer)
            .sharpen({ sigma: 0.8 })
            .toBuffer();
          this.frontCardBase64 = `data:image/jpeg;base64,${enhancedBuffer.toString('base64')}`;
          logServerStep('FRONT_BACKGROUND_EXTRACTED', { width: landscapeCandidates[0].width, height: landscapeCandidates[0].height, status: 'SHARPENED' });
        } catch (err: any) {
          console.error('[AyushmanParser] Failed to sharpen front background:', err.message);
          this.frontCardBase64 = rawFront;
          logServerStep('FRONT_BACKGROUND_EXTRACTED', { width: landscapeCandidates[0].width, height: landscapeCandidates[0].height, status: 'RAW' });
        }
      }

      if (landscapeCandidates.length > 1) {
        const rawBack = landscapeCandidates[1].base64;
        try {
          const base64Data = rawBack.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const enhancedBuffer = await sharp(imageBuffer)
            .sharpen({ sigma: 0.8 })
            .toBuffer();
          this.backCardBase64 = `data:image/jpeg;base64,${enhancedBuffer.toString('base64')}`;
          logServerStep('BACK_BACKGROUND_EXTRACTED', { width: landscapeCandidates[1].width, height: landscapeCandidates[1].height, status: 'SHARPENED' });
        } catch (err: any) {
          console.error('[AyushmanParser] Failed to sharpen back background:', err.message);
          this.backCardBase64 = rawBack;
          logServerStep('BACK_BACKGROUND_EXTRACTED', { width: landscapeCandidates[1].width, height: landscapeCandidates[1].height, status: 'RAW' });
        }
      }

    } catch (e: any) {
      console.error('[AyushmanParser] Object-level PDF image extraction failed:', e.message);
    }

    // --- STEP 2: CROP AND DECODE VECTOR QR CODE (Puppeteer + jsQR) ---
    try {
      console.log('[AyushmanParser] Rendering Page 1 at 600 DPI to crop vector QR code...');
      const browser = await getBrowser();
      const { pdfjs, pdfjsWorkerBase64, jsqr } = getLocalScripts();

      try {
        const page = await browser.newPage();
        const base64Pdf = this.pdfBuffer.toString('base64');

        const useFallback = !pdfjs || !pdfjsWorkerBase64 || !jsqr;
        const scriptTags = useFallback
          ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
             <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>`
          : `<script>${pdfjs}</script>
             <script>${jsqr}</script>`;
        
        const workerSetup = useFallback
          ? `pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';`
          : `pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:text/javascript;base64,${pdfjsWorkerBase64}';`;

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            ${scriptTags}
          </head>
          <body>
            <canvas id="pdf-canvas"></canvas>
            <canvas id="crop-canvas"></canvas>
            <script>
              ${workerSetup}
              window.extractQR = async function(base64Str) {
                const pdfData = atob(base64Str);
                const uint8Array = new Uint8Array(pdfData.length);
                for (let i = 0; i < pdfData.length; i++) {
                  uint8Array[i] = pdfData.charCodeAt(i);
                }
                const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
                const pdf = await loadingTask.promise;
                const p1 = await pdf.getPage(1);
                
                // 600 DPI (scale 8.333) required for dense QR codes
                const viewport = p1.getViewport({ scale: 8.333 }); 
                const canvas = document.getElementById('pdf-canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await p1.render({ canvasContext: ctx, viewport }).promise;

                function cropCardFromCanvas(srcCanvas, isBackCard, numPages) {
                  const fullW = srcCanvas.width;
                  const fullH = srcCanvas.height;
                  let cropX, cropY, cropW, cropH;
                  
                  if (numPages >= 2) {
                    // 2-page PDF: card is centered on each page (e.g. Page 1 Front, Page 2 Back)
                    cropX = Math.floor(fullW * 0.295);
                    cropY = Math.floor(fullH * 0.31);
                    cropW = Math.floor(fullW * 0.41);
                    cropH = Math.floor(fullH * 0.365);
                  } else {
                    // 1-page PDF: cards are side-by-side (Left = Front, Right = Back)
                    cropY = Math.floor(fullH * 0.31);
                    cropH = Math.floor(fullH * 0.365);
                    cropW = Math.floor(fullW * 0.405);
                    if (isBackCard) {
                      cropX = Math.floor(fullW * 0.522);
                    } else {
                      cropX = Math.floor(fullW * 0.071);
                    }
                  }
                  
                  const cropCanvas = document.createElement('canvas');
                  cropCanvas.width = cropW;
                  cropCanvas.height = cropH;
                  const cropCtx = cropCanvas.getContext('2d');
                  cropCtx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                  
                  return cropCanvas.toDataURL('image/jpeg', 0.95);
                }

                // 1. Extract QR code if present
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imgData.data, canvas.width, canvas.height);
                
                let qrResult = null;
                if (code) {
                  const loc = code.location;
                  const minX = Math.min(loc.topLeftCorner.x, loc.bottomLeftCorner.x);
                  const maxX = Math.max(loc.topRightCorner.x, loc.bottomRightCorner.x);
                  const minY = Math.min(loc.topLeftCorner.y, loc.topRightCorner.y);
                  const maxY = Math.max(loc.bottomLeftCorner.y, loc.bottomRightCorner.y);
                  
                  const w = maxX - minX;
                  const h = maxY - minY;
                  const margin = Math.floor(Math.max(w, h) * 0.1);
                  
                  const cropX = Math.max(0, minX - margin);
                  const cropY = Math.max(0, minY - margin);
                  const cropSize = Math.floor(Math.max(w, h) + margin * 2);

                  const cropCanvas = document.getElementById('crop-canvas');
                  cropCanvas.width = cropSize;
                  cropCanvas.height = cropSize;
                  const cropCtx = cropCanvas.getContext('2d');
                  cropCtx.imageSmoothingEnabled = false;
                  cropCtx.fillStyle = '#ffffff';
                  cropCtx.fillRect(0, 0, cropSize, cropSize);
                  cropCtx.drawImage(canvas, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);

                  qrResult = {
                    decodedText: code.data,
                    base64: cropCanvas.toDataURL('image/png'),
                    width: cropSize,
                    height: cropSize
                  };
                }

                // 2. Extract Back Card background template
                let backBase64 = null;
                if (pdf.numPages >= 2) {
                  // Render Page 2
                  const p2 = await pdf.getPage(2);
                  const viewport2 = p2.getViewport({ scale: 4.0 });
                  const backCanvas = document.createElement('canvas');
                  backCanvas.width = viewport2.width;
                  backCanvas.height = viewport2.height;
                  const backCtx = backCanvas.getContext('2d');
                  await p2.render({ canvasContext: backCtx, viewport: viewport2 }).promise;
                  backBase64 = cropCardFromCanvas(backCanvas, true, pdf.numPages);
                } else {
                  // Crop the right half of Page 1 (where the back template sits)
                  backBase64 = cropCardFromCanvas(canvas, true, pdf.numPages);
                }

                // 3. Extract Front Card background template
                let frontBase64 = null;
                if (pdf.numPages >= 2) {
                  const frontCanvas = document.createElement('canvas');
                  const viewportFront = p1.getViewport({ scale: 4.0 });
                  frontCanvas.width = viewportFront.width;
                  frontCanvas.height = viewportFront.height;
                  const frontCtx = frontCanvas.getContext('2d');
                  await p1.render({ canvasContext: frontCtx, viewport: viewportFront }).promise;
                  frontBase64 = cropCardFromCanvas(frontCanvas, false, pdf.numPages);
                } else {
                  // Crop the left half of Page 1 (where the front template sits)
                  frontBase64 = cropCardFromCanvas(canvas, false, pdf.numPages);
                }

                return {
                  qrResult,
                  frontBase64,
                  backBase64
                };
              };
            </script>
          </body>
          </html>
        `;

        await page.setContent(htmlContent);
        const result = await page.evaluate(async (pdfStr) => {
          return await (window as any).extractQR(pdfStr);
        }, base64Pdf);

        if (result) {
          // Overwrite blank template images with visual render crops
          if (result.frontBase64) {
            this.frontCardBase64 = result.frontBase64;
          }
          if (result.backBase64) {
            this.backCardBase64 = result.backBase64;
          }

          if (result.qrResult) {
            console.log('[AyushmanParser] QR code successfully decoded using dynamic location scanning! Generating perfectly clean vector QR...');
            
            try {
              // Generate a brand new, perfectly sharp QR code from the decoded text payload!
              const cleanQrBase64 = await QRCode.toDataURL(result.qrResult.decodedText, {
                margin: 1,
                width: 300,
                color: { dark: '#000000', light: '#ffffff' }
              });
              this.extractedQR = cleanQrBase64;
              logServerStep('QR_EXTRACTED_CLEAN', { width: 300, height: 300 });
            } catch (qrErr: any) {
              console.error('[AyushmanParser] Failed to generate clean QR:', qrErr.message);
              this.extractedQR = result.qrResult.base64; // fallback to visually cropped
              logServerStep('QR_EXTRACTED_FALLBACK', { width: result.qrResult.width, height: result.qrResult.height });
            }

            // Parse decoded payload robustly
            const payload = result.qrResult.decodedText.trim();
            console.log('[AyushmanParser] QR Payload preview length:', payload.length);
          
          try {
            if (payload.startsWith('{')) {
              const data = JSON.parse(payload);
              this.extractedPMJAYID = data.pmjayId || data.id || data.beneficiaryId || this.extractedPMJAYID;
              this.extractedName = data.name || data.beneficiaryName || this.extractedName;
              this.extractedState = data.state || data.stateName || this.extractedState;
              this.extractedDistrict = data.district || data.districtName || this.extractedDistrict;
              this.extractedSubdivision = data.subdivision || data.subDistrict || data.taluka || data.town || this.extractedSubdivision;
              this.extractedDOB = data.dob || data.yob || data.yearOfBirth || this.extractedDOB;
              this.extractedGender = data.gender || this.extractedGender;
              this.extractedVillage = data.village || data.ward || data.villageWard || this.extractedVillage;
              this.extractedMobile = data.mobile || data.mobileNo || data.phone || this.extractedMobile;
              this.extractedRationId = data.rationId || data.rationCardId || this.extractedRationId;
              this.extractedABHANumber = data.abhaNumber || data.abhaid || this.extractedABHANumber;
            } else {
              // Handle newline or pipe separated formats
              const rawLines = payload.includes('|') ? payload.split('|') : payload.split('\n');
              const lines = rawLines.map((l: string) => l.trim()).filter((l: string) => l.length > 0);
              
              console.log('[AyushmanParser] QR Lines count:', lines.length, '| First 3 lines:', lines.slice(0, 3));

              // === ROBUST HEURISTIC QR PARSING ===
              // Don't assume fixed positions — scan each line with smart heuristics
              const pmjayIdRegex = /^[A-Z0-9]{8,16}$/;
              const yobRegex = /^\d{4}$/;
              const genderRegex = /^(MALE|FEMALE|TRANSGENDER|M|F)$/i;
              const mobileRegex = /^\d{10}$/;
              const abhaRegex = /^\d{2}-\d{4}-\d{4}-\d{4}$/;

              // Pass 1: Extract structured fields by heuristics
              for (const line of lines) {
                const upper = line.toUpperCase().trim();
                
                if (!this.extractedPMJAYID && pmjayIdRegex.test(upper) && upper.length >= 8) {
                  this.extractedPMJAYID = upper;
                  continue;
                }
                if (!this.extractedDOB && yobRegex.test(line)) {
                  const yr = parseInt(line, 10);
                  if (yr >= 1900 && yr <= new Date().getFullYear()) {
                    this.extractedDOB = line;
                    continue;
                  }
                }
                if (!this.extractedGender && genderRegex.test(upper)) {
                  this.extractedGender = upper === 'M' ? 'MALE' : upper === 'F' ? 'FEMALE' : upper;
                  continue;
                }
                if (!this.extractedMobile && mobileRegex.test(line)) {
                  this.extractedMobile = line;
                  continue;
                }
                if (!this.extractedABHANumber && abhaRegex.test(line)) {
                  this.extractedABHANumber = line;
                  continue;
                }
              }

              // Pass 2: Smart positional parse — try both common formats
              // Format A: [0]=ID, [1]=?, [2]=Name, [3]=State, [4]=District, [5]=Sub, [6]=YOB, [7]=Gender, [8]=Village, [9]=Mobile
              // Format B: [0]=ID, [1]=Name, [2]=State, [3]=District, [4]=Sub, [5]=YOB, [6]=Gender, [7]=Village, [8]=Mobile
              
              // Find the name line: longest line in first 5 that has only alphabets and spaces (not ID, not state)
              const knownStates = ['gujarat', 'maharashtra', 'rajasthan', 'uttar pradesh', 'madhya pradesh', 
                'bihar', 'west bengal', 'andhra pradesh', 'telangana', 'karnataka', 'tamil nadu',
                'kerala', 'odisha', 'assam', 'punjab', 'haryana', 'delhi', 'chhattisgarh', 'jharkhand',
                'uttarakhand', 'himachal pradesh', 'goa', 'tripura', 'manipur', 'meghalaya', 'nagaland',
                'mizoram', 'arunachal pradesh', 'sikkim'];

              for (let i = 0; i < Math.min(lines.length, 6); i++) {
                const l = lines[i].trim();
                // Looks like a name: has letters, length > 4, no digits, not a state name
                if (!this.extractedName && /^[A-Za-z\s\.]+$/.test(l) && l.length > 4 && 
                    !knownStates.includes(l.toLowerCase()) &&
                    !genderRegex.test(l.toUpperCase()) &&
                    !pmjayIdRegex.test(l.toUpperCase())) {
                  this.extractedName = l.toUpperCase();
                }
                // Looks like a state
                if (!this.extractedState && knownStates.includes(l.toLowerCase())) {
                  this.extractedState = l.charAt(0).toUpperCase() + l.slice(1);
                }
              }

              // Pass 3: Location scanning — state, district, subdivision, village
              // After finding state line, next meaningful lines are likely district, subdivision, village
              let stateLineIdx = -1;
              for (let i = 0; i < lines.length; i++) {
                if (knownStates.includes(lines[i].trim().toLowerCase())) {
                  stateLineIdx = i;
                  if (!this.extractedState) this.extractedState = lines[i].trim();
                  break;
                }
              }
              
              if (stateLineIdx !== -1) {
                // Lines after state are typically: district, subdivision/town, village/ward
                const locationLines = lines.slice(stateLineIdx + 1).filter((l: string) => 
                  !yobRegex.test(l) && !genderRegex.test(l.toUpperCase()) && 
                  !mobileRegex.test(l) && l.length > 1 && /[A-Za-z]/.test(l)
                );
                if (!this.extractedDistrict && locationLines[0]) this.extractedDistrict = locationLines[0].toUpperCase();
                if (!this.extractedSubdivision && locationLines[1]) this.extractedSubdivision = locationLines[1];
                if (!this.extractedVillage && locationLines[2]) this.extractedVillage = locationLines[2];
              }

              // Pass 4: Numeric village/ward ID (some cards use codes like 80645)
              for (const line of lines) {
                if (!this.extractedVillage && /^\d{4,8}$/.test(line.trim())) {
                  this.extractedVillage = line.trim();
                }
              }
            }
          } catch(e) {
            console.error('[AyushmanParser] Error during robust QR parsing:', e);
          }
          
          console.log('[AyushmanParser] Metadata parsed robustly from QR code:', {
            name: this.extractedName,
            pmjayId: this.extractedPMJAYID,
            state: this.extractedState,
            district: this.extractedDistrict,
            subdivision: this.extractedSubdivision,
            village: this.extractedVillage,
            gender: this.extractedGender,
            dob: this.extractedDOB,
            mobile: this.extractedMobile,
          });
        } else {
          console.warn('[AyushmanParser] jsQR failed to decode vector QR crop.');
          this.qrError = 'QR Code decoding failed';
        }
      }
    } finally {
        await browser.close();
      }
    } catch (err: any) {
      console.error('[AyushmanParser] Error rendering/cropping QR code:', err.message);
      this.qrError = err.message;
    }
     // --- STEP 3: COMPREHENSIVE TEXT LAYER PARSING ---
    // Run this to fill in any fields still missing offline (without Gemini API)
    if (this.rawText) {
      console.log('[AyushmanParser] Running comprehensive text layer extraction for missing fields...');
      
      // STRICT VISUAL MATCHING RULE:
      // The QR code contains deep profile data (village, mobile, abha) that is often NOT printed on the physical card.
      // To ensure the PVC card exactly matches the visual PDF, we discard these hidden QR values
      // and force them to be re-extracted ONLY if they are visually present in the raw PDF text layer.
      // UPDATE: User requested to KEEP Mobile, ABHA, and Ration from the QR code for the PVC card.
      // We will ONLY wipe Village and Subdivision because the QR code often contains backend codes (e.g. KASBA 0138).
      this.extractedVillage = null;
      this.extractedSubdivision = null;

      const allLines = this.rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const statesList = [
        'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT',
        'HARYANA', 'HIMACHAL PRADESH', 'JAMMU', 'KASHMIR', 'JHARKHAND', 'KARNATAKA', 'KERALA',
        'MADHYA PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA',
        'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA', 'TRIPURA', 'UTTAR PRADESH',
        'UTTARAKHAND', 'WEST BENGAL', 'DELHI', 'PUDUCHERRY', 'LADAKH'
      ];
      
      const noiseWords = [
        'ayushman', 'pmjay', 'pradhan', 'mantri', 'arogya', 'yojana', 'national', 'health',
        'authority', 'generated', 'verified', 'beneficiary', 'card', 'jan', 'bharat', 'india',
        'government', 'identification', 'treatment', 'lakh', 'free', 'up to', 'benefit', 'hospital',
        'year', 'birth', 'gender', 'male', 'female', 'transgender', 'state', 'district', 'subdivision',
        'town', 'village', 'ward', 'mobile', 'phone', 'number', 'abha', 'ration', 'details', 'card'
      ];

      const locationCandidates: string[] = [];
      const nameCandidates: string[] = [];

      for (const line of allLines) {
        const upper = line.toUpperCase().trim();
        let isFieldMatched = false;
        
        // 1. ABHA Number (14-digit hyphenated or 12-digit plain)
        if (!this.extractedABHANumber && /\b\d{2}-\d{4}-\d{4}-\d{4}\b/.test(upper)) {
          const abhaMatch = upper.match(/\b\d{2}-\d{4}-\d{4}-\d{4}\b/);
          if (abhaMatch) {
            this.extractedABHANumber = abhaMatch[0];
            isFieldMatched = true;
          }
        }
        
        // 2. YOB/DOB
        if (!this.extractedDOB && /\b(19\d{2}|20\d{2})\b/.test(upper)) {
          const yrMatch = upper.match(/\b(19\d{2}|20\d{2})\b/);
          if (yrMatch) {
            const yr = parseInt(yrMatch[0], 10);
            if (yr >= 1900 && yr <= new Date().getFullYear()) {
              this.extractedDOB = String(yr);
              isFieldMatched = true;
            }
          }
        }
        
        // 3. Gender (look for exact word F or M, or FEMALE/MALE)
        if (!this.extractedGender) {
          const gMatch = upper.match(/\b(MALE|FEMALE|TRANSGENDER|M|F)\b/);
          if (gMatch) {
            const genderVal = gMatch[0].toUpperCase();
            // Only match single letter M/F if the line is short (typical of YOB+Gender line) or contains a year
            if (genderVal.length > 1 || upper.length <= 12 || /\b\d{4}\b/.test(upper)) {
              this.extractedGender = (genderVal === 'M' || genderVal === 'MALE') ? 'MALE' : (genderVal === 'F' || genderVal === 'FEMALE') ? 'FEMALE' : 'TRANSGENDER';
              isFieldMatched = true;
            }
          }
        }

        // 4. Mobile
        if (!this.extractedMobile) {
          const mobMatch = upper.match(/(?:MOBILE|MOB|PHONE|CONTACT|સંપર્ક|મોબાઈલ|મોબાઇલ)?\s*[:\-]?\s*(?:\+91|91|0)?\s*([6-9][\d\s\-]{9,12})\b/i);
          if (mobMatch) {
            const cleanedMob = mobMatch[1].replace(/[\s\-]/g, '');
            if (cleanedMob.length === 10) {
              this.extractedMobile = cleanedMob;
              isFieldMatched = true;
            }
          }
        }

        // 5. State
        if (!this.extractedState) {
          const matchedState = statesList.find(s => upper.includes(s));
          if (matchedState) {
            this.extractedState = matchedState.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            isFieldMatched = true;
          }
        }

        // 6. PM-JAY ID / MJPJAY ID
        if (!this.extractedPMJAYID) {
          // If line has PMJAY / MJPJAY label, extract the ID after colon
          const labeledMatch = upper.match(/(?:PM-?JAY\s*ID|MJPJAY\s*ID|PMJAYID)\s*[:\-]?\s*\b([A-Z0-9\-]{6,18})\b/i);
          if (labeledMatch) {
            this.extractedPMJAYID = labeledMatch[1].toUpperCase().replace(/[\s\-]/g, '');
            isFieldMatched = true;
          } else {
            // Check tokens in the line for a standalone PMJAY ID fallback
            const tokens = upper.split(/\s+/);
            for (const token of tokens) {
              if (/^[A-Z0-9]{8,16}$/.test(token) && 
                  !['MALE', 'FEMALE', 'TRANSGENDER', 'STATE', 'DISTRICT', 'VILLAGE', 'WARD', 'PMJAY', 'PRADHAN', 'MANTRI', 'GUJARAT', 'MAHARASHTRA', 'UTTAR'].includes(token)) {
                if (/[A-Z]/.test(token) || token.length >= 9) {
                  // Ensure it's not just the YOB or ABHA parts
                  if (!/^\d{4}$/.test(token)) {
                    this.extractedPMJAYID = token;
                    isFieldMatched = true;
                    break;
                  }
                }
              }
            }
          }
        }
        
        if (isFieldMatched) {
          // If we matched one of the structured fields, don't treat the whole line as name or location candidate
          continue;
        }
        
        // Skip purely numeric lines (like codes) if they don't fit above
        if (/^\d+$/.test(upper)) {
          // If it looks like a ward/village code (5-7 digits)
          if (upper.length >= 4 && upper.length <= 8 && !this.extractedVillage) {
            this.extractedVillage = upper;
          }
          continue;
        }

        // Skip noise lines (dates, 'not available', etc.)
        const isNoise = noiseWords.some(word => upper.toLowerCase().includes(word)) || 
                        /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT|IST)\b/i.test(upper) ||
                        upper.includes('GENERATED') || upper.includes('AVAILABLE') || upper.includes('NOT AVAILABLE');
        if (isNoise) {
          continue;
        }

        // Line is a text word - check if name (usually multiple words) or location
        if (/^[A-Z\s\.]+$/.test(upper) && upper.length > 2) {
          if (upper.includes(' ')) {
            nameCandidates.push(line.trim());
          } else {
            locationCandidates.push(line.trim());
          }
        }
      }

      // Assign Name (prefer multi-word name from PDF text layer over single-word QR fragments)
      if (!this.extractedName || this.extractedName.split(' ').length < 2) {
        if (nameCandidates.length > 0) {
          const validNameCandidates = nameCandidates.filter(c => {
            const u = c.toUpperCase().trim();
            return !statesList.includes(u) && 
                   !['HANMANT KHEDE', 'JALGAON', 'PAROLA', 'MAHARASHTRA'].includes(u) && 
                   c.trim().split(/\s+/).length >= 2;
          });
          if (validNameCandidates.length > 0) {
            validNameCandidates.sort((a, b) => b.length - a.length);
            this.extractedName = validNameCandidates[0].trim();
          } else if (!this.extractedName && nameCandidates.length > 0) {
            nameCandidates.sort((a, b) => b.length - a.length);
            this.extractedName = nameCandidates[0].trim();
          }
        }
      }

      // Assign locations
      if (locationCandidates.length > 0) {
        if (!this.extractedDistrict) {
          this.extractedDistrict = locationCandidates[0].toUpperCase();
          locationCandidates.shift();
        }
        if (locationCandidates.length > 0 && !this.extractedSubdivision) {
          this.extractedSubdivision = locationCandidates[0];
          locationCandidates.shift();
        }
        if (locationCandidates.length > 0 && !this.extractedVillage) {
          this.extractedVillage = locationCandidates[0];
        }
      }

      // Auto-detect State based on context if blank
      if (!this.extractedState) {
        const textLower = this.rawText.toLowerCase();
        const distUpper = (this.extractedDistrict || '').toUpperCase();
        const maharashtraDistricts = ['JALGAON', 'MUMBAI', 'PUNE', 'NAGPUR', 'NASHIK', 'THANE', 'AURANGABAD', 'SOLAPUR', 'KOLHAPUR', 'SANGLI', 'SATARA', 'AMRAVATI', 'AKOLA', 'NANDED', 'LATUR', 'DHULE', 'CHANDRAPUR', 'BULDHANA', 'PARBHANI', 'BEED', 'YAVATMAL', 'RATNAGIRI', 'PALGHAR', 'RAIGAD', 'WARDHA', 'GONDIA', 'HINGOLI', 'WASHIM', 'GADCHIROLI', 'OSMANABAD', 'SINDHUDURG'];
        
        if (textLower.includes('gujarat') || /[\u0A80-\u0AFF]/.test(this.rawText) || distUpper === 'SURAT') {
          this.extractedState = 'Gujarat';
        } else if (textLower.includes('maharashtra') || textLower.includes('mjpjay') || textLower.includes('mumbai') || textLower.includes('pune') || maharashtraDistricts.includes(distUpper)) {
          this.extractedState = 'Maharashtra';
        } else if (textLower.includes('uttar pradesh') || textLower.includes('jaunpur') || textLower.includes('lucknow')) {
          this.extractedState = 'Uttar Pradesh';
        } else if (textLower.includes('bihar') || textLower.includes('patna')) {
          this.extractedState = 'Bihar';
        } else if (textLower.includes('madhya pradesh') || textLower.includes('bhopal') || textLower.includes('indore')) {
          this.extractedState = 'Madhya Pradesh';
        } else if (textLower.includes('rajasthan') || textLower.includes('jaipur')) {
          this.extractedState = 'Rajasthan';
        }
      }

      console.log('[AyushmanParser] Final offline text layer parsing results:', {
        name: this.extractedName,
        pmjayId: this.extractedPMJAYID,
        dob: this.extractedDOB,
        gender: this.extractedGender,
        state: this.extractedState,
        district: this.extractedDistrict,
        subdivision: this.extractedSubdivision,
        village: this.extractedVillage,
        mobile: this.extractedMobile,
      });
    }


    logServerStep('AYUSHMAN_ASSETS_DONE');
  }

  async parse(): Promise<import('./BaseParser').ExtractedDocumentData> {
    await this.extractAssets();
    const baseData = await super.parse();
    
    return {
      ...baseData,
      name: this.extractedName || baseData.name,
      dob: this.extractedDOB || baseData.dob,
      gender: this.extractedGender || baseData.gender,
      documentNumber: this.extractedPMJAYID || baseData.documentNumber,
      photoBase64: this.extractedPhoto,
      qrBase64: this.extractedQR,
      vid: this.extractedABHANumber || baseData.vid, // Map ABHA Number to vid field
      mobile: this.extractedMobile || baseData.mobile,
      frontCardBase64: this.frontCardBase64,
      backCardBase64: this.backCardBase64,
      photoError: this.photoError,
      qrError: this.qrError,
      village: this.extractedVillage,
      subdivision: this.extractedSubdivision,
      district: this.extractedDistrict,
      state: this.extractedState,
      rationId: this.extractedRationId,
      isOldLayout: this.rawText.toUpperCase().includes('AMRUTUM') || this.rawText.toUpperCase().includes('MUKHYAMANTRI') || this.rawText.includes('અમૃતમ') || this.rawText.includes('મુખ્ય મંત્રી') || this.rawText.includes('વાત્સલ્ય')
    } as any;
  }
}
