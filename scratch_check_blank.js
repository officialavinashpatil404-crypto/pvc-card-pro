const fs = require('fs');
const sharp = require('sharp');

async function checkImageMetrics(name, imagePath) {
  if (!fs.existsSync(imagePath)) {
    console.error(`File not found: ${imagePath}`);
    return;
  }
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  
  const rawBuffer = await image.raw().toBuffer();
  const totalPixels = width * height;
  const channels = metadata.channels; // 3 or 4

  let transparentCount = 0;
  let totalBrightness = 0;
  let rSum = 0, gSum = 0, bSum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * channels;
    const r = rawBuffer[idx];
    const g = rawBuffer[idx + 1];
    const b = rawBuffer[idx + 2];
    
    // Check transparency
    if (channels === 4) {
      const alpha = rawBuffer[idx + 3];
      if (alpha < 13) { // less than 5% opacity
        transparentCount++;
      }
    }

    // Brightness = (r + g + b) / 3
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    
    rSum += r;
    gSum += g;
    bSum += b;
  }

  const transparentPct = (transparentCount / totalPixels) * 100;
  const avgBrightnessPct = (totalBrightness / totalPixels / 255) * 100;
  const avgR = rSum / totalPixels;
  const avgG = gSum / totalPixels;
  const avgB = bSum / totalPixels;

  console.log(`=== METRICS FOR ${name} ===`);
  console.log(`Dimensions: ${width}x${height}`);
  console.log(`Channels: ${channels}`);
  console.log(`Transparent pixels: ${transparentCount} / ${totalPixels} (${transparentPct.toFixed(2)}%)`);
  console.log(`Average brightness: ${avgBrightnessPct.toFixed(2)}%`);
  console.log(`Average RGB: RGB(${avgR.toFixed(1)}, ${avgG.toFixed(1)}, ${avgB.toFixed(1)})`);
}

async function main() {
  await checkImageMetrics('FRONT CROP', 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/front-final-test.png');
  await checkImageMetrics('BACK CROP', 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/back-final-test.png');
}

main().catch(console.error);
