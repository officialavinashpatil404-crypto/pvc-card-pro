import { BaseParser } from './BaseParser';
import * as fs from 'fs';
import * as path from 'path';
import { getBrowser, getLocalScripts } from '@/utils/browserSingleton';

export class AbhaParser extends BaseParser {
  private hasExtractedAssets = false;
  private frontCardBase64: string | null = null;
  private backCardBase64: string | null = null;
  private abhaCropError: string | null = null;

  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'VOTER' | 'ABHA' | 'UNKNOWN' {
    return 'ABHA';
  }

  extractName(): string | null {
    // Search for Name label in English or other common patterns
    const nameMatch = this.rawText.match(/(?:Name of Health ID Holder|Name of Holder|Name|नाम|નામ)[\s:]*([A-Za-z .]{3,40})/i) ||
                      this.rawText.match(/([A-Z][A-Z .]+)\s+Gender/i);
    return nameMatch ? nameMatch[1].trim() : null;
  }

  extractDOB(): string | null {
    const dobMatch = this.rawText.match(/(?:DOB|Date of Birth|જન્મ તારીખ|जन्म तिथि)[\s:]*([\d]{2}\/[\d]{2}\/[\d]{4})/i) ||
                     this.rawText.match(/([\d]{2}\/[\d]{2}\/[\d]{4})/);
    return dobMatch ? dobMatch[1].trim() : null;
  }

  extractGender(): string | null {
    const genderMatch = this.rawText.match(/(Male|Female|Transgender|પુરુષ|સ્ત્રી|पुरुष|महिला)/i);
    if (genderMatch) {
      const g = genderMatch[1].toUpperCase();
      if (g.includes('FEMALE') || g.includes('સ્ત્રી') || g.includes('महिला')) return 'FEMALE';
      if (g.includes('TRANS') || g.includes('ટ્રાન્સ')) return 'TRANSGENDER';
      return 'MALE';
    }
    return null;
  }

  extractDocumentNumber(): string | null {
    // ABHA number is 14 digits, typically formatted as XX-XXXX-XXXX-XXXX
    const abhaMatch = this.rawText.match(/\b\d{2}-\d{4}-\d{4}-\d{4}\b/) ||
                      this.rawText.match(/\b\d{14}\b/);
    return abhaMatch ? abhaMatch[0].trim() : null;
  }

  extractAddress(): string | null {
    // ABHA cards may display ABHA address / Health ID, e.g., username@abdm
    const addressMatch = this.rawText.match(/\b[a-zA-Z0-9._%+-]+@abdm\b/i);
    return addressMatch ? addressMatch[0].trim() : null;
  }

