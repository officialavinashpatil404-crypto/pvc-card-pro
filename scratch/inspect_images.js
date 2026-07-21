const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function inspect(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  try {
    const meta = await sharp(filePath).metadata();
    console.log(`Image: ${path.basename(filePath)} | Width: ${meta.width} | Height: ${meta.height} | Format: ${meta.format}`);
  } catch (err) {
    console.log(`Error inspecting ${path.basename(filePath)}: ${err.message}`);
  }
}

async function main() {
  const dir = 'C:/Users/NANO/Downloads';
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));
  for (const file of files) {
    await inspect(path.join(dir, file));
  }
}

main();
