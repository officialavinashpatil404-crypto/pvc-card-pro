const fs = require('fs');
const path = require('path');

const frontSrc = "C:\\Users\\NANO\\.gemini\\antigravity-ide\\brain\\9bafbd7f-728b-4c66-8255-f18a816f4f7b\\media__1784014822149.png";
const backSrc  = "C:\\Users\\NANO\\.gemini\\antigravity-ide\\brain\\9bafbd7f-728b-4c66-8255-f18a816f4f7b\\media__1784014822212.png";

const destDir = path.join(__dirname, 'public', 'templates', 'aadhaar');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

fs.copyFileSync(frontSrc, path.join(destDir, 'aadhaar-front.png'));
fs.copyFileSync(backSrc,  path.join(destDir, 'aadhaar-back.png'));

console.log('✅ Aadhaar templates copied successfully!');
console.log('  → aadhaar-front.png');
console.log('  → aadhaar-back.png');
