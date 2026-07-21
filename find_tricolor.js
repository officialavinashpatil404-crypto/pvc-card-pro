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
        window.findCardBounds = async function(imageUrl) {
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
          
          // Scan the lower half of the image
          const startY = Math.floor(height * 0.6);
          const scanHeight = height - startY;
          const imgData = ctx.getImageData(0, startY, width, scanHeight);
          const data = imgData.data;
          
          // We will find pixels that look like saffron: R > 200, G: 110-180, B < 80
          const saffronPixels = [];
          for (let y = 0; y < scanHeight; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              
              if (r > 200 && g > 110 && g < 185 && b < 90) {
                saffronPixels.push({ x, y: y + startY });
              }
            }
          }
          
          if (saffronPixels.length === 0) {
            return { error: 'No saffron pixels found' };
          }
          
          // Group saffron pixels into two clusters: left card (front) and right card (back)
          // The page width is 2448. The midpoint is 1224.
          const leftCluster = saffronPixels.filter(p => p.x < width / 2);
          const rightCluster = saffronPixels.filter(p => p.x >= width / 2);
          
          const getBounds = (cluster) => {
            if (cluster.length === 0) return null;
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            for (const p of cluster) {
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            }
            return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
          };
          
          const leftBounds = getBounds(leftCluster);
          const rightBounds = getBounds(rightCluster);
          
          return {
            width,
            height,
            saffronCount: saffronPixels.length,
            leftBounds,
            rightBounds
          };
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const imgPath = 'C:/Users/NANO/Downloads/aaru_page1.png';
  const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
  
  console.log('Analyzing saffron pixel clustering in browser...');
  const result = await page.evaluate(async (url) => {
    return await window.findCardBounds(url);
  }, imgBase64);

  console.log('Detection Result:', JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch(console.error);
