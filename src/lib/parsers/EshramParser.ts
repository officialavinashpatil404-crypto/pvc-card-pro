import { BaseParser, ExtractedDocumentData } from './BaseParser';
import { getBrowser, getLocalScripts } from '@/utils/browserSingleton';

export class EshramParser extends BaseParser {
  private hasExtractedAssets = false;
  private frontCardBase64: string | null = null;
  private backCardBase64: string | null = null;

  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'UNKNOWN' {
    return 'ESHRAM';
  }

  extractName(): string | null {
    const nameMatch = this.rawText.match(/Name\s*[:\s]*([A-Z\s.]+)/i);
    return nameMatch ? nameMatch[1].trim() : null;
  }

  extractDOB(): string | null {
    const dobMatch = this.rawText.match(/(?:DOB|Date of Birth)[\s:]*([\d]{2}\/[\d]{2}\/[\d]{4})/i);
    return dobMatch ? dobMatch[1].trim() : null;
  }

  extractGender(): string | null {
    const genderMatch = this.rawText.match(/(Male|Female|Transgender)/i);
    return genderMatch ? genderMatch[1].trim() : null;
  }

  extractDocumentNumber(): string | null {
    const uanMatch = this.rawText.match(/\b\d{12}\b/);
    return uanMatch ? uanMatch[0].trim() : null;
  }

  extractAddress(): string | null {
    const addressMatch = this.rawText.match(/Address[\s:]+([\s\S]*?)(?=\b\d{6}\b|$)/i);
    const pinMatch = this.rawText.match(/(\d{6})/);
    if (addressMatch) {
      return addressMatch[1].trim() + (pinMatch ? ' ' + pinMatch[1] : '');
    }
    return null;
  }

  extractMobile(): string | null {
    const mobMatch = this.rawText.match(/(?:Mobile|Mob|Phone)[\s:]*([6-9]\d{9})/i);
    return mobMatch ? mobMatch[1].trim() : null;
  }

