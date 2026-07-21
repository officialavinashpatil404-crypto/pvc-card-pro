const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  console.log('Rendering Ayushman front card locally for layout verification...');

  const frontBgPath = 'C:/Users/NANO/Downloads/extracted_2_img0_677x436.jpg';
  const photoPath = 'C:/Users/NANO/Downloads/extracted_0_img2_160x200.jpg';
  
  if (!fs.existsSync(frontBgPath)) {
    console.error(`Front background not found at ${frontBgPath}`);
    return;
  }
  if (!fs.existsSync(photoPath)) {
    console.error(`Photo not found at ${photoPath}`);
    return;
  }

  const frontBgBase64 = `data:image/jpeg;base64,${fs.readFileSync(frontBgPath).toString('base64')}`;
  const photoBase64 = `data:image/jpeg;base64,${fs.readFileSync(photoPath).toString('base64')}`;

  // Font base64
  const fontPathReg = path.resolve('c:/Users/NANO/Desktop/PROPVCTOOL/pvc-card-pro/public/fonts/NotoSansGujarati-Regular.ttf');
  const fontPathBold = path.resolve('c:/Users/NANO/Desktop/PROPVCTOOL/pvc-card-pro/public/fonts/NotoSansGujarati-Bold.ttf');
  const fontReg = fs.readFileSync(fontPathReg).toString('base64');
  const fontBold = fs.readFileSync(fontPathBold).toString('base64');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'NotoSansCustom-Regular';
      src: url('data:font/ttf;base64,${fontReg}');
    }
    @font-face {
      font-family: 'NotoSansCustom-Bold';
      src: url('data:font/ttf;base64,${fontBold}');
    }
    
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #ffffff; }

    #card-front {
      width: 1013px;
      height: 638px;
      position: relative;
      background-image: url('${frontBgBase64}');
      background-size: 100% 100%;
      background-repeat: no-repeat;
      font-family: 'NotoSansCustom-Regular', Arial, sans-serif;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
    }

    /* ---------------- MASK OVERLAYS TO COVER PREPRINTED LABELS ---------------- */
    .mask {
      position: absolute;
      background: #ffffff;
      z-index: 1;
    }
    /* Cover pre-printed Name label */
    .mask-name { left: 200px; top: 285px; width: 140px; height: 32px; }
    /* Cover pre-printed YOB label */
    .mask-yob { left: 200px; top: 390px; width: 160px; height: 32px; }
    /* Cover pre-printed Gender label */
    .mask-gender { left: 440px; top: 390px; width: 165px; height: 32px; }
    /* Cover pre-printed ABHA Number label */
    .mask-abha { left: 200px; top: 490px; width: 180px; height: 24px; }
    /* Cover pre-printed PM-JAY ID label */
    .mask-pmjay { left: 635px; top: 490px; width: 340px; height: 24px; }
    /* Cover pre-printed State label below QR */
    .mask-state { right: 30px; top: 410px; width: 150px; height: 60px; }


    /* ---------------- PHOTO & QR CONTAINERS ---------------- */
    .photo-container {
      position: absolute;
      left: 28px;
      top: 226px;
      width: 152px;
      height: 190px;
      overflow: hidden;
      border: 1px solid #ccc;
      background: #f0f0f0;
      border-radius: 4px;
      z-index: 2;
    }
    
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .qr-container {
      position: absolute;
      right: 32px;
      top: 250px;
      width: 145px;
      height: 145px;
      overflow: hidden;
      background: #fff;
      z-index: 2;
    }

    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    /* ---------------- TYPOGRAPHY & FIELD BLOCKS ---------------- */
    .field-row {
      position: absolute;
      display: flex;
      flex-direction: row;
      align-items: center;
      line-height: 1.2;
      z-index: 2;
    }

    .field-label {
      color: #df5800; /* PMJAY Orange */
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-weight: 700;
      font-size: 16px;
      margin-right: 8px;
      white-space: nowrap;
    }

    .field-value {
      color: #000000;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-weight: 700;
      font-size: 16px;
    }

    /* Name Block - Largest Font */
    .name-row {
      left: 204px;
      top: 236px;
      width: 580px;
    }
    .name-row .field-value {
      font-size: 21px;
      white-space: nowrap;
    }

    /* YOB and Gender */
    .yob-row { left: 204px; top: 276px; width: 230px; }
    .gender-row { left: 450px; top: 276px; width: 230px; }

    /* Address Rows */
    .village-row { left: 204px; top: 312px; width: 580px; }
    .subdivision-row { left: 204px; top: 348px; width: 580px; }
    .district-row { left: 204px; top: 384px; width: 230px; }
    .state-row { left: 450px; top: 384px; width: 230px; }

    /* Bottom row elements */
    .mobile-row { left: 28px; top: 435px; width: 380px; }
    .pmjay-row { left: 450px; top: 435px; width: 380px; }
    
    .abha-row { left: 28px; top: 472px; width: 380px; }
    .ration-row { left: 450px; top: 472px; width: 380px; }

  </style>
