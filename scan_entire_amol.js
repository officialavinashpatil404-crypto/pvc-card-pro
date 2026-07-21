const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));

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
        
        window.analyzeColors = async function(base64Pdf) {
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
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          
          await page.render({ canvasContext: context, viewport }).promise;
          
          const width = canvas.width;
          const height = canvas.height;
          
          // Let's sample colors in the lower part of the PDF to see what colors actually exist.
          // We will print the RGB values of a grid of pixels.
          const samples = [];
          const startY = Math.floor(height * 0.6);
          const stepY = Math.floor((height - startY) / 20);
          const stepX = Math.floor(width / 20);
          
          for (let y = startY; y < height; y += stepY) {
            for (let x = 0; x < width; x += stepX) {
              const imgData = context.getImageData(x, y, 1, 1);
              const r = imgData.data[0];
              const g = imgData.data[1];
              const b = imgData.data[2];
              
              // Only collect colorful pixels (difference between max and min channel > 20)
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              if (max - min > 30) {
                samples.push({ x, y, r, g, b });
              }
            }
          }
          
          return samples;
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const pdfPath = 'C:/Users/NANO/Downloads/amol.pdf';
  const encryptedBytes = fs.readFileSync(pdfPath);
  const base64Pdf = Buffer.from(encryptedBytes).toString('base64');
  
  console.log('Analyzing colors in amol.pdf...');
  const samples = await page.evaluate(async (pdfStr) => {
    return await window.analyzeColors(pdfStr);
  }, base64Pdf);

  console.log('Sample colorful pixels:', samples.slice(0, 50));
  await browser.close();
}

main().catch(console.error);
