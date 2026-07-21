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
        <canvas id="crop-canvas"></canvas>
        <script>
          window.cropImage = async function(imageUrl, x, y, w, h) {
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = imageUrl;
            });
            
            const canvas = document.getElementById('crop-canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
            
            return canvas.toDataURL('image/png');
          };
        </script>
      </body>
      </html>
    `;

    await page.setContent(htmlContent);
    const imgPath = 'C:/Users/NANO/Downloads/pan_page_300dpi.png';
    const imgBase64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString('base64')}`;

    // Front Card candidate coordinates
    const frontX = 273;
    const frontY = 2706;
    const frontW = 1000;
    const frontH = 638;

    console.log(`Cropping Front Card from (${frontX}, ${frontY}) size ${frontW}x${frontH}...`);
    const frontUrl = await page.evaluate(async (url, x, y, w, h) => {
      return await window.cropImage(url, x, y, w, h);
    }, imgBase64, frontX, frontY, frontW, frontH);

    fs.writeFileSync('C:/Users/NANO/Downloads/test_front_crop_pan.png', Buffer.from(frontUrl.split(',')[1], 'base64'));
    console.log('Saved test_front_crop_pan.png');

    // Back Card candidate coordinates
    const backX = 1273;
    const backY = 2706;
    const backW = 1000;
    const backH = 638;

    console.log(`Cropping Back Card from (${backX}, ${backY}) size ${backW}x${backH}...`);
    const backUrl = await page.evaluate(async (url, x, y, w, h) => {
      return await window.cropImage(url, x, y, w, h);
    }, imgBase64, backX, backY, backW, backH);

    fs.writeFileSync('C:/Users/NANO/Downloads/test_back_crop_pan.png', Buffer.from(backUrl.split(',')[1], 'base64'));
    console.log('Saved test_back_crop_pan.png');

  } catch (err) {
    console.error('Error cropping:', err);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
