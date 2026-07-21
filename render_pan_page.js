const fs = require('fs');
const puppeteer = require('puppeteer');

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/881133162662944_signed.pdf';
  const password = '21092003';

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }

  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString('base64');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
      </head>
      <body>
        <canvas id="pdf-canvas"></canvas>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
          
          window.renderPage = async function(base64Str, pwd) {
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
              return { width: canvas.width, height: canvas.height };
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
    await page.waitForFunction(() => window.jsLoaded === true);

    console.log('Rendering PDF page at 300 DPI...');
    const result = await page.evaluate(async (pdfStr, pwd) => {
      return await window.renderPage(pdfStr, pwd);
    }, base64Pdf, password);

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`Rendered page size: ${result.width}x${result.height}`);

    // Capture screenshot of the full canvas
    const canvasElement = await page.$('#pdf-canvas');
    if (canvasElement) {
      await canvasElement.screenshot({ path: 'C:/Users/NANO/Downloads/pan_page_300dpi.png' });
      console.log('Successfully saved to C:/Users/NANO/Downloads/pan_page_300dpi.png');
    } else {
      console.error('Canvas element not found');
    }

  } catch (err) {
    console.error('Error during rendering:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
