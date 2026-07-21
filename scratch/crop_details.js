const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const box3Path = 'C:/Users/NANO/Downloads/crop_box3.png';
  if (!fs.existsSync(box3Path)) {
    console.error('crop_box3.png not found');
    return;
  }

  const metadata = await sharp(box3Path).metadata();
  console.log(`Box 3 size: ${metadata.width}x${metadata.height}`);

  // Let's crop the right side of Box 3 (under the QR code)
  // Box 3 height is around 328px (since h = 1024, 0.68 * h to h is 328px)
  // Let's crop from y = 100px to 250px, and x = 300px to width
  await sharp(box3Path)
    .extract({ left: Math.floor(metadata.width * 0.7), top: 50, width: Math.floor(metadata.width * 0.3), height: 200 })
    .toFile('C:/Users/NANO/Downloads/crop_box3_right.png');

  // Let's also crop the District line area: y = 100px to 160px, x = 200px to width
  await sharp(box3Path)
    .extract({ left: Math.floor(metadata.width * 0.3), top: 100, width: Math.floor(metadata.width * 0.6), height: 80 })
    .toFile('C:/Users/NANO/Downloads/crop_box3_district_row.png');

  console.log('Crops generated!');
}

main().catch(console.error);
