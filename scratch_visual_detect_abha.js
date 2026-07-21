const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const imagePath = 'C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/abha_page1.png';
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    return;
  }

  console.log('Loading image with sharp...');
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

  // Dark pixels are borders/text/logos
  const isDark = (x, y) => {
    const p = getPixel(x, y);
    return p.r < 180 && p.g < 180 && p.b < 180;
  };

  // Blue header color detection: let's look at the header color of the ABHA card.
  // In the screenshot, NHA logo header is dark blue.
  // Let's sample a few pixels or look at columns/rows that have solid blue.
  // Let's find rows with high density of dark pixels.
  // Card Width is around 1000px at 300 DPI, height is around 638px.
  // At 1937x2400, let's see what card size would be:
  // 1937 is A4 width. 2400 is A4 height.
  // Wait! A standard card is 8.56cm x 5.4cm.
  // Let's find where the borders are!
  // We can scan row by row to compute row sums.
  const rowSums = new Int32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      if (isDark(x, y)) sum++;
    }
    rowSums[y] = sum;
  }

  // We look for the front card top, bottom, left, right.
  // And back card top, bottom, left, right.
  // Since the cards are stacked vertically:
  // Front card is in y in [0, height/2] (usually [100, 1000])
  // Back card is in y in [height/2, height] (usually [1100, 2300])

  // Let's write a robust visual boundary scanner for a single card:
  // We scan columns to find left/right boundary.
  // How? A card boundary is a vertical line. Let's find the vertical lines in the image.
  const colSums = new Int32Array(width);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) {
      if (isDark(x, y)) sum++;
    }
    colSums[x] = sum;
  }

  // The cards are horizontally centered or have a clear left/right border.
  // Let's print out the column sums around expected card borders.
  // Card width is standard: at 1937 width, card width is ~1013 pixels or similar.
  // Let's find the exact left and right borders of the front card by scanning a range of y where the front card is.
  // Let's assume the front card is within y in [100, 1100].
  const getColSumRange = (x, yStart, yEnd) => {
    let sum = 0;
    for (let y = yStart; y <= yEnd; y++) {
      if (isDark(x, y)) sum++;
    }
    return sum;
  };

  // Find left border of front card in x in [50, 400]
  // We scan within y in [200, 800]
  let fx1 = -1, maxFx1 = -1;
  for (let x = 50; x <= 400; x++) {
    const sum = getColSumRange(x, 200, 800);
    if (sum > maxFx1) {
      maxFx1 = sum;
      fx1 = x;
    }
  }

  // Find right border of front card in x in [width - 400, width - 50]
  let fx2 = -1, maxFx2 = -1;
  for (let x = width - 400; x <= width - 50; x++) {
    const sum = getColSumRange(x, 200, 800);
    if (sum > maxFx2) {
      maxFx2 = sum;
      fx2 = x;
    }
  }

  // Now, find top border of front card in y in [50, 400]
  // We scan within x in [fx1 + 10, fx2 - 10]
  const getRowSumRange = (y, xStart, xEnd) => {
    let sum = 0;
    for (let x = xStart; x <= xEnd; x++) {
      if (isDark(x, y)) sum++;
    }
    return sum;
  };

  let fy1 = -1, maxFy1 = -1;
  for (let y = 50; y <= 400; y++) {
    const sum = getRowSumRange(y, fx1 + 10, fx2 - 10);
    if (sum > maxFy1) {
      maxFy1 = sum;
      fy1 = y;
    }
  }

  // Find bottom border of front card in y in [fy1 + 500, fy1 + 750] (since height is around 600-700)
  let fy2 = -1, maxFy2 = -1;
  for (let y = fy1 + 500; y <= fy1 + 750; y++) {
    const sum = getRowSumRange(y, fx1 + 10, fx2 - 10);
    if (sum > maxFy2) {
      maxFy2 = sum;
      fy2 = y;
    }
  }

  console.log('--- FRONT CARD DETECTED ---');
  console.log(`x1: ${fx1}, x2: ${fx2}, y1: ${fy1}, y2: ${fy2}`);
  console.log(`Width: ${fx2 - fx1}, Height: ${fy2 - fy1}`);

  // Now, detect back card borders:
  // Left border of back card in x in [50, 400], y in [fy2 + 100, height - 100]
  const backYStart = fy2 + 50;
  const backYEnd = Math.min(height - 50, backYStart + 900);

  let bx1 = -1, maxBx1 = -1;
  for (let x = 50; x <= 400; x++) {
    const sum = getColSumRange(x, backYStart + 100, backYEnd - 100);
    if (sum > maxBx1) {
      maxBx1 = sum;
      bx1 = x;
    }
  }

  // Right border of back card in x in [width - 400, width - 50]
  let bx2 = -1, maxBx2 = -1;
  for (let x = width - 400; x <= width - 50; x++) {
    const sum = getColSumRange(x, backYStart + 100, backYEnd - 100);
    if (sum > maxBx2) {
      maxBx2 = sum;
      bx2 = x;
    }
  }

  // Top border of back card in y in [backYStart, backYStart + 400]
  let by1 = -1, maxBy1 = -1;
  for (let y = backYStart; y <= backYStart + 400; y++) {
    const sum = getRowSumRange(y, bx1 + 10, bx2 - 10);
    if (sum > maxBy1) {
      maxBy1 = sum;
      by1 = y;
    }
  }

  // Bottom border of back card in y in [by1 + 500, by1 + 750]
  let by2 = -1, maxBy2 = -1;
  for (let y = by1 + 500; y <= by1 + 750; y++) {
    const sum = getRowSumRange(y, bx1 + 10, bx2 - 10);
    if (sum > maxBy2) {
      maxBy2 = sum;
      by2 = y;
    }
  }

  console.log('--- BACK CARD DETECTED ---');
  console.log(`x1: ${bx1}, x2: ${bx2}, y1: ${by1}, y2: ${by2}`);
  console.log(`Width: ${bx2 - bx1}, Height: ${by2 - by1}`);

  // Let's crop and save them!
  const croppedFront = await image.clone().extract({ left: fx1, top: fy1, width: fx2 - fx1, height: fy2 - fy1 }).toBuffer();
  const croppedBack = await image.clone().extract({ left: bx1, top: by1, width: bx2 - bx1, height: by2 - by1 }).toBuffer();

  fs.writeFileSync('C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/front-detected.png', croppedFront);
  fs.writeFileSync('C:/Users/NANO/.gemini/antigravity-ide/brain/3257091b-834c-4ba3-946e-d686ca034d94/scratch/back-detected.png', croppedBack);
  console.log('Cropped images saved to scratch folder.');
}

main().catch(console.error);
