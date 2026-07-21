import * as fs from 'fs';
import puppeteer from 'puppeteer';

async function main() {
  console.log('=== CROPPING WITH MATH-DETERMINED COORDINATES ===');
  const pdfPath = 'C:/Users/NANO/Downloads/e-EPIC_YMC5483623.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }
  
  const buffer = fs.readFileSync(pdfPath);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    const base64Pdf = buffer.toString('base64');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
      </head>
      <body>
        <canvas id="pdf-canvas"></canvas>
        <canvas id="crop-canvas"></canvas>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          
          window.scanAndCrop = async function(base64Str) {
            try {
              const pdfData = atob(base64Str);
              const uint8Array = new Uint8Array(pdfData.length);
              for (let i = 0; i < pdfData.length; i++) {
                uint8Array[i] = pdfData.charCodeAt(i);
              }
              
              const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
              const pdf = await loadingTask.promise;
              const pageObj = await pdf.getPage(1);
              
              const viewport = pageObj.getViewport({ scale: 4.167 }); // 300 DPI
              const canvas = document.getElementById('pdf-canvas');
              const context = canvas.getContext('2d');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await pageObj.render({ canvasContext: context, viewport }).promise;
              
              // Coordinates:
              const y1 = 393;
              const y2 = 1039;
              const cardH = y2 - y1; // 646
              
              const backX1 = 1361;
              const backX2 = 2385;
              const cardW = backX2 - backX1; // 1024
              
              const frontX2 = 1157;
              const frontX1 = frontX2 - cardW; // 133
              
              const crop = (cx, cy, cw, ch) => {
                const cropCanvas = document.getElementById('crop-canvas');
                cropCanvas.width = cw;
                cropCanvas.height = ch;
                const cropCtx = cropCanvas.getContext('2d');
                cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
                return cropCanvas.toDataURL('image/png');
              };
              
              const frontCardBase64 = crop(frontX1, y1, cardW, cardH);
              const backCardBase64 = crop(backX1, y1, cardW, cardH);
              
              return {
                frontCardBase64,
                backCardBase64,
                frontX1,
                frontX2,
                backX1,
                backX2,
                y1,
                y2,
                cardW,
                cardH
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
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (err: any) => console.error('PAGE ERROR:', err.message));
    
    await page.setContent(htmlContent);
    await page.waitForFunction(() => (window as any).jsLoaded === true, { timeout: 15000 });
    
    const result: any = await page.evaluate(async (pdfStr) => {
      return await (window as any).scanAndCrop(pdfStr);
    }, base64Pdf);
    
    if (result.error) {
      console.error('Error during crop:', result.error);
      return;
    }
    
    const fBuf = Buffer.from(result.frontCardBase64.split(',')[1], 'base64');
    const bBuf = Buffer.from(result.backCardBase64.split(',')[1], 'base64');
    
    fs.writeFileSync('C:/Users/NANO/Downloads/exact_voter_front.png', fBuf);
    fs.writeFileSync('C:/Users/NANO/Downloads/exact_voter_back.png', bBuf);
    console.log('Saved exact crops to Downloads successfully!');
    console.log('Exact coordinates detected:', {
      frontX1: result.frontX1,
      frontX2: result.frontX2,
      backX1: result.backX1,
      backX2: result.backX2,
      y1: result.y1,
      y2: result.y2,
      cardW: result.cardW,
      cardH: result.cardH
    });
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
