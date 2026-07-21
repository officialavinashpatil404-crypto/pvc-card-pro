import * as fs from 'fs';
import { AadhaarParser } from './src/lib/parsers/AadhaarParser';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';

function detectLanguageFromText(text: string): string {
  if (!text) return 'english';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
  
  if (/[\u0980-\u09FF]/.test(text)) {
    if (/[\u09F0\u09F1]/.test(text)) return 'assamese';
    return 'bengali';
  }
  
  if (/[\u0A00-\u0A7F]/.test(text)) return 'punjabi';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'odia';
  
  if (/[\u0900-\u097F]/.test(text)) {
    if (/[\u0933]/.test(text)) return 'marathi';
    return 'hindi';
  }

  if (/[\u0600-\u06FF]/.test(text)) return 'urdu';
  if (/[\uABC0-\uABFF\uAAE0-\uAAFF]/.test(text)) return 'manipuri';
  
  return 'english';
}

async function main() {
  const filePath = 'C:/Users/NANO/Downloads/OBHU1975.pdf';
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  console.log("Loading and decrypting...");
  const buffer = fs.readFileSync(filePath);
  const decryptedBytes = await decryptPDF(buffer, 'OBHU1975');
  const workingBuffer = Buffer.from(decryptedBytes);

  const parserObj = new PDFParse({ data: workingBuffer });
  const data = await parserObj.getText();
  await parserObj.destroy();
  const text = data.text || '';

  const parser = new AadhaarParser(text, workingBuffer);
  let extractedData: any = await parser.parse();

  console.log("\n--- AFTER PARSER.PARSE() ---");
  console.log("localName:", JSON.stringify(extractedData.localName));
  console.log("localAddress:", JSON.stringify(extractedData.localAddress));
  console.log("name:", JSON.stringify(extractedData.name));
  console.log("address:", JSON.stringify(extractedData.address));

  const originalLocalName = (extractedData.localName || '').trim();
  const originalLocalAddress = (extractedData.localAddress || '').trim();

  // Run the same language detection & logic as in extract/route.ts
  const currentLang = detectLanguageFromText(
    `${extractedData.localName || ''} ${extractedData.localAddress || ''}` || text
  );

  console.log("\nDetected currentLang in route.ts:", currentLang);

  if (currentLang === 'english') {
    extractedData.localAddress = extractedData.address;
    extractedData.localName = '';
  }

  console.log("\n--- AFTER ROUTE.TS English check ---");
  console.log("localName:", JSON.stringify(extractedData.localName));
  console.log("localAddress:", JSON.stringify(extractedData.localAddress));

  const finalLocalName = extractedData.localName;
  const finalLocalAddress = extractedData.localAddress;
  const hasLocalLanguage = !!(finalLocalName?.trim() && finalLocalAddress?.trim());
  console.log("\nhasLocalLanguage:", hasLocalLanguage);
}

main().catch(console.error);
