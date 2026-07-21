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

  // Crop the right side down to the bottom
  await sharp(box3Path)
    .extract({ 
      left: Math.floor(metadata.width * 0.7), 
      top: 150, 
      width: Math.floor(metadata.width * 0.3), 
      height: metadata.height - 150 
    })
    .toFile('C:/Users/NANO/Downloads/crop_box3_right_full.png');

  console.log('Full right crop generated!');
}

main().catch(console.error);
