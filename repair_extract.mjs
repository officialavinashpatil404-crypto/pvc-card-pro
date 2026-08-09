import { readFileSync, writeFileSync } from 'fs';

const path = 'src/app/api/extract/route.ts';
const buf = readFileSync(path);

console.log('File size (bytes):', buf.length);

// Properly decode multi-byte UTF-8 sequences
let result = '';
let i = 0;
let skipped = 0;

while (i < buf.length) {
  const byte = buf[i];
  
  if (byte < 0x80) {
    // ASCII - single byte
    result += String.fromCharCode(byte);
    i++;
  } else if (byte >= 0xC2 && byte <= 0xDF && i + 1 < buf.length && (buf[i+1] & 0xC0) === 0x80) {
    // 2-byte UTF-8 sequence
    const cp = ((byte & 0x1F) << 6) | (buf[i+1] & 0x3F);
    result += String.fromCodePoint(cp);
    i += 2;
  } else if (byte >= 0xE0 && byte <= 0xEF && i + 2 < buf.length && (buf[i+1] & 0xC0) === 0x80 && (buf[i+2] & 0xC0) === 0x80) {
    // 3-byte UTF-8 sequence
    const cp = ((byte & 0x0F) << 12) | ((buf[i+1] & 0x3F) << 6) | (buf[i+2] & 0x3F);
    result += String.fromCodePoint(cp);
    i += 3;
  } else if (byte >= 0xF0 && byte <= 0xF4 && i + 3 < buf.length && (buf[i+1] & 0xC0) === 0x80 && (buf[i+2] & 0xC0) === 0x80 && (buf[i+3] & 0xC0) === 0x80) {
    // 4-byte UTF-8 sequence
    const cp = ((byte & 0x07) << 18) | ((buf[i+1] & 0x3F) << 12) | ((buf[i+2] & 0x3F) << 6) | (buf[i+3] & 0x3F);
    result += String.fromCodePoint(cp);
    i += 4;
  } else {
    // Invalid/lone continuation byte - skip it
    skipped++;
    i++;
  }
}

console.log('Skipped bad bytes:', skipped);
console.log('Output chars:', result.length);

writeFileSync(path, result, 'utf8');
console.log('✅ Written back as clean UTF-8');

// Verify
try {
  const verify = readFileSync(path);
  verify.toString('utf8'); // will throw if invalid
  console.log('✅ Verification passed - file is valid UTF-8!');
  console.log('File size after fix:', verify.length, 'bytes');
} catch(e) {
  console.log('❌ Still invalid:', e.message);
}
