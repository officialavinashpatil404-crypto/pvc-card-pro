import { BaseParser } from './BaseParser';
import * as fs from 'fs';
import * as path from 'path';
import { getBrowser, getLocalScripts } from '@/utils/browserSingleton';

export class PanParser extends BaseParser {
  private hasExtractedAssets = false;
  private frontCardBase64: string | null = null;
  private backCardBase64: string | null = null;

  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'UNKNOWN' {
    return 'PAN';
  }

  extractName(): string | null {
    // Usually Name is above Father's Name
    const nameMatch = this.rawText.match(/Name\s+([A-Z\s]+)/i) || 
                      this.rawText.match(/([A-Z][A-Z\s]+)\s+Father/i) ||
                      this.rawText.match(/(?:Male|Female)\s+([A-Z\s]+)\s+[A-Z]{5}[0-9]{4}[A-Z]/i);
    return nameMatch ? nameMatch[1].trim() : null;
  }

  extractDOB(): string | null {
    const dobMatch = this.rawText.match(/([\d]{2}\/[\d]{2}\/[\d]{4})/);
    return dobMatch ? dobMatch[1].trim() : null;
  }

  extractGender(): string | null {
    return null; // PAN cards typically don't have gender printed explicitly in a standard format
  }

  extractDocumentNumber(): string | null {
    const panMatch = this.rawText.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
    return panMatch ? panMatch[0].trim() : null;
  }

  extractAddress(): string | null {
    return null; // Standard PAN cards do not have address
  }

