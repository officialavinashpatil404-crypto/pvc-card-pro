const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const imagePath = 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/abha_page1.png';
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    return;
  }

  const image = sharp(imagePath);
  const rawBuffer = await image.raw().toBuffer();
  const metadata = await image.metadata();
  const width = metadata.width;

  const getPixel = (x, y) => {
    const idx = (y * width + x) * 3;
    return {
      r: rawBuffer[idx],
      g: rawBuffer[idx + 1],
      b: rawBuffer[idx + 2]
    };
  };

  const isGrey = (x, y) => {
    const p = getPixel(x, y);
    return p.r > 150 && p.r < 230 && Math.abs(p.r - p.g) < 8 && Math.abs(p.g - p.b) < 8;
  };

  const printLineSpan = (yLabel, yVal) => {
    const greyXs = [];
    for (let x = 0; x < width; x++) {
      if (isGrey(x, yVal)) {
        greyXs.push(x);
      }
    }
    if (greyXs.length > 0) {
      console.log(`y=${yLabel} (${yVal}): first_grey_x=${greyXs[0]}, last_grey_x=${greyXs[greyXs.length - 1]}, total_grey_pixels=${greyXs.length}`);
    } else {
      console.log(`y=${yLabel} (${yVal}): no grey pixels found`);
    }
  };

  printLineSpan('Top', 42);
  printLineSpan('Middle', 1177);
  printLineSpan('Bottom', 2357);
}

main().catch(console.error);
