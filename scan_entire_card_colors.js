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
        window.scanColors = async function(imageUrl) {
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
          
          const redRegions = [];
          for (let y = 0; y < height; y += 5) {
            for (let x = 0; x < width; x += 5) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              
              // Dominant red check (R > 1.5 * G and R > 1.5 * B and R > 100)
              if (r > 1.5 * g && r > 1.5 * b && r > 100) {
                redRegions.push({ x, y, r, g, b });
              }
            }
          }
          
          return {
            width,
            height,
            redCount: redRegions.length,
            // Group by x and y intervals to find dense red clusters
            yIntervals: groupByInterval(redRegions, 'y', 20),
            xIntervals: groupByInterval(redRegions, 'x', 20)
          };
        }
        
        function groupByInterval(points, axis, intervalSize) {
          const groups = {};
          for (const p of points) {
            const bucket = Math.floor(p[axis] / intervalSize) * intervalSize;
            groups[bucket] = (groups[bucket] || 0) + 1;
          }
          return Object.keys(groups)
            .map(k => ({ val: parseInt(k), count: groups[k] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15);
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const imgPath = 'C:/Users/NANO/Downloads/crop_front_test_v2.png';
  const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
  
  const result = await page.evaluate(async (url) => {
    return await window.scanColors(url);
  }, imgBase64);

  console.log('Dominant red pixel density:', JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch(console.error);
