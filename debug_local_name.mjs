/**
 * DEBUG SCRIPT: Prints raw Unicode codepoints of extracted local name
 * Run: node debug_local_name.mjs <path-to-aadhaar.pdf> [password]
 * This shows EXACTLY what characters are in the PDF text layer
 */
import { readFileSync } from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = process.argv[2];
const password = process.argv[3] || undefined;

if (!pdfPath) {
  console.error('Usage: node debug_local_name.mjs <path.pdf> [password]');
  process.exit(1);
}

const pdfBytes = readFileSync(pdfPath);
const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes), password, useSystemFonts: true });

const pdf = await loadingTask.promise;
let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const pageText = textContent.items.map(item => item.str).join(' ');
  fullText += pageText + '\n';
  console.log(`\n=== PAGE ${i} TEXT ===`);
  console.log(pageText);
}

console.log('\n\n=== FULL TEXT LINES (with non-ASCII highlighted) ===');
const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
for (const line of lines) {
  const hasNonAscii = /[^\x00-\x7F]/.test(line);
  if (hasNonAscii) {
    console.log(`\nLOCAL LANG LINE: "${line}"`);
    console.log('  Codepoints:');
    for (const char of line) {
      const cp = char.codePointAt(0);
      console.log(`    U+${cp.toString(16).toUpperCase().padStart(4,'0')} = "${char}" (${cp})`);
    }
  }
}
