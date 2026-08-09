import fs from 'fs';

const filePath = 'src/app/api/extract/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// Function to decode a string of Latin-1 mojibake bytes into clean UTF-8
function fixMojibakeString(str) {
  try {
    const buf = Buffer.from(str, 'latin1');
    const decoded = buf.toString('utf8');
    if (!decoded.includes('\uFFFD')) {
      return decoded;
    }
  } catch (e) {}
  return str;
}

// Target specific Mojibake patterns starting with \u00E0 ('à') followed by Latin-1 bytes
const mojibakeRegex = /(?:[\u00C0-\u00FF][\u0080-\u00BF]{1,3})+/g;

let matchCount = 0;
let newCode = code.replace(mojibakeRegex, (match) => {
  const fixed = fixMojibakeString(match);
  if (fixed !== match) {
    matchCount++;
    return fixed;
  }
  return match;
});

console.log(`Replaced ${matchCount} Mojibake sequences in ${filePath}`);

fs.writeFileSync(filePath, newCode, 'utf8');
console.log('✅ File written back as clean UTF-8!');
