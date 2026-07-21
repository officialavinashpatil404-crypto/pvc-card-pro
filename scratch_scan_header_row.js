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
        window.scanHeaderRow = async function(imageUrl) {
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
          
          const y = 2320; // Inside header vertical region
          const rowColors = [];
          for (let x = 200; x < 1200; x += 10) {
            const imgData = ctx.getImageData(x, y, 1, 1);
            const r = imgData.data[0];
            const g = imgData.data[1];
            const b = imgData.data[2];
            rowColors.push({ x, r, g, b });
          }
          return rowColors;
        }
      </script>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  
  const imgPath = 'C:/Users/NANO/Downloads/aaru_page1.png';
  if (!fs.existsSync(imgPath)) {
    console.error('Image not found:', imgPath);
    await browser.close();
    return;
  }
  const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;
  
  const result = await page.evaluate(async (url) => {
    return await window.scanHeaderRow(url);
  }, imgBase64);

  // Print points where R is high but not pure white
  const saffronCandidates = result.filter(p => p.r > 200 && p.g > 100 && p.b < 150);
  console.log('Saffron Candidates (R > 200, G > 100, B < 150):');
  console.log(JSON.stringify(saffronCandidates, null, 2));

  await browser.close();
}

main().catch(console.error);
