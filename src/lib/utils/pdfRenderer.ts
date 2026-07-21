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
              
              const viewport = page.getViewport({ scale: 4 }); // Render at 4x resolution
              const canvas = document.getElementById('pdf-canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({ canvasContext: context, viewport }).promise;
              
              // Helper function to crop sub-regions from rendered page canvas
              const crop = (x, y, w, h) => {
                const cropCanvas = document.getElementById('crop-canvas');
                cropCanvas.width = w;
                cropCanvas.height = h;
                const cropCtx = cropCanvas.getContext('2d');
                cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
                return cropCanvas.toDataURL('image/png');
              };

              // Dynamic Card Coordinates Scanner inside 4x rendered page canvas
              const width = canvas.width;
              const height = canvas.height;
              
              // We scan the bottom portion of the canvas where the cards are located
              // Broadened Saffron color range: R > 200, G: 100-190, B < 145 (to match both light/dark saffron)
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
              
              let fx = 208;
              let bx = 1238;
              let fy = 2290;
              let by = 2290;
              const cw = 976;
              const ch = 638;
              
              if (saffronPixels.length > 100) {
                const midX = width / 2;
                const leftCluster = saffronPixels.filter(p => p.x < midX);
                const rightCluster = saffronPixels.filter(p => p.x >= midX);
                
                const getTopLeft = (cluster, defaultX, defaultY) => {
                  if (cluster.length < 50) return { x: defaultX, y: defaultY };
                  
                  // Sort by y coordinate to find the top edge of the tricolor band
                  cluster.sort((a, b) => a.y - b.y);
                  const minY = cluster[0].y;
                  
                  // Gather all pixels near the top edge
                  const topEdge = cluster.filter(p => p.y <= minY + 8);
                  topEdge.sort((a, b) => a.x - b.x);
                  
                  // Find the leftmost pixel on the top edge of the brush stroke
                  const minX = topEdge[0].x;
                  
                  return { x: minX, y: minY };
                };
                
                // Saffron brush stroke begins at fixed offset ~212px relative to the card's left boundary
                const leftCoord = getTopLeft(leftCluster, 420, 2290);
                const rightCoord = getTopLeft(rightCluster, 1450, 2290);
                
                fx = leftCoord.x - 212;
                fy = leftCoord.y;
                bx = rightCoord.x - 212;
                by = rightCoord.y;
                
                // Dynamic coordinates safety check limits (revert to standard template if out of bounds)
                if (fx < 100 || fx > 300 || fy < 2100 || fy > 2400) {
                  console.log('Detected front card coords out of bounds, reverting to standard values');
                  fx = 208;
                  fy = 2290;
                }
                if (bx < 1100 || bx > 1350 || by < 2100 || by > 2400) {
                  console.log('Detected back card coords out of bounds, reverting to standard values');
                  bx = 1238;
                  by = 2290;
                }
                
                console.log('Dynamic saffron scanning matched card bounds:', { fx, fy, bx, by });
              } else {
                console.log('Dynamic saffron scanning failed to find card bounds, falling back to static coordinates.');
              }
              
              // Swapped mapping: Front Card = right card (bx, by); Back Card = left card (fx, fy)
              const frontX = bx;
              const frontY = by;
              const backX = fx;
              const backY = fy;

              return {
                frontHeader: crop(frontX, frontY, cw, 115),
                frontWarning: crop(frontX + 190, frontY + 410, 750, 94), // height slightly smaller to prevent overlap
                frontFooter: crop(frontX, frontY + ch - 78, cw, 78),
                frontLeftStrip: crop(frontX, frontY, 32, ch),
                backHeader: crop(backX, backY, cw, 115),
                backFooter: crop(backX, backY + ch - 78, cw, 78),
                backLeftStrip: crop(backX, backY, 32, ch),
                backQRCode: crop(backX + 710, backY + 120, 240, 240), // crop QR code directly from high-res page canvas!
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
