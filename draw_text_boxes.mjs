import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    return;
  }
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64Pdf = pdfBuffer.toString('base64');

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
    <body>
      <canvas id="pdf-canvas"></canvas>
      <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        window.renderAndDraw = async function(base64Str) {
          const pdfData = atob(base64Str);
          const uint8Array = new Uint8Array(pdfData.length);
          for (let i = 0; i < pdfData.length; i++) {
            uint8Array[i] = pdfData.charCodeAt(i);
          }
          
          const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
          const pdf = await loadingTask.promise;
          const p1 = await pdf.getPage(1);
          
          const viewport = p1.getViewport({ scale: 4.0 }); // Render at 4x scale
          const canvas = document.getElementById('pdf-canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          
          await p1.render({ canvasContext: ctx, viewport: viewport }).promise;
          
          // Draw text boxes
          const textContent = await p1.getTextContent();
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'red';
          ctx.font = '14px Arial';
          
          textContent.items.forEach((item, idx) => {
            const tx = item.transform;
            const x = tx[4];
            const y = tx[5];
            
            const [vpX, vpY] = viewport.convertToViewportPoint(x, y);
            
            // Draw a dot and label
            ctx.beginPath();
            ctx.arc(vpX, vpY, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillText(\`\${idx}: \${item.str}\`, vpX + 5, vpY + 5);
          });
          
          return canvas.toDataURL('image/png');
        };
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const result = await page.evaluate(async (pdfStr) => {
    return await window.renderAndDraw(pdfStr);
  }, base64Pdf);

  await browser.close();

  const buffer = Buffer.from(result.split(',')[1], 'base64');
  fs.writeFileSync('C:/Users/NANO/Downloads/rendered_text_coords.png', buffer);
  console.log('Saved rendered_text_coords.png to Downloads folder.');
}

main().catch(console.error);
