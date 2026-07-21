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
    <body>
      <canvas id="canvas"></canvas>
      <script>
        window.findRedBox = async function(imageUrl) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          
          const canvas = document.getElementById('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          const width = img.width;
          const height = img.height;
          
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          
          const redPixels = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              
              // Warning box border is red: R > 180, G < 60, B < 60
              if (r > 180 && g < 80 && b < 80) {
                redPixels.push({ x, y });
              }
            }
          }
          
          if (redPixels.length === 0) {
            return { error: 'No red pixels found' };
          }
          
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          for (const p of redPixels) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          }
          
          return {
            width,
            height,
            redCount: redPixels.length,
            box: { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }
          };
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const imgPath = 'C:/Users/NANO/Downloads/crop_front_test_v2.png';
  const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
  
  console.log('Analyzing red border pixels in browser...');
  const result = await page.evaluate(async (url) => {
    return await window.findRedBox(url);
  }, imgBase64);

  console.log('Red box detection:', JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch(console.error);
