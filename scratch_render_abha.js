const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const pdfPath = 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/abha_test.pdf';
  const outImagePath = 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/abha_page1.png';

  console.log(`Loading PDF from ${pdfPath}...`);
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF file does not exist at: ' + pdfPath);
    return;
  }
  const bytes = fs.readFileSync(pdfPath);
  const base64Pdf = Buffer.from(bytes).toString('base64');

  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #fff; }
        #pdf-canvas { display: block; }
      </style>
    </head>
    <body>
      <canvas id="pdf-canvas"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        window.renderPdf = async function(base64Pdf) {
          try {
            const pdfData = atob(base64Pdf);
            const uint8Array = new Uint8Array(pdfData.length);
            for (let i = 0; i < pdfData.length; i++) {
              uint8Array[i] = pdfData.charCodeAt(i);
            }
            
            const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 4.167 }); // 300 DPI
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            
            await page.render(renderContext).promise;
            window.pdfRendered = true;
            return { width: canvas.width, height: canvas.height };
          } catch (err) {
            window.pdfError = err.message;
            return { error: err.message };
          }
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  console.log('Rendering PDF page 1...');
  const result = await page.evaluate(async (pdfStr) => {
    return await window.renderPdf(pdfStr);
  }, base64Pdf);

  if (result.error) {
    console.error('Render error:', result.error);
    await browser.close();
    return;
  }

  console.log(`Rendered size: ${result.width}x${result.height}. Capturing screenshot...`);
  await page.setViewport({ width: result.width, height: result.height });
  const canvasElement = await page.$('#pdf-canvas');
  if (canvasElement) {
    await canvasElement.screenshot({ path: outImagePath });
    console.log(`Screenshot saved to: ${outImagePath}`);
  } else {
    console.error('Canvas element not found');
  }

  await browser.close();
}

main().catch(console.error);
