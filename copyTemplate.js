const fs = require('fs');
const path = require('path');

const src = "C:\\Users\\NANO\\.gemini\\antigravity-ide\\brain\\5e023e96-6664-481b-9be3-9ed4b4f32bd6\\media__1783591914882.png";
const destDir = path.join(__dirname, 'public', 'templates', 'ayushman');
const dest = path.join(destDir, 'ayushman-front-blank.png');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Template copied successfully to', dest);
