const fs = require('fs');
const puppeteer = require('puppeteer');

async function main() {
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
            
            const viewport = page.getViewport({ scale: 4 });
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({ canvasContext: context, viewport }).promise;
            return { width: canvas.width, height: canvas.height };
          } catch (err) {
            return { error: err.message };
          }
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const pdfPath = 'C:/Users/NANO/Downloads/amol.pdf';
  const encryptedBytes = fs.readFileSync(pdfPath);
  const base64Pdf = Buffer.from(encryptedBytes).toString('base64');
  
  console.log('Rendering amol.pdf to image...');
  const result = await page.evaluate(async (pdfStr) => {
    return await window.renderPdf(pdfStr);
  }, base64Pdf);

  console.log(`Rendered size: ${result.width}x${result.height}`);
  await page.setViewport({ width: result.width, height: result.height });
  const canvasElement = await page.$('#pdf-canvas');
  if (canvasElement) {
    const ssPath = 'C:/Users/NANO/Downloads/amol_page1.png';
    await canvasElement.screenshot({ path: ssPath });
    console.log(`Saved screenshot to ${ssPath}`);
  }
  
  await browser.close();
}

main().catch(console.error);