</head>
<body>
<div id="card-front">
  <!-- Solid white mask blocks to cover the pre-printed template labels -->
  <div class="mask mask-name"></div>
  <div class="mask mask-yob"></div>
  <div class="mask mask-gender"></div>
  <div class="mask mask-abha"></div>
  <div class="mask mask-pmjay"></div>
  <div class="mask mask-state"></div>

  <!-- Photo and QR -->
  <div class="photo-container">
    <img src="${photoBase64}" class="photo-img" alt="Photo"/>
  </div>
  
  <div class="qr-container">
    <div style="width: 100%; height: 100%; background: #ccc; display: flex; align-items: center; justify-content: center; font-size: 10px;">QR Code</div>
  </div>

  <!-- Dynamic Fields with independent bounding boxes -->
  <div class="field-row name-row">
    <span class="field-label">નામ / NAME :</span>
    <span class="field-value name-value">NISHAD GANESHBHAI DINDYALBHAI</span>
  </div>

  <div class="field-row yob-row">
    <span class="field-label">જન્મ વર્ષ / YOB :</span>
    <span class="field-value">1958</span>
  </div>

  <div class="field-row gender-row">
    <span class="field-label">જાતિ / GENDER :</span>
    <span class="field-value">MALE</span>
  </div>

  <div class="field-row village-row">
    <span class="field-label">ગામ/વોર્ડ - Village/Ward :</span>
    <span class="field-value">80645</span>
  </div>

  <div class="field-row subdivision-row">
    <span class="field-label">તાલუકો/શહેર - Subdivision/Town :</span>
    <span class="field-value">Rajkot</span>
  </div>

  <div class="field-row district-row">
    <span class="field-label">જિલ્લો/District :</span>
    <span class="field-value">RAJKOT</span>
  </div>

  <div class="field-row state-row">
    <span class="field-label">રાજ્ય/ State :</span>
    <span class="field-value">GUJARAT</span>
  </div>

  <div class="field-row mobile-row">
    <span class="field-label">Mobile :</span>
    <span class="field-value">9737779794</span>
  </div>

  <div class="field-row pmjay-row">
    <span class="field-label">PM-JAY ID :</span>
    <span class="field-value">P9QBPEP3Y</span>
  </div>

  <div class="field-row abha-row">
    <span class="field-label">ABHA Number :</span>
    <span class="field-value">12-3456-7890-1234</span>
  </div>

  <div class="field-row ration-row">
    <span class="field-label">Ration/Other ID :</span>
    <span class="field-value">1234567890</span>
  </div>
</div>

<script>
  window.fitText = function() {
    const fitSingleLine = (selector, maxW, initialSize) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        let size = initialSize;
        el.style.fontSize = size + 'px';
        while (el.scrollWidth > maxW && size > 12) {
          size -= 1;
          el.style.fontSize = size + 'px';
        }
      });
    };

    fitSingleLine('.name-value', 380, 21);
    fitSingleLine('.field-row .field-value', 250, 16);
  };
</script>
</body>
</html>
  `;

  fs.writeFileSync('C:/Users/NANO/Downloads/ayushman_front_test.html', html);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1013, height: 638, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      if (window.fitText) window.fitText();
    });

    const frontEl = await page.$('#card-front');
    await frontEl.screenshot({ path: 'C:/Users/NANO/Downloads/ayushman_layout_check.png' });
    console.log('✅ Screenshot saved to C:/Users/NANO/Downloads/ayushman_layout_check.png');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