  private async extractAssets() {
    if (this.hasExtractedAssets) return;
    this.hasExtractedAssets = true;

    try {
      console.log('[PanParser] Starting PAN card high-res rendering and region detection...');
      const browser = await getBrowser();
      const { pdfjs, pdfjsWorkerBase64 } = getLocalScripts();

      try {
        const page = await browser.newPage();
        const base64Pdf = this.pdfBuffer.toString('base64');
        
        const useFallback = !pdfjs || !pdfjsWorkerBase64;
        const scriptTag = useFallback 
          ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>`
          : `<script>${pdfjs}</script>`;
        
        const workerSetup = useFallback
          ? `pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';`
          : `pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:text/javascript;base64,${pdfjsWorkerBase64}';`;

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            ${scriptTag}
          </head>
          <body>
            <canvas id="pdf-canvas"></canvas>
            <canvas id="crop-canvas"></canvas>
            <script>
              ${workerSetup}
              
              window.renderAndCrop = async function(base64Str, pwd) {
                try {
                  const pdfData = atob(base64Str);
                  const uint8Array = new Uint8Array(pdfData.length);
                  for (let i = 0; i < pdfData.length; i++) {
                    uint8Array[i] = pdfData.charCodeAt(i);
                  }
                  
                  const loadingTask = pdfjsLib.getDocument({ data: uint8Array, password: pwd || undefined });
                  const pdf = await loadingTask.promise;
                  const pageObj = await pdf.getPage(1);
                  
                  const viewport = pageObj.getViewport({ scale: 4.167 }); // 300 DPI
                  const canvas = document.getElementById('pdf-canvas');
                  const context = canvas.getContext('2d');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  
                  await pageObj.render({ canvasContext: context, viewport }).promise;
                  
                  const width = canvas.width;
                  const height = canvas.height;
                  
                  // Scan lower section of the page (y from 2200 to 3450)
                  const startY = 2200;
                  const endY = 3450;
                  const scanHeight = endY - startY;
                  const imgData = context.getImageData(0, startY, width, scanHeight);
                  const data = imgData.data;
                  
                  const darkness = new Uint8Array(width * scanHeight);
                  for (let y = 0; y < scanHeight; y++) {
                    for (let x = 0; x < width; x++) {
                      const idx = (y * width + x) * 4;
                      const r = data[idx];
                      const g = data[idx+1];
                      const b = data[idx+2];
                      if (r < 160 && g < 160 && b < 160) {
                        darkness[y * width + x] = 1;
                      }
                    }
                  }
                  
                  const getColSum = (colX) => {
                    let sum = 0;
                    for (let rowY = 0; rowY < scanHeight; rowY++) {
                      sum += darkness[rowY * width + colX];
                    }
                    return sum;
                  };
                  
                  const getRowSum = (rowY) => {
                    let sum = 0;
                    for (let colX = 0; colX < width; colX++) {
                      sum += darkness[rowY * width + colX];
                    }
                    return sum;
                  };
                  
                  // Find left border x1 in range [200, 350]
                  let x1 = 273;
                  let maxX1 = -1;
                  for (let x = 200; x <= 350; x++) {
                    const sum = getColSum(x);
                    if (sum > maxX1) { maxX1 = sum; x1 = x; }
                  }
                  
                  // Find middle border x2 in range [1200, 1320]
                  let x2 = 1272;
                  let maxX2 = -1;
                  for (let x = 1200; x <= 1320; x++) {
                    const sum = getColSum(x);
                    if (sum > maxX2) { maxX2 = sum; x2 = x; }
                  }
                  
                  // Find right border x3 in range [2200, 2350]
                  let x3 = 2272;
                  let maxX3 = -1;
                  for (let x = 2200; x <= 2350; x++) {
                    const sum = getColSum(x);
                    if (sum > maxX3) { maxX3 = sum; x3 = x; }
                  }
                  
                  // Find top border y1 in range [2670, 2740] (in full coordinates)
                  let y1 = 2706;
                  let maxY1 = -1;
                  for (let y = 2670; y <= 2740; y++) {
                    const sum = getRowSum(y - startY);
                    if (sum > maxY1) { maxY1 = sum; y1 = y; }
                  }
                  
                  // Find bottom border y2 in range [3300, 3380] (in full coordinates)
                  let y2 = 3344;
                  let maxY2 = -1;
                  for (let y = 3300; y <= 3380; y++) {
                    const sum = getRowSum(y - startY);
                    if (sum > maxY2) { maxY2 = sum; y2 = y; }
                  }
                  
                  // Validation
                  const detectedWidthFront = x2 - x1;
                  const detectedWidthBack = x3 - x2;
                  const detectedHeight = y2 - y1;
                  
                  let finalX1 = x1, finalX2 = x2, finalX3 = x3;
                  let finalY1 = y1, finalY2 = y2;
                  let usedFallback = false;
                  
                  if (detectedWidthFront < 950 || detectedWidthFront > 1050 ||
                      detectedWidthBack < 950 || detectedWidthBack > 1050 ||
                      detectedHeight < 600 || detectedHeight > 660) {
                    finalX1 = 273;
                    finalX2 = 1272;
                    finalX3 = 2272;
                    finalY1 = 2706;
                    finalY2 = 3344;
                    usedFallback = true;
                  }
                  
                  const crop = (cx, cy, cw, ch) => {
                    const cropCanvas = document.getElementById('crop-canvas');
                    cropCanvas.width = cw;
                    cropCanvas.height = ch;
                    const cropCtx = cropCanvas.getContext('2d');
                    cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                    return cropCanvas.toDataURL('image/png');
                  };
                  
                  const frontCardBase64 = crop(finalX1, finalY1, finalX2 - finalX1, finalY2 - finalY1);
                  const backCardBase64 = crop(finalX2, finalY1, finalX3 - finalX2, finalY2 - finalY1);
                  
                  // If fallback is used, capture the failed regions and full page for debugging
                  let debugData = null;
                  if (usedFallback) {
                    // Crop attempted/failed detected regions for debugging
                    const failedFrontBase64 = crop(x1, y1, x2 - x1, y2 - y1);
                    const failedBackBase64 = crop(x2, y1, x3 - x2, y2 - y1);
                    const fullPageBase64 = canvas.toDataURL('image/png');
                    debugData = {
                      failedFrontBase64,
                      failedBackBase64,
                      fullPageBase64
                    };
                  }
                  
                  return {
                    frontCardBase64,
                    backCardBase64,
                    usedFallback,
                    debugData
                  };
                } catch (err) {
                  return { error: err.message };
                }
              };
              window.jsLoaded = true;
            </script>
          </body>
          </html>
        `;
        
        await page.setContent(htmlContent);
        await page.waitForFunction(() => (window as any).jsLoaded === true, { timeout: 15000 });
        
        const result = await page.evaluate(async (pdfStr, pwd) => {
          return await (window as any).renderAndCrop(pdfStr, pwd);
        }, base64Pdf, this.password);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        this.frontCardBase64 = result.frontCardBase64;
        this.backCardBase64 = result.backCardBase64;
        
        if (result.usedFallback) {
          console.warn('[PanParser] Card region detection failed. Falling back to default PAN coordinates and saving debug files...');
          
          if (result.debugData) {
            const saveFile = (b64: string, filename: string) => {
              try {
                const buffer = Buffer.from(b64.split(',')[1], 'base64');
                fs.writeFileSync(path.join('C:/Users/NANO/Downloads/', filename), buffer);
                console.log(`[PanParser] Saved debug file: ${filename}`);
              } catch (e: any) {
                console.error(`[PanParser] Failed to save debug file ${filename}:`, e.message);
              }
            };
            
            saveFile(result.debugData.fullPageBase64, 'full-page.png');
            saveFile(result.debugData.failedFrontBase64, 'detected-front-region.png');
            saveFile(result.debugData.failedBackBase64, 'detected-back-region.png');
          }
        } else {
          console.log('[PanParser] Card region dynamically detected and cropped successfully.');
        }

        // Save output crops to Downloads
        try {
          const frontBuf = Buffer.from(this.frontCardBase64!.split(',')[1], 'base64');
          fs.writeFileSync('C:/Users/NANO/Downloads/front.png', frontBuf);
          const backBuf = Buffer.from(this.backCardBase64!.split(',')[1], 'base64');
          fs.writeFileSync('C:/Users/NANO/Downloads/back.png', backBuf);
          console.log('[PanParser] Saved card output to Downloads/front.png and Downloads/back.png');
        } catch (e: any) {
          console.error('[PanParser] Failed to save output files:', e.message);
        }

      } finally {
        await browser.close();
      }
    } catch (err: any) {
      console.error('[PanParser] Error rendering and cropping PAN card:', err.message);
    }
  }

  async extractPhoto(): Promise<string | null> {
    await this.extractAssets();
    return null;
  }

  async extractQRCode(): Promise<string | null> {
    await this.extractAssets();
    return null;
  }

  async parse(): Promise<import('./BaseParser').ExtractedDocumentData> {
    const baseData = await super.parse();
    await this.extractAssets();
    return {
      ...baseData,
      frontCardBase64: this.frontCardBase64,
      backCardBase64: this.backCardBase64,
      photoBase64: null,
      qrBase64: null,
      signatureBase64: null
    };
  }
}
