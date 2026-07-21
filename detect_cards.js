const fs = require('fs');
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // We will load the image into a canvas inside the browser and scan its pixels.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body>
      <canvas id="scan-canvas"></canvas>
      <script>
        window.analyzeImage = async function(imageUrl) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          
          const canvas = document.getElementById('scan-canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          const width = img.width;
          const height = img.height;
          
          // Let's scan from y = height * 0.6 to height to find the tricolor headers
          // Tricolor has saffron (orange) near the top of the cards.
          // Saffron color range: R > 200, G: 100-180, B < 80
          // Green color range: R < 80, G > 100, B < 80
          
          const startY = Math.floor(height * 0.6);
          const imageData = ctx.getImageData(0, startY, width, height - startY);
          const data = imageData.data;
          
          // Let's print out some statistics of saffron/green pixels
          const hits = [];
          for (let y = 0; y < height - startY; y += 4) {
            for (let x = 0; x < width; x += 4) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              
              // Saffron check
              if (r > 200 && g > 100 && g < 180 && b < 80) {
                hits.push({ x, y: y + startY, type: 'saffron', r, g, b });
              }
              // Green check
              else if (r < 80 && g > 100 && b < 80) {
                hits.push({ x, y: y + startY, type: 'green', r, g, b });
              }
            }
          }
          
          return {
            width,
            height,
            hitsCount: hits.length,
            sampleHits: hits.slice(0, 100),
            // Group by y coordinate to see where lines of saffron/green pixels are concentrated
            yDistribution: groupHitsByY(hits)
          };
        };
        
        function groupHitsByY(hits) {
          const dist = {};
          for (const h of hits) {
            dist[h.y] = (dist[h.y] || 0) + 1;
          }
          const sorted = Object.keys(dist)
            .map(y => ({ y: parseInt(y), count: dist[y] }))
            .sort((a, b) => b.count - a.count);
          return sorted.slice(0, 30);
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  // Image path needs to be absolute URL format or we can load base64
  const imgPath = 'C:/Users/NANO/Downloads/aaru_page1.png';
  const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
  
  console.log('Scanning image pixels in browser...');
  const result = await page.evaluate(async (url) => {
    return await window.analyzeImage(url);
  }, imgBase64);

  console.log(`Image Size: ${result.width}x${result.height}`);
  console.log(`Hits found: ${result.hitsCount}`);
  console.log('Top y concentrations of saffron/green pixels:');
  console.log(result.yDistribution);

  await browser.close();
}

main().catch(console.error);
