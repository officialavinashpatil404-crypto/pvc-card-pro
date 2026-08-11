import { getBrowser, getLocalScripts } from '@/utils/browserSingleton';

export interface CroppedAssets {
  frontHeader: string;
  frontWarning: string;
  frontFooter: string;
  frontLeftStrip: string;
  backHeader: string;
  backFooter: string;
  backLeftStrip: string;
  backQRCode: string;
  frontCardFull?: string;
  backCardFull?: string;
}

/**
 * Renders the first page of the decrypted PDF inside Puppeteer and crops key visual regions.
 */
export async function cropAadhaarRegions(decryptedPdfBase64: string): Promise<CroppedAssets> {
  const browser = await getBrowser();
  const { pdfjs, pdfjsWorkerBase64 } = getLocalScripts();

  try {
    const page = await browser.newPage();

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
        <style>
          body { margin: 0; padding: 0; background: #fff; }
          #pdf-canvas { display: block; }
        </style>
      </head>
      <body>
        <canvas id="pdf-canvas"></canvas>
        <canvas id="crop-canvas"></canvas>
        <script>
          ${workerSetup}
          
          window.renderAndCrop = async function(base64Pdf) {
            try {
              const pdfData = atob(base64Pdf);
              const uint8Array = new Uint8Array(pdfData.length);
              for (let i = 0; i < pdfData.length; i++) {
                uint8Array[i] = pdfData.charCodeAt(i);
              }
              
              const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
              const pdf = await loadingTask.promise;
              const page = await pdf.getPage(1);
              
              const renderScale = 2; // 2x resolution for 75% faster rendering
              const s = renderScale / 4; // Scale ratio relative to legacy 4x baseline
              
              const viewport = page.getViewport({ scale: renderScale });
              const canvas = document.getElementById('pdf-canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({ canvasContext: context, viewport }).promise;
              
              // Helper function to crop sub-regions from rendered page canvas
              const crop = (x, y, w, h) => {
                const cropCanvas = document.getElementById('crop-canvas');
                cropCanvas.width = Math.round(w);
                cropCanvas.height = Math.round(h);
                const cropCtx = cropCanvas.getContext('2d');
                cropCtx.drawImage(canvas, Math.round(x), Math.round(y), Math.round(w), Math.round(h), 0, 0, Math.round(w), Math.round(h));
                return cropCanvas.toDataURL('image/png');
              };

              // Dynamic Card Coordinates Scanner inside rendered page canvas
              const width = canvas.width;
              const height = canvas.height;
              
              // We scan the bottom portion of the canvas where the cards are located
              const startY = Math.floor(height * 0.6);
              const imgData = context.getImageData(0, startY, width, height - startY);
              const data = imgData.data;
              
              const saffronPixels = [];
              for (let yOffset = 0; yOffset < height - startY; yOffset += 2) {
                for (let x = 0; x < width; x += 2) {
                  const idx = (yOffset * width + x) * 4;
                  const r = data[idx];
                  const g = data[idx+1];
                  const b = data[idx+2];
                  
                  if (r > 200 && g > 100 && g < 190 && b < 145) {
                    saffronPixels.push({ x, y: yOffset + startY });
                  }
                }
              }
              
              let fx = 208 * s;
              let bx = 1238 * s;
              let fy = 2290 * s;
              let by = 2290 * s;
              const cw = 976 * s;
              const ch = 638 * s;
              
              if (saffronPixels.length > 50) {
                const midX = width / 2;
                const leftCluster = saffronPixels.filter(p => p.x < midX);
                const rightCluster = saffronPixels.filter(p => p.x >= midX);
                
                const getTopLeft = (cluster, defaultX, defaultY) => {
                  if (cluster.length < 25) return { x: defaultX, y: defaultY };
                  
                  cluster.sort((a, b) => a.y - b.y);
                  const minY = cluster[0].y;
                  
                  const topEdge = cluster.filter(p => p.y <= minY + (8 * s));
                  topEdge.sort((a, b) => a.x - b.x);
                  
                  const minX = topEdge[0].x;
                  
                  return { x: minX, y: minY };
                };
                
                const leftCoord = getTopLeft(leftCluster, 420 * s, 2290 * s);
                const rightCoord = getTopLeft(rightCluster, 1450 * s, 2290 * s);
                
                fx = leftCoord.x - (212 * s);
                fy = leftCoord.y;
                bx = rightCoord.x - (212 * s);
                by = rightCoord.y;
                
                if (fx < 100 * s || fx > 300 * s || fy < 2100 * s || fy > 2400 * s) {
                  fx = 208 * s;
                  fy = 2290 * s;
                }
                if (bx < 1100 * s || bx > 1350 * s || by < 2100 * s || by > 2400 * s) {
                  bx = 1238 * s;
                  by = 2290 * s;
                }
              }
              
              const frontX = bx;
              const frontY = by;
              const backX = fx;
              const backY = fy;

              return {
                frontHeader: crop(frontX, frontY, cw, 115 * s),
                frontWarning: crop(frontX + (190 * s), frontY + (410 * s), 750 * s, 94 * s),
                frontFooter: crop(frontX, frontY + ch - (78 * s), cw, 78 * s),
                frontLeftStrip: crop(frontX, frontY, 32 * s, ch),
                backHeader: crop(backX, backY, cw, 115 * s),
                backFooter: crop(backX, backY + ch - (78 * s), cw, 78 * s),
                backLeftStrip: crop(backX, backY, 32 * s, ch),
                backQRCode: crop(backX + (710 * s), backY + (120 * s), 240 * s, 240 * s),
                frontCardFull: crop(frontX, frontY, cw, ch),
                backCardFull: crop(backX, backY, cw, ch)
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
    await page.waitForFunction(() => (window as any).jsLoaded === true, { timeout: 10000 });
    
    console.log('[pdfRenderer] Calling renderAndCrop in page context...');
    const result = await page.evaluate(async (pdfStr) => {
      return await (window as any).renderAndCrop(pdfStr);
    }, decryptedPdfBase64);

    if (result.error) {
      throw new Error(`PDF render and crop failed: ${result.error}`);
    }

    console.log('[pdfRenderer] Successfully cropped all Aadhaar visual assets from PDF page.');
    return result as CroppedAssets;
  } finally {
    await browser.close();
  }
}
