import * as fs from 'fs';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';

async function main() {
  const filePath = 'C:/Users/NANO/Downloads/KEVI2019.pdf';
  const fileBuffer = fs.readFileSync(filePath);
  const password = 'KEVI2019';
  const decryptedBytes = await decryptPDF(fileBuffer, password);

  const parser = new PDFParse({ data: decryptedBytes });
  const parsedData = await parser.getText();
  const text = parsedData.text || '';
  await parser.destroy();

  // Find where the address is in raw text
  const match = text.match(/(સરનામું|સરનામુ|ના  ારા)[\s\S]*?(?=Address|$)/i);
  if (match) {
    console.log("Raw match:", JSON.stringify(match[0]));
    // Print each character and its code point
    console.log("\nCharacter breakdown:");
    for (let i = 0; i < match[0].length; i++) {
      const char = match[0][i];
      const code = match[0].charCodeAt(i);
      console.log(`Index ${i}: '${char}' (U+${code.toString(16).toUpperCase().padStart(4, '0')})`);
    }
  } else {
    console.log("No address pattern matched in raw text");
  }
}

main().catch(console.error);
