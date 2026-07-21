import { BaseParser, ExtractedDocumentData } from './BaseParser';
import { getBrowser, getLocalScripts } from '@/utils/browserSingleton';

export class VoterParser extends BaseParser {
  private hasExtractedAssets = false;
  private frontCardBase64: string | null = null;
  private backCardBase64: string | null = null;
  private voterCropDebug: any = null;

  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'VOTER' | 'ABHA' | 'UNKNOWN' {
    return 'VOTER';
  }

  extractName(): string | null {
    // Elector's Name / નામ / નામ
    const match = this.rawText.match(/(?:Elector's Name|Name|નામ|નામ)[\s:]*([A-Za-z\s]+)/i);
    return match ? match[1].trim() : null;
  }

  extractFatherName(): string | null {
    // Father's Name / Husband's Name / પિતાનું નામ / પિતા કા નામ
    const match = this.rawText.match(/(?:Father's Name|Husband's Name|Father Name|Husband Name|પિતાનું નામ|પતિનું નામ|પિતા કા નામ)[\s:]*([A-Za-z\s]+)/i);
    return match ? match[1].trim() : null;
  }

  extractDOB(): string | null {
    // Date of Birth / Age / જન્મ તારીખ / ઉંમર
    const dobMatch = this.rawText.match(/(?:DOB|Date of Birth|જન્મ તારીખ|જન્મ તિથિ)[\s:]*([\d]{2}\/[\d]{2}\/[\d]{4})/i);
    if (dobMatch) return dobMatch[1].trim();

    const ageMatch = this.rawText.match(/(?:Age|ઉંમર|ઉમ્ર)[\s:]*(\d+)/i);
    return ageMatch ? ageMatch[1].trim() : null;
  }

  extractGender(): string | null {
    const match = this.rawText.match(/(Male|Female|Transgender|પુરુષ|સ્ત્રી|પુરુષ|મહિલા)/i);
    if (match) {
      const g = match[1].toLowerCase();
      if (g.includes('female') || g.includes('સ્ત્રી') || g.includes('મહિલા')) return 'FEMALE';
      if (g.includes('trans') || g.includes('ટ્રાન્સ')) return 'TRANSGENDER';
      return 'MALE';
    }
    return null;
  }

  extractDocumentNumber(): string | null {
    // EPIC Number: alphanumeric string, e.g. ABC1234567 or XYZ/123456/789
    const epicMatch = this.rawText.match(/\b([A-Z]{3}[0-9]{7}|[A-Z]{3}\/[0-9]{6}\/[0-9]{4})\b/i);
    return epicMatch ? epicMatch[0].toUpperCase() : null;
  }

  extractAddress(): string | null {
    // Address / સરનામું / પતા
    const addressMatch = this.rawText.match(/(?:Address|સરનામું|પતા)[\s:]+([\s\S]*?)(?=\b\d{6}\b|$)/i);
    const pinMatch = this.rawText.match(/(\d{6})/);
    if (addressMatch) {
      return addressMatch[1].trim() + (pinMatch ? ' ' + pinMatch[1] : '');
    }
    return null;
  }

  extractAssemblyConstituency(): string | null {
    const match = this.rawText.match(/(?:Assembly Constituency|No\. and Name of Assembly Constituency|વિધાનસભા મતવિસ્તાર)[\s:]*([^\n]+)/i);
    return match ? match[1].trim() : null;
  }

  private async extractAssets() {
    if (this.hasExtractedAssets) return;
    this.hasExtractedAssets = true;

    try {
      console.log('[VoterParser] Starting Voter card high-res rendering and region detection...');
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
                  
                  // 1. Detect rotation/tilt
                  // We scan from y=300 to y=500, a 200px band relative to page.
                  const initialImgData = context.getImageData(0, 300, width, 200);
                  const initialData = initialImgData.data;

                  const isDarkInitial = (x, y) => {
                    const localY = y - 300;
                    const idx = (localY * width + x) * 4;
                    return initialData[idx] < 140 && initialData[idx+1] < 140 && initialData[idx+2] < 140;
                  };

                  const findTopBorderAtX = (targetX) => {
                    let bestY = 394;
                    let maxCount = -1;
                    for (let y = 300; y <= 500; y++) {
                      let count = 0;
                      const startX = Math.max(0, targetX - 15);
                      const endX = Math.min(width - 1, targetX + 15);
                      for (let x = startX; x <= endX; x++) {
                        if (isDarkInitial(x, y)) count++;
                      }
                      if (count > maxCount) {
                        maxCount = count;
                        bestY = y;
                      }
                    }
                    return bestY;
                  };

                  const y_left = findTopBorderAtX(400);
                  const y_right = findTopBorderAtX(2000);
                  const angle = Math.atan2(y_right - y_left, 1600);

                  // Apply rotation correction if needed
                  if (Math.abs(angle) > 0.0001) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(canvas, 0, 0);
                    
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.save();
                    const centerX = width / 2;
                    const centerY = (y_left + y_right) / 2;
                    context.translate(centerX, centerY);
                    context.rotate(-angle);
                    context.translate(-centerX, -centerY);
                    context.drawImage(tempCanvas, 0, 0);
                    context.restore();
                  }

                  // 2. Scan corrected canvas for card borders
                  const scanStartY = 200;
                  const scanEndY = 1200;
                  const scanHeight = scanEndY - scanStartY;
                  const imgData = context.getImageData(0, scanStartY, width, scanHeight);
                  const data = imgData.data;

                  const isPixelDark = (x, y) => {
                    const localY = y - scanStartY;
                    if (localY < 0 || localY >= scanHeight || x < 0 || x >= width) return false;
                    const idx = (localY * width + x) * 4;
                    return data[idx] < 140 && data[idx+1] < 140 && data[idx+2] < 140;
                  };

                  // Find top border y1: search in [300, 500]
                  let y1 = 394;
                  let maxY1Sum = -1;
                  for (let y = 300; y <= 500; y++) {
                    let sum = 0;
                    for (let x = 100; x < width - 100; x++) {
                      if (isPixelDark(x, y)) sum++;
                    }
                    if (sum > maxY1Sum) {
                      maxY1Sum = sum;
                      y1 = y;
                    }
                  }

                  // Find bottom border y2: search in [y1 + 620, y1 + 670]
                  let y2 = y1 + 644;
                  let maxY2Sum = -1;
                  for (let y = y1 + 620; y <= y1 + 670; y++) {
                    let sum = 0;
                    for (let x = 100; x < width - 100; x++) {
                      if (isPixelDark(x, y)) sum++;
                    }
                    if (sum > maxY2Sum) {
                      maxY2Sum = sum;
                      y2 = y;
                    }
                  }

                  // Scan columns restricted to [y1 + 5, y2 - 5]
                  const vStartY = y1 + 5;
                  const vEndY = y2 - 5;
                  const getColSum = (x) => {
                    let sum = 0;
                    for (let y = vStartY; y <= vEndY; y++) {
                      if (isPixelDark(x, y)) sum++;
                    }
                    return sum;
                  };

                  // Front Left (fx1): search in [50, 300]
                  let fx1 = 133;
                  let maxFx1Sum = -1;
                  for (let x = 50; x <= 300; x++) {
                    const sum = getColSum(x);
                    if (sum > maxFx1Sum) {
                      maxFx1Sum = sum;
                      fx1 = x;
                    }
                  }

                  // Front Right (fx2): search in [1000, 1250]
                  let fx2 = 1157;
                  let maxFx2Sum = -1;
                  for (let x = 1000; x <= 1250; x++) {
                    const sum = getColSum(x);
                    if (sum > maxFx2Sum) {
                      maxFx2Sum = sum;
                      fx2 = x;
                    }
                  }

                  // Back Left (bx1): search in [1250, 1500]
                  let bx1 = 1361;
                  let maxBx1Sum = -1;
                  for (let x = 1250; x <= 1500; x++) {
                    const sum = getColSum(x);
                    if (sum > maxBx1Sum) {
                      maxBx1Sum = sum;
                      bx1 = x;
                    }
                  }

                  // Back Right (bx2): search in [2200, 2500]
                  let bx2 = 2385;
                  let maxBx2Sum = -1;
                  for (let x = 2200; x <= 2500; x++) {
                    const sum = getColSum(x);
                    if (sum > maxBx2Sum) {
                      maxBx2Sum = sum;
                      bx2 = x;
                    }
                  }

                  // Calculate detected dimensions
                  const frontW = fx2 - fx1;
                  const backW = bx2 - bx1;
                  const cardH = y2 - y1;

                  // Safety checks: fallback to defaults if bounds look wrong
                  let finalFx1 = fx1, finalFx2 = fx2, finalBx1 = bx1, finalBx2 = bx2;
                  let finalY1 = y1, finalY2 = y2;
                  let usedFallback = false;

                  if (frontW < 950 || frontW > 1100 || backW < 950 || backW > 1100 || cardH < 600 || cardH > 700) {
                    finalFx1 = 133;
                    finalFx2 = 1157;
                    finalBx1 = 1361;
                    finalBx2 = 2385;
                    finalY1 = 393;
                    finalY2 = 1039;
                    usedFallback = true;
                  }

                  // Outer margins addition: 2px expanded crop box to avoid trimming border lines
                  const cropFx1 = Math.max(0, finalFx1 - 2);
                  const cropFx2 = Math.min(width, finalFx2 + 2);
                  const cropBx1 = Math.max(0, finalBx1 - 2);
                  const cropBx2 = Math.min(width, finalBx2 + 2);
                  const cropY1 = Math.max(0, finalY1 - 2);
                  const cropY2 = Math.min(height, finalY2 + 2);

                  const cw_front = cropFx2 - cropFx1;
                  const cw_back = cropBx2 - cropBx1;
                  const ch_card = cropY2 - cropY1;

                  const crop = (cx, cy, cw, ch) => {
                    const cropCanvas = document.getElementById('crop-canvas');
                    cropCanvas.width = cw;
                    cropCanvas.height = ch;
                    const cropCtx = cropCanvas.getContext('2d');
                    cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                    return cropCanvas.toDataURL('image/png');
                  };

                  const frontCardBase64 = crop(cropFx1, cropY1, cw_front, ch_card);
                  const backCardBase64 = crop(cropBx1, cropY1, cw_back, ch_card);

                  // 3. Verify card border presence at the exact edges of the cropped image
                  const verifyBorder = (cx, cy, cw, ch) => {
                    const testImgData = context.getImageData(cx, cy, cw, ch);
                    const testData = testImgData.data;
                    
                    const isPxDark = (tx, ty) => {
                      const idx = (ty * cw + tx) * 4;
                      return testData[idx] < 150 && testData[idx+1] < 150 && testData[idx+2] < 150;
                    };
                    
                    let topOk = false;
                    for (let ty = 0; ty < Math.min(4, ch); ty++) {
                      let darkCount = 0;
                      for (let tx = 0; tx < cw; tx++) {
                        if (isPxDark(tx, ty)) darkCount++;
                      }
                      if (darkCount > cw * 0.3) { topOk = true; break; }
                    }
                    
                    let bottomOk = false;
                    for (let ty = ch - 1; ty >= Math.max(0, ch - 4); ty--) {
                      let darkCount = 0;
                      for (let tx = 0; tx < cw; tx++) {
                        if (isPxDark(tx, ty)) darkCount++;
                      }
                      if (darkCount > cw * 0.3) { bottomOk = true; break; }
                    }
                    
                    let leftOk = false;
                    for (let tx = 0; tx < Math.min(4, cw); tx++) {
                      let darkCount = 0;
                      for (let ty = 0; ty < ch; ty++) {
                        if (isPxDark(tx, ty)) darkCount++;
                      }
                      if (darkCount > ch * 0.3) { leftOk = true; break; }
                    }
                    
                    let rightOk = false;
                    for (let tx = cw - 1; tx >= Math.max(0, cw - 4); tx--) {
                      let darkCount = 0;
                      for (let ty = 0; ty < ch; ty++) {
                        if (isPxDark(tx, ty)) darkCount++;
                      }
                      if (darkCount > ch * 0.3) { rightOk = true; break; }
                    }
                    
                    return topOk && bottomOk && leftOk && rightOk;
                  };

                  const frontBorderIntact = verifyBorder(cropFx1, cropY1, cw_front, ch_card);
                  const backBorderIntact = verifyBorder(cropBx1, cropY1, cw_back, ch_card);

                  // Extraction is FAILED if either card border is missing/clipped (more than 2 pixels of border missing)
                  const cropStatus = (frontBorderIntact && backBorderIntact) ? 'SUCCESS' : 'FAILED';

                  const angleDegrees = (angle * 180) / Math.PI;

                  return {
                    frontCardBase64,
                    backCardBase64,
                    usedFallback,
                    cropDebug: {
                      detectedRectangle: "Front: [" + finalFx1 + ", " + finalY1 + "] to [" + finalFx2 + ", " + finalY2 + "], Back: [" + finalBx1 + ", " + finalY1 + "] to [" + finalBx2 + ", " + finalY2 + "]",
                      originalSize: "Front: " + frontW + "x" + cardH + ", Back: " + backW + "x" + cardH,
                      exportSize: "Front: " + cw_front + "x" + ch_card + ", Back: " + cw_back + "x" + ch_card,
                      aspectRatio: "Front: " + (frontW / cardH).toFixed(3) + ", Back: " + (backW / cardH).toFixed(3),
                      scalePercent: "Front: " + ((1013 / frontW) * 100).toFixed(1) + "%, Back: " + ((1013 / backW) * 100).toFixed(1) + "%",
                      rotationAngle: angleDegrees.toFixed(3) + " deg",
                      status: cropStatus
                    }
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
        this.voterCropDebug = result.cropDebug;
        
        if (result.usedFallback) {
          console.warn('[VoterParser] Voter card border detection failed. Falling back to default layout coordinates.');
        } else {
          console.log('[VoterParser] Voter card borders dynamically detected and cropped.');
        }
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      console.error('[VoterParser] Error rendering/cropping Voter card PDF:', err.message);
    }
  }

  async parse(): Promise<ExtractedDocumentData> {
    const baseData = await super.parse();
    await this.extractAssets();
    return {
      ...baseData,
      fatherName: this.extractFatherName(),
      fatherNameLocal: '',
      assemblyConstituency: this.extractAssemblyConstituency(),
      localName: '',
      localAddress: '',
      frontCardBase64: this.frontCardBase64,
      backCardBase64: this.backCardBase64,
      voterCropDebug: this.voterCropDebug
    };
  }
}