  private async extractAssets() {
    if (this.hasExtractedAssets) return;
    this.hasExtractedAssets = true;

    try {
      console.log('[EshramParser] Starting e-Shram card crop...');
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
          <!DOCTYPE html><html><head>${scriptTag}</head>
          <body>
            <canvas id="pdf-canvas"></canvas>
            <canvas id="crop-canvas"></canvas>
            <script>
              ${workerSetup}

              // Standard PVC card aspect ratio: 85.6mm x 54mm = 1.5852
              const PVC_RATIO = 1013 / 638;

              window.renderAndCrop = async function(base64Str, pwd) {
                try {
                  const pdfData = atob(base64Str);
                  const uint8Array = new Uint8Array(pdfData.length);
                  for (let i = 0; i < pdfData.length; i++) uint8Array[i] = pdfData.charCodeAt(i);

                  const loadingTask = pdfjsLib.getDocument({ data: uint8Array, password: pwd || undefined });
                  const pdf = await loadingTask.promise;
                  const pageObj = await pdf.getPage(1);

                  // HIGH resolution for quality output
                  const viewport = pageObj.getViewport({ scale: 4.167 });
                  const canvas = document.getElementById('pdf-canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  await pageObj.render({ canvasContext: ctx, viewport }).promise;

                  const W = canvas.width;
                  const H = canvas.height;

                  // --- Scan rows for non-white pixel count ---
                  // Sample every 4 pixels for speed
                  const STEP = 4;
                  const rowCounts = new Uint32Array(H);
                  const imgData = ctx.getImageData(0, 0, W, H);
                  const data = imgData.data;

                  for (let y = 0; y < H; y += STEP) {
                    let count = 0;
                    for (let x = 30; x < W - 30; x += STEP) {
                      const i = (y * W + x) * 4;
                      if (data[i] < 230 || data[i+1] < 230 || data[i+2] < 230) count++;
                    }
                    for (let dy = 0; dy < STEP && y + dy < H; dy++) {
                      rowCounts[y + dy] = count;
                    }
                  }

                  // --- Find card blocks: rows with content separated by white gaps ---
                  const MIN_CONTENT_ROWS = 100; // minimum block height in px
                  const GAP_ROWS = 20;          // gap rows to consider block ended

                  let blocks = [];
                  let inBlock = false, blockStart = 0, gapCount = 0;
                  const THRESHOLD = 20;

                  for (let y = 0; y < Math.floor(H * 0.75); y++) {
                    if (rowCounts[y] > THRESHOLD) {
                      if (!inBlock) { inBlock = true; blockStart = y; gapCount = 0; }
                      else gapCount = 0;
                    } else {
                      if (inBlock) {
                        gapCount++;
                        if (gapCount > GAP_ROWS) {
                          const blockH = y - gapCount - blockStart;
                          if (blockH > MIN_CONTENT_ROWS) {
                            blocks.push({ top: blockStart, bottom: y - gapCount });
                          }
                          inBlock = false;
                        }
                      }
                    }
                  }
                  if (inBlock) {
                    const blockH = Math.floor(H * 0.75) - blockStart;
                    if (blockH > MIN_CONTENT_ROWS) {
                      blocks.push({ top: blockStart, bottom: Math.floor(H * 0.75) });
                    }
                  }

                  // --- For each block, find exact left/right bounds, then derive height from PVC ratio ---
                  const crop = (cx, cy, cw, ch) => {
                    cx = Math.max(0, Math.round(cx));
                    cy = Math.max(0, Math.round(cy));
                    cw = Math.min(W - cx, Math.round(cw));
                    ch = Math.min(H - cy, Math.round(ch));
                    const cc = document.getElementById('crop-canvas');
                    cc.width = cw; cc.height = ch;
                    cc.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                    return cc.toDataURL('image/jpeg', 0.92);
                  };

                  const processBlock = (block, isBack = false) => {
                    let minX = W, maxX = 0;
                    for (let y = block.top; y <= block.bottom; y += 4) {
                      for (let x = 30; x < W - 30; x += 2) {
                        const i = (y * W + x) * 4;
                        if (data[i] < 230 || data[i+1] < 230 || data[i+2] < 230) {
                          if (x < minX) minX = x;
                          if (x > maxX) maxX = x;
                        }
                      }
                    }

                    if (maxX <= minX) { minX = 200; maxX = W - 200; }

                    const cropW = (maxX - minX) + 12;
                    const cropH = Math.round(cropW / PVC_RATIO);

                    const detectedH = block.bottom - block.top;
                    const paddingY = Math.max(0, cropH - detectedH);

                    // Front card: 0.48 top ratio (untouched) / Back card: 0.82 top ratio (shifts crop up to align bottom edge to card border)
                    const topRatio = isBack ? 0.82 : 0.48;
                    const cropY = Math.max(0, block.top - Math.round(paddingY * topRatio));
                    const centerX = Math.round((minX + maxX) / 2);
                    const cropX = Math.max(0, centerX - Math.round(cropW / 2));

                    return crop(cropX, cropY, cropW, cropH);
                  };

                  let frontCardBase64 = null;
                  let backCardBase64 = null;

                  if (blocks.length >= 2) {
                    frontCardBase64 = processBlock(blocks[0], false);
                    backCardBase64 = processBlock(blocks[1], true);
                  } else if (blocks.length === 1) {
                    // Only one block found — try splitting it in half
                    const b = blocks[0];
                    const mid = Math.round((b.top + b.bottom) / 2);
                    frontCardBase64 = processBlock({ top: b.top, bottom: mid }, false);
                    backCardBase64  = processBlock({ top: mid, bottom: b.bottom }, true);
                  } else {
                    // No blocks detected — use calibrated fallback positions for standard e-Shram PDF
                    // A4 at 300DPI (4.167 scale): ~2480 x 3508px, cards centered
                    const cw = Math.round(W * 0.405);
                    const ch = Math.round(cw / PVC_RATIO);
                    const cx = Math.round((W - cw) / 2);
                    const cy1 = Math.round(H * 0.065);
                    const cy2 = cy1 + ch + Math.round(H * 0.015);
                    frontCardBase64 = crop(cx, cy1, cw, ch);
                    backCardBase64  = crop(cx, cy2, cw, ch);
                  }

                  return { frontCardBase64, backCardBase64 };
                } catch (err) {
                  return { error: err.message };
                }
              };
              window.jsLoaded = true;
            </script>
          </body></html>
        `;

        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForFunction(() => (window as any).jsLoaded === true, { timeout: 25000 });

        const result = await page.evaluate(async (pdfStr, pwdStr) => {
          return await (window as any).renderAndCrop(pdfStr, pwdStr);
        }, base64Pdf, this.password || '');

        if (result && !result.error) {
          this.frontCardBase64 = result.frontCardBase64 || null;
          this.backCardBase64 = result.backCardBase64 || null;
          console.log('[EshramParser] e-Shram card cropped successfully.');
        } else if (result?.error) {
          console.warn('[EshramParser] e-Shram crop warning:', result.error);
        }
      } finally {
        await browser.close();
      }
    } catch (err: any) {
      console.error('[EshramParser] Error rendering e-Shram card:', err.message);
    }
  }

  async parse(): Promise<ExtractedDocumentData> {
    await this.extractAssets();
    return {
      documentType: this.getDocumentType(),
      name: this.extractName(),
      dob: this.extractDOB(),
      gender: this.extractGender(),
      documentNumber: this.extractDocumentNumber(),
      address: this.extractAddress(),
      photoBase64: await this.extractPhoto(),
      qrBase64: await this.extractQRCode(),
      mobile: this.extractMobile(),
      frontCardBase64: this.frontCardBase64,
      backCardBase64: this.backCardBase64,
      rawText: this.rawText,
    };
  }
}
