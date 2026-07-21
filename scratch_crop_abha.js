const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const imagePath = 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/abha_page1.png';
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    return;
  }

  const image = sharp(imagePath);
  
  // Coordinates
  const x1 = 41;
  const x2 = 1895;
  const y1 = 42;
  const y2 = 1177;
  const y3 = 2357;

  console.log(`Cropping Front: left=${x1}, top=${y1}, width=${x2 - x1}, height=${y2 - y1}`);
  const front = await image.clone().extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }).toBuffer();
  fs.writeFileSync('C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/front-final-test.png', front);

  console.log(`Cropping Back: left=${x1}, top=${y2}, width=${x2 - x1}, height=${y3 - y2}`);
  const back = await image.clone().extract({ left: x1, top: y2, width: x2 - x1, height: y3 - y2 }).toBuffer();
  fs.writeFileSync('C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/back-final-test.png', back);

  console.log('Saved front-final-test.png and back-final-test.png.');
}

main().catch(console.error);
