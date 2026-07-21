const fs = require('fs');
const puppeteer = require('puppeteer');

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    return;
  }
  const base64Pdf = fs.readFileSync(pdfPath).toString('base64');

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
    </head>
    <body style="margin: 0; padding: 0;">
      <canvas id="pdf-canvas"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        window.renderPage = async function(base64Str) {
          const pdfData = atob(base64Str);
          const uint8Array = new Uint8Array(pdfData.length);
          for (let i = 0; i < pdfData.length; i++) {
            uint8Array[i] = pdfData.charCodeAt(i);
          }
          const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
          const pdf = await loadingTask.promise;
          const p1 = await pdf.getPage(1);
          const viewport = p1.getViewport({ scale: 4.167 }); // 300 DPI (approx 4x scale)
          const canvas = document.getElementById('pdf-canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await p1.render({ canvasContext: ctx, viewport }).promise;
          return { width: canvas.width, height: canvas.height };
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const size = await page.evaluate(async (pdfStr) => {
    return await window.renderPage(pdfStr);
  }, base64Pdf);

  const canvasEl = await page.$('#pdf-canvas');
  await canvasEl.screenshot({ path: 'C:/Users/NANO/Downloads/pdf_page_1.png' });
  await browser.close();
  console.log(`Rendered PDF Page 1: ${size.width}x${size.height} saved to C:/Users/NANO/Downloads/pdf_page_1.png`);
}

main().catch(console.error);