  private async extractAssets() {
    if (this.hasExtractedAssets) return;
    this.hasExtractedAssets = true;

    try {
      console.log('[AbhaParser] Starting ABHA card high-res rendering and region detection...');
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
                  
                  // Render at 300 DPI 
                  const viewport = pageObj.getViewport({ scale: 4.167 }); 
                  const canvas = document.getElementById('pdf-canvas');
                  const context = canvas.getContext('2d');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  
                  context.fillStyle = '#ffffff';
                  context.fillRect(0, 0, canvas.width, canvas.height);
                  await pageObj.render({ canvasContext: context, viewport }).promise;
                  
                  const width = canvas.width;
                  const height = canvas.height;
                  const imgData = context.getImageData(0, 0, width, height);
                  const data = imgData.data;
                  
                  // ABHA Navy Blue Header Detection
                  // Color is typically ~ rgb(26, 55, 141)
                  const isNavyBlue = (r, g, b) => {
                      return r < 80 && g < 100 && b > 100 && b > r + 30 && b > g + 30;
                  };
                  
                  let blueRows = new Uint8Array(height);
                  for (let y = 0; y < height; y++) {
                      let blueCount = 0;
                      // Sample every 4th pixel for speed
                      for (let x = 0; x < width; x += 4) {
                          let idx = (y * width + x) * 4;
                          if (isNavyBlue(data[idx], data[idx+1], data[idx+2])) {
                              blueCount++;
                          }
                      }
                      // If > 10% of the sampled width is navy blue, it's a header row
                      if (blueCount > (width / 4) * 0.1) {
                          blueRows[y] = 1;
                      }
                  }
                  
                  // Find continuous blocks of blue rows
                  let headerYRanges = [];
                  let inHeader = false;
                  let startY = 0;
                  for (let y = 0; y < height; y++) {
                      if (blueRows[y] && !inHeader) {
                          inHeader = true;
                          startY = y;
                      } else if (!blueRows[y] && inHeader) {
                          inHeader = false;
                          // A valid header at 300 DPI should be at least 30px tall
                          if (y - startY > 30) {
                              headerYRanges.push({ top: startY, bottom: y });
                          }
                      }
                  }
                  
                  if (headerYRanges.length < 2) {
                      return { error: 'Card region not detected. (Could not find two distinct Navy Blue ABHA headers).' };
                  }
                  
                  // Find the exact X bounds for the top two headers
                  for (let i = 0; i < 2; i++) {
                      let range = headerYRanges[i];
                      let minX = width;
                      let maxX = 0;
                      for (let y = range.top; y < range.bottom; y += 2) {
                          for (let x = 0; x < width; x++) {
                              let idx = (y * width + x) * 4;
                              if (isNavyBlue(data[idx], data[idx+1], data[idx+2])) {
                                  if (x < minX) minX = x;
                                  if (x > maxX) maxX = x;
                              }
                          }
                      }
                      range.left = minX;
                      range.right = maxX;
                      range.width = maxX - minX;
                  }
                  
                  let frontHeader = headerYRanges[0];
                  let backHeader = headerYRanges[1];
                  
                  // Draw Debug Rectangles on original canvas
                  context.lineWidth = 4;
                  context.strokeStyle = 'red';
                  context.strokeRect(frontHeader.left, frontHeader.top, frontHeader.width, frontHeader.bottom - frontHeader.top);
                  context.strokeRect(backHeader.left, backHeader.top, backHeader.width, backHeader.bottom - backHeader.top);
                  
                  const CR80_RATIO = 1.586;
                  
                  const processCard = (headerInfo) => {
                      let cw = headerInfo.width;
                      // Calculate mathematically exact CR80 height based on the blue header's width
                      let ch = Math.round(cw / CR80_RATIO);
                      
                      let cx = headerInfo.left;
                      let cy = headerInfo.top;
                      
                      // Draw bounding box for the full card on debug canvas
                      context.strokeStyle = 'green';
                      context.strokeRect(cx, cy, cw, ch);
                      
                      let tempCanvas = document.createElement('canvas');
                      tempCanvas.width = cw;
                      tempCanvas.height = ch;
                      let tempCtx = tempCanvas.getContext('2d');
                      
                      tempCtx.fillStyle = '#ffffff';
                      tempCtx.fillRect(0, 0, cw, ch);
                      tempCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                      
                      // Export to 1500x945 pure white canvas
                      let cr80Canvas = document.createElement('canvas');
                      cr80Canvas.width = 1500;
                      cr80Canvas.height = 945;
                      let ctx = cr80Canvas.getContext('2d');
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, 1500, 945);
                      
                      let margin = 5;
                      let safeW = 1500 - margin * 2;
                      let safeH = 945 - margin * 2;
                      let scale = Math.min(safeW / cw, safeH / ch);
                      
                      let drawW = cw * scale;
                      let drawH = ch * scale;
                      let drawX = (1500 - drawW) / 2;
                      let drawY = (945 - drawH) / 2;
                      
                      ctx.imageSmoothingEnabled = true;
                      ctx.imageSmoothingQuality = 'high';
                      ctx.drawImage(tempCanvas, 0, 0, cw, ch, drawX, drawY, drawW, drawH);
                      
                      return cr80Canvas.toDataURL('image/png', 1.0);
                  };
                  
                  const frontCardBase64 = processCard(frontHeader);
                  const backCardBase64 = processCard(backHeader);
                  
                  return {
                    frontCardBase64,
                    backCardBase64,
                    pageRenderBase64: canvas.toDataURL('image/jpeg', 0.5)
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
          this.abhaCropError = result.error;
          console.error('[AbhaParser] Extraction error from browser context:', result.error);
        } else {
          this.frontCardBase64 = result.frontCardBase64;
          this.backCardBase64 = result.backCardBase64;
          console.log('[AbhaParser] ABHA card borders dynamically detected and cropped.');
          
          // Save debug files (dev mode only)
          if (process.env.NODE_ENV !== 'production') {
            try {
              const saveBase64Image = (base64Str: string, filename: string) => {
                if (!base64Str) return;
                const base64Data = base64Str.replace(/^data:image\/png;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const projPath = path.join(process.cwd(), filename);
                fs.writeFileSync(projPath, buffer);
              };
              
              saveBase64Image(result.pageRenderBase64, 'page-render.png');
              saveBase64Image(result.frontCardBase64, 'front-detected.png');
              saveBase64Image(result.frontCardBase64, 'front-final.png');
              saveBase64Image(result.backCardBase64, 'back-detected.png');
              saveBase64Image(result.backCardBase64, 'back-final.png');
              
              console.log('[AbhaParser] Debug images saved successfully.');
            } catch (saveErr: any) {
              console.error('[AbhaParser] Failed to save debug images:', saveErr.message);
            }
          }
        }
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      this.abhaCropError = err.message;
      console.error('[AbhaParser] Error rendering/cropping ABHA card PDF:', err.message);
    }
  }

  async parse(): Promise<import('./BaseParser').ExtractedDocumentData> {
    const baseData = await super.parse();
    await this.extractAssets();
    return {
      ...baseData,
      frontCardBase64: this.frontCardBase64,
      backCardBase64: this.backCardBase64,
      abhaCropError: this.abhaCropError,
      photoBase64: null,
      qrBase64: null,
      signatureBase64: null
    };
  }
}
