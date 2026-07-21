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

  // Crop the middle-lower region of Box 3
  // y = 150px to 280px (covering District, YOB, Gender, State), x = 180px to width
  await sharp(box3Path)
    .extract({ 
      left: 180, 
      top: 130, 
      width: metadata.width - 180, 
      height: 120 
    })
    .toFile('C:/Users/NANO/Downloads/crop_box3_lower_middle.png');

  console.log('Lower middle crop generated!');
}

main().catch(console.error);
