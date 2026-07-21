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
        window.checkBorders = async function(imageUrl) {
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
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
          
          // Let's count red pixels in the crop
          let redCount = 0;
          const sampleRed = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              
              if (r > 180 && g < 50 && b < 50) {
                redCount++;
                if (sampleRed.length < 10) {
                  sampleRed.push({ x, y, r, g, b });
                }
              }
            }
          }
          
          return { width, height, redCount, sampleRed };
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const imgPath = 'C:/Users/NANO/Downloads/slice_warning.png';
  const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
  
  const result = await page.evaluate(async (url) => {
    return await window.checkBorders(url);
  }, imgBase64);

  console.log('Border verification:', JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch(console.error);
