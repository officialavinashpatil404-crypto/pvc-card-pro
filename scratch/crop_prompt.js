const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const imgPath = 'C:/Users/NANO/Downloads/ChatGPT Image Jun 26, 2026, 07_29_22 PM.png';
  if (!fs.existsSync(imgPath)) {
    console.error(`Image not found at ${imgPath}`);
    return;
  }

  const image = sharp(imgPath);
  const metadata = await image.metadata();
  const w = metadata.width;
  const h = metadata.height;
  console.log(`Image size: ${w}x${h}`);

  const xStart = Math.floor(0.58 * w);
  const xWidth = w - xStart;

  // Box 1
  await sharp(imgPath)
    .extract({ left: xStart, top: 0, width: xWidth, height: Math.floor(0.35 * h) })
    .toFile('C:/Users/NANO/Downloads/crop_box1.png');

  // Box 2
  await sharp(imgPath)
    .extract({ left: xStart, top: Math.floor(0.35 * h), width: xWidth, height: Math.floor(0.33 * h) })
    .toFile('C:/Users/NANO/Downloads/crop_box2.png');

  // Box 3
  await sharp(imgPath)
    .extract({ left: xStart, top: Math.floor(0.68 * h), width: xWidth, height: h - Math.floor(0.68 * h) })
    .toFile('C:/Users/NANO/Downloads/crop_box3.png');

  console.log('Successfully cropped using sharp!');
}

main().catch(console.error);
