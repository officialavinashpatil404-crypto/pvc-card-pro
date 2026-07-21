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
  const height = metadata.height;

  const getPixel = (x, y) => {
    const idx = (y * width + x) * 3;
    return {
      r: rawBuffer[idx],
      g: rawBuffer[idx + 1],
      b: rawBuffer[idx + 2]
    };
  };

  // Trace down a vertical column (e.g. x = 200, which is near the left edge)
  // Let's print out the y values where there is a grey line (e.g. r, g, b around 200, but not white)
  console.log('--- VERTICAL TRACE AT x=200 ---');
  for (let y = 0; y < height; y++) {
    const p = getPixel(200, y);
    // If it is grey (all channels similar and in [150, 240]), print it
    if (p.r > 150 && p.r < 240 && Math.abs(p.r - p.g) < 5 && Math.abs(p.g - p.b) < 5) {
      console.log(`y=${y}: RGB(${p.r}, ${p.g}, ${p.b})`);
    }
  }

  // Trace down a vertical column in the middle (e.g. x = 900)
  console.log('--- VERTICAL TRACE AT x=900 ---');
  for (let y = 0; y < height; y++) {
    const p = getPixel(900, y);
    if (p.r > 150 && p.r < 240 && Math.abs(p.r - p.g) < 5 && Math.abs(p.g - p.b) < 5) {
      console.log(`y=${y}: RGB(${p.r}, ${p.g}, ${p.b})`);
    }
  }
}

main().catch(console.error);
