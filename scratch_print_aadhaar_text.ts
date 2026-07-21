import * as fs from 'fs';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';

async function main() {
  const pdfBytes = fs.readFileSync('C:/Users/NANO/Downloads/SONA1974.pdf');
  const decryptedBytes = await decryptPDF(pdfBytes, 'SONA1974');
  const parser = new PDFParse({ data: new Uint8Array(decryptedBytes) });
  const data = await parser.getText();
  await parser.destroy();
  const rawText = data.text || '';

  console.log('--- EXTRACTED TEXT START ---');
  console.log(rawText);
  console.log('--- EXTRACTED TEXT END ---');

  const textUpper = rawText.toUpperCase();
  const hasAadhaarKeywords = textUpper.includes('GOVERNMENT OF INDIA') && textUpper.includes('UNIQUE IDENTIFICATION AUTHORITY');
  console.log('hasAadhaarKeywords (GOVERNMENT OF INDIA & UNIQUE IDENTIFICATION AUTHORITY) =', hasAadhaarKeywords);

  const hasAyushmanKeywords = textUpper.includes('PRADHAN MANTRI JAN AROGYA YOJANA') || 
                              textUpper.includes('PMJAY') || 
                              textUpper.includes('AYUSHMAN');
  const hasPmjayIdPattern = /\bP[A-Z0-9]{8}\b/.test(textUpper) || (textUpper.includes('MALE') && /\b[A-Z0-9]{9}\b/.test(textUpper));
  console.log('hasAyushmanKeywords =', hasAyushmanKeywords);
  console.log('hasPmjayIdPattern =', hasPmjayIdPattern);
  console.log('Matched Ayushman overall =', hasAyushmanKeywords || hasPmjayIdPattern);
}

main().catch(console.error);
