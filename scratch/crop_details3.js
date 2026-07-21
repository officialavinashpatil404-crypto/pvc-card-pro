const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const box2Path = 'C:/Users/NANO/Downloads/crop_box2.png';
  if (!fs.existsSync(box2Path)) {
    console.error('crop_box2.png not found');
    return;
  }

  const metadata = await sharp(box2Path).metadata();
  console.log(`Box 2 size: ${metadata.width}x${metadata.height}`);

  await sharp(box2Path)
    .extract({ 
      left: Math.floor(metadata.width * 0.7), 
      top: 150, 
      width: Math.floor(metadata.width * 0.3), 
      height: metadata.height - 150 
    })
    .toFile('C:/Users/NANO/Downloads/crop_box2_right_full.png');

  console.log('Full Box 2 right crop generated!');
}

main().catch(console.error);
