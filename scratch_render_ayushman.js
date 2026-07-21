const fs = require('fs');
const puppeteer = require('puppeteer');

async function renderPage(pdfBase64, pageNumber, scale, outputPath) {
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
          
          window.render = async function(base64Str, pageNum, sc) {
            try {
              const pdfData = atob(base64Str);
              const uint8Array = new Uint8Array(pdfData.length);
              for (let i = 0; i < pdfData.length; i++) {
                uint8Array[i] = pdfData.charCodeAt(i);
              }
              
              const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
              const pdf = await loadingTask.promise;
              const pageObj = await pdf.getPage(pageNum);
              
              const viewport = pageObj.getViewport({ scale: sc });
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

    const result = await page.evaluate(async (pdfStr, num, sc) => {
      return await window.render(pdfStr, num, sc);
    }, pdfBase64, pageNumber, scale);

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`Rendered page ${pageNumber} at scale ${scale}: ${result.width}x${result.height}`);
    const canvasElement = await page.$('#pdf-canvas');
    if (canvasElement) {
      await canvasElement.screenshot({ path: outputPath });
      console.log(`Saved screenshot to ${outputPath}`);
    }
  } catch (err) {
    console.error(`Error rendering page ${pageNumber}:`, err);
  } finally {
    await browser.close();
  }
}

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/Nishad Ganeshbhai Dindyalbhai.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at ${pdfPath}`);
    return;
  }
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString('base64');

  console.log('Rendering 300 DPI (scale 4.167)...');
  await renderPage(base64Pdf, 1, 4.167, 'C:/Users/NANO/Downloads/ayushman_p1_300.png');
  await renderPage(base64Pdf, 2, 4.167, 'C:/Users/NANO/Downloads/ayushman_p2_300.png');

  console.log('Rendering 600 DPI (scale 8.333)...');
  await renderPage(base64Pdf, 1, 8.333, 'C:/Users/NANO/Downloads/ayushman_p1_600.png');
  await renderPage(base64Pdf, 2, 8.333, 'C:/Users/NANO/Downloads/ayushman_p2_600.png');
}

main().catch(console.error);
