const fs = require('fs');
const puppeteer = require('puppeteer');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body>
        <canvas id="scan-canvas"></canvas>
        <script>
          window.detectBorders = async function(imageUrl) {
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = resolve;
              img.src = imageUrl;
            });
            
            const canvas = document.getElementById('scan-canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const width = img.width;
            const height = img.height;
            
            // We know the cards are at the bottom. Let's scan y from 2200 to 3400.
            const startY = 2200;
            const endY = 3400;
            const scanHeight = endY - startY;
            
            const imgData = ctx.getImageData(0, startY, width, scanHeight);
            const data = imgData.data;
            
            // Let's find vertical lines.
            // A vertical line of the card border is a column of dark/gray pixels.
            // Let's calculate the "darkness" of each pixel: R, G, B < 150 (and close to each other, like gray/black)
            const darkness = new Uint8Array(width * scanHeight);
            for (let y = 0; y < scanHeight; y++) {
              for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx+1];
                const b = data[idx+2];
                
                // Let's count as dark if R < 160 && G < 160 && B < 160
                if (r < 160 && g < 160 && b < 160) {
                  darkness[y * width + x] = 1;
                }
              }
            }
            
            // 1. Detect vertical lines: sum darkness along columns
            const colSums = new Int32Array(width);
            for (let x = 0; x < width; x++) {
              let sum = 0;
              for (let y = 0; y < scanHeight; y++) {
                sum += darkness[y * width + x];
              }
              colSums[x] = sum;
            }
            
            // 2. Detect horizontal lines: sum darkness along rows
            const rowSums = new Int32Array(scanHeight);
            for (let y = 0; y < scanHeight; y++) {
              let sum = 0;
              for (let x = 0; x < width; x++) {
                sum += darkness[y * width + x];
              }
              rowSums[y] = sum;
            }
            
            // Let's find prominent columns (vertical lines)
            // Card borders should be at x positions.
            const prominentCols = [];
            for (let x = 100; x < width - 100; x++) {
              // local maximum
              if (colSums[x] > 200 && 
                  colSums[x] >= colSums[x-1] && 
                  colSums[x] >= colSums[x-2] && 
                  colSums[x] >= colSums[x+1] && 
                  colSums[x] >= colSums[x+2]) {
                prominentCols.push({ x, sum: colSums[x] });
              }
            }
            
            // Let's find prominent rows (horizontal lines)
            const prominentRows = [];
            for (let y = 50; y < scanHeight - 50; y++) {
              if (rowSums[y] > 500 && 
                  rowSums[y] >= rowSums[y-1] && 
                  rowSums[y] >= rowSums[y-2] && 
                  rowSums[y] >= rowSums[y+1] && 
                  rowSums[y] >= rowSums[y+2]) {
                prominentRows.push({ y: y + startY, sum: rowSums[y] });
              }
            }
            
            return {
              width,
              height,
              prominentCols: prominentCols.sort((a,b) => b.sum - a.sum).slice(0, 15),
              prominentRows: prominentRows.sort((a,b) => b.sum - a.sum).slice(0, 15)
            };
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    const imgPath = 'C:/Users/NANO/Downloads/pan_page_300dpi.png';
    const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;

    console.log('Analyzing image border structures...');
    const result = await page.evaluate(async (url) => {
      return await window.detectBorders(url);
    }, imgBase64);

    console.log('Border Structure Results:');
    console.log('Prominent Columns (Vertical Lines):');
    console.log(result.prominentCols);
    console.log('Prominent Rows (Horizontal Lines):');
    console.log(result.prominentRows);

  } catch (err) {
    console.error('Error during analysis:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
