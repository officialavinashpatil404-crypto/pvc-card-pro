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
    const match = this.rawText.match(/(?:Elector's Name|Name|નામ|નામ)[\s:]*([A-Za-z\s]+)/i);
    return match ? match[1].trim() : null;
  }

  extractFatherName(): string | null {
    const match = this.rawText.match(/(?:Father's Name|Husband's Name|Father Name|Husband Name|પિતાનું નામ|પતિનું નામ|પિતા કા નામ)[\s:]*([A-Za-z\s]+)/i);
    return match ? match[1].trim() : null;
  }

  extractDOB(): string | null {
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
    const epicMatch = this.rawText.match(/\b([A-Z]{3}[0-9]{7}|[A-Z]{3}\/[0-9]{6}\/[0-9]{4})\b/i);
    return epicMatch ? epicMatch[0].toUpperCase() : null;
  }

  extractAddress(): string | null {
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
      console.log('[VoterParser] Starting voter card rendering and content-boundary detection...');
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
          <head>${scriptTag}</head>
          <body>
            <canvas id="pdf-canvas"></canvas>
            <canvas id="crop-canvas"></canvas>
            <script>
              ${workerSetup}

              window.renderAndCrop = async function(base64Str, pwd) {
                try {
                  const pdfData = atob(base64Str);
                  const uint8Array = new Uint8Array(pdfData.length);
                  for (let i = 0; i < pdfData.length; i++) uint8Array[i] = pdfData.charCodeAt(i);

                  const pdf = await pdfjsLib.getDocument({ data: uint8Array, password: pwd || undefined }).promise;
                  const pageObj = await pdf.getPage(1);

                  const viewport = pageObj.getViewport({ scale: 4.167 }); // 300 DPI
                  const canvas = document.getElementById('pdf-canvas');
                  const ctx = canvas.getContext('2d');
                  canvas.width  = viewport.width;
                  canvas.height = viewport.height;
                  await pageObj.render({ canvasContext: ctx, viewport }).promise;

                  const W = canvas.width;
                  const H = canvas.height;

                  // ─────────────────────────────────────────────────────────────
                  // STRICTLY FROZEN: HIGH-PRECISION VOTER PVC CARD EXTRACTION
                  // DO NOT MODIFY THIS ALGORITHM. IT IS CALIBRATED FOR EXACT
                  // FULL-BLEED EDGE-TO-EDGE PVC CARD FITTING WITH ZERO WHITE MARGINS.
                  // ─────────────────────────────────────────────────────────────

                  const getDensity = (x1, y1, w, h, thresholdVal = 235) => {
                    if (w <= 0 || h <= 0) return 0;
                    const rx1 = Math.max(0, Math.floor(x1));
                    const ry1 = Math.max(0, Math.floor(y1));
                    const rw  = Math.min(w, W - rx1);
                    const rh  = Math.min(h, H - ry1);
                    if (rw <= 0 || rh <= 0) return 0;

                    const d = ctx.getImageData(rx1, ry1, rw, rh).data;
                    let darkCount = 0;
                    for (let i = 0; i < d.length; i += 4) {
                      if (d[i] < thresholdVal || d[i+1] < thresholdVal || d[i+2] < thresholdVal) {
                        darkCount++;
                      }
                    }
                    return darkCount / (rw * rh);
                  };

                  // 1. Detect inner top edge (cardY1) of the actual Voter Card Box
                  // Page header text sits at Y ~ 200..260px.
                  // The card box top outer border sits at Y ~ 348px.
                  // Inset cardY1 by +5px (Y ~ 354px) to crop INSIDE the card box (bypassing outer black border line).
                  let cardY1 = -1;
                  const scanStart = Math.floor(H * 0.085); // ~298px
                  const scanEnd   = Math.floor(H * 0.145); // ~508px

                  for (let y = scanStart; y < scanEnd; y += 2) {
                    const den = getDensity(Math.floor(W * 0.08), y, Math.floor(W * 0.36), 3);
                    if (den >= 0.045) {
                      cardY1 = y + 5; // 5px inset inside top border line
                      break;
                    }
                  }

                  if (cardY1 < Math.floor(H * 0.088) || cardY1 > Math.floor(H * 0.140)) {
                    cardY1 = Math.round(H * 0.101); // ~354px fallback (exact inner card box top)
                  }

                  // 2. Inner Voter Card Artwork Dimensions on e-EPIC PDF (300 DPI)
                  // Aspect ratio strictly matches PVC Card Canvas (638 / 1013 = 0.6298124)
                  // Inner Artwork spans ~1062px width x ~669px height (ending exactly at the bottom of blue/orange strip, 0 white patti)
                  const PVC_ASPECT_RATIO = 638 / 1013; // 0.6298124
                  const EXPECTED_CARD_W = Math.round(W * 0.428); // ~1062px
                  const EXPECTED_CARD_H = Math.round(EXPECTED_CARD_W * PVC_ASPECT_RATIO); // ~669px

                  // 3. Front Card Inner X Extent (Left Half: X from ~134px to ~1196px)
                  let fx1 = -1, fx2 = -1;
                  for (let x = Math.floor(W * 0.04); x < Math.floor(W * 0.20); x += 2) {
                    if (getDensity(x, cardY1 + 10, 2, EXPECTED_CARD_H - 20) >= 0.02) {
                      fx1 = x + 4; // inset past left outer line
                      break;
                    }
                  }
                  for (let x = Math.floor(W * 0.49); x > Math.floor(W * 0.35); x -= 2) {
                    if (getDensity(x, cardY1 + 10, 2, EXPECTED_CARD_H - 20) >= 0.02) {
                      fx2 = x - 4; // inset inside right outer line
                      break;
                    }
                  }

                  if (fx1 < 0 || fx2 < 0 || (fx2 - fx1) < Math.floor(W * 0.35) || (fx2 - fx1) > Math.floor(W * 0.50)) {
                    fx1 = Math.round(W * 0.0540); // ~134px
                    fx2 = Math.round(W * 0.4820); // ~1196px
                  }

                  // 4. Back Card Inner X Extent (Right Half: X from ~1284px to ~2346px)
                  // Start search past X = 1270px to skip scissor line and outer border line
                  let bx1 = -1, bx2 = -1;
                  for (let x = Math.floor(W * 0.512); x < Math.floor(W * 0.65); x += 2) {
                    if (getDensity(x, cardY1 + 10, 2, EXPECTED_CARD_H - 20) >= 0.02) {
                      bx1 = x + 4; // inset past left outer line
                      break;
                    }
                  }
                  for (let x = W - Math.floor(W * 0.03); x > Math.floor(W * 0.82); x -= 2) {
                    if (getDensity(x, cardY1 + 10, 2, EXPECTED_CARD_H - 20) >= 0.02) {
                      bx2 = x - 4; // inset inside right outer line
                      break;
                    }
                  }

                  if (bx1 < 0 || bx2 < 0 || (bx2 - bx1) < Math.floor(W * 0.35) || (bx2 - bx1) > Math.floor(W * 0.50)) {
                    bx1 = Math.round(W * 0.5178); // ~1284px
                    bx2 = Math.round(W * 0.9460); // ~2346px
                  }

                  // 5. Final inner dimensions & full-bleed PVC crop (0 white patti)
                  const frontW = fx2 - fx1;
                  const frontH = Math.round(frontW * PVC_ASPECT_RATIO);
                  const backW  = bx2 - bx1;
                  const backH  = Math.round(backW * PVC_ASPECT_RATIO);

                  const PVC_W = 1013, PVC_H = 638;
                  const crop = (cx, cy, cw, ch) => {
                    const cc = document.getElementById('crop-canvas');
                    cc.width = PVC_W;
                    cc.height = PVC_H;
                    const c2 = cc.getContext('2d');
                    c2.imageSmoothingEnabled = true;
                    c2.imageSmoothingQuality = 'high';
                    c2.drawImage(canvas, cx, cy, cw, ch, 0, 0, PVC_W, PVC_H);
                    return cc.toDataURL('image/jpeg', 0.96);
                  };

                  const frontCardBase64 = crop(fx1, cardY1, frontW, frontH);
                  const backCardBase64  = crop(bx1, cardY1, backW, backH);

                  return {
                    frontCardBase64,
                    backCardBase64,
                    usedFallback: false,
                    cropDebug: {
                      detectedRectangle:
                        'Front:[' + fx1 + ',' + cardY1 + ']->[' + fx2 + ',' + (cardY1 + frontH) + '] ' +
                        'Back:['  + bx1 + ',' + cardY1 + ']->[' + bx2 + ',' + (cardY1 + backH) + ']',
                      originalSize: W + 'x' + H,
                      exportSize:
                        'Front:' + frontW + 'x' + frontH +
                        ' Back:' + backW + 'x' + backH,
                      status: 'SUCCESS'
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

        if (result.error) throw new Error(result.error);

        this.frontCardBase64 = result.frontCardBase64;
        this.backCardBase64  = result.backCardBase64;
        this.voterCropDebug  = result.cropDebug;

        console.log('[VoterParser] Voter card detected:', result.cropDebug?.detectedRectangle);
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
      backCardBase64:  this.backCardBase64,
      voterCropDebug:  this.voterCropDebug
    };
  }
}
