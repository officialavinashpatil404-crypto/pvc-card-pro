const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const imagePath = 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/abha_page1.png';
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    return;
  }

  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  console.log(`Dimensions: ${width}x${height}`);

  const rawBuffer = await image.raw().toBuffer();
  
  const getPixel = (x, y) => {
    const idx = (y * width + x) * 3;
    return {
      r: rawBuffer[idx],
      g: rawBuffer[idx + 1],
      b: rawBuffer[idx + 2]
    };
  };

  const isDark = (x, y) => {
    const p = getPixel(x, y);
    // Dark border/text pixel
    return p.r < 180 && p.g < 180 && p.b < 180;
  };

  // Profile row sums
  const rowSums = [];
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) sum++;
    }
    rowSums.push({ y, sum });
  }

  // Print rows that have high density (horizontal lines/borders/headers)
  console.log('--- HIGH DENSITY ROWS (sum > width * 0.4) ---');
  for (const r of rowSums) {
    if (r.sum > width * 0.4) {
      console.log(`Row y=${r.y}: sum=${r.sum}`);
    }
  }

  // Let's also print some column sums to check vertical borders
  // We can scan columns for x in [0, width]
  const colSums = [];
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) {
      if (isDark(x, y)) sum++;
    }
    colSums.push({ x, sum });
  }

  console.log('--- HIGH DENSITY COLUMNS (sum > height * 0.4) ---');
  for (const c of colSums) {
    if (c.sum > height * 0.4) {
      console.log(`Column x=${c.x}: sum=${c.sum}`);
    }
  }
}

main().catch(console.error);
