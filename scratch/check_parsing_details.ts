import * as fs from 'fs';
import { AadhaarParser } from '../src/lib/parsers/AadhaarParser';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';

// Use the actual classes from the codebase without monkey patching

async function main() {
  const filePath = 'C:/Users/NANO/Downloads/KEVI2019.pdf';
  const fileBuffer = fs.readFileSync(filePath);
  const password = 'KEVI2019';

  console.log('Decrypting PDF...');
  const decryptedBytes = await decryptPDF(fileBuffer, password);

  console.log('Extracting text...');
  const parser = new PDFParse({ data: decryptedBytes });
  const parsedData = await parser.getText();
  const text = parsedData.text || '';
  await parser.destroy();

  const docParser = new AadhaarParser(text, Buffer.from(decryptedBytes), password);
  const result = await docParser.parse();
  
  console.log(`\n==================================================`);
  console.log(`PARSED DETAILS WITH SAFE SPACE-HEALING & DOUBLE-SPACE PRESERVATION:`);
  console.log(`Name:`, result.name);
  console.log(`Local Name:`, result.localName);
  console.log(`DOB:`, result.dob);
  console.log(`Gender:`, result.gender);
  console.log(`Address:`, result.address);
  console.log(`Local Address:`, result.localAddress);
  console.log(`Text Source:`, (docParser as any).qrData ? 'QR_XML' : 'PDF_TEXT');
  console.log(`==================================================`);

  // Let's run gujarati repair on the local address to see if it heals it to Samrat Green City!
  const { repairGujaratiText, getDynamicRepairs } = require('../src/utils/gujaratiRepair');
  const dynamicMap = await getDynamicRepairs();
  const dynamicMappings = Object.fromEntries(dynamicMap.entries());
  const finalRepaired = repairGujaratiText(result.localAddress, dynamicMappings);
  console.log("FINAL REPAIRED ADDRESS FOR CARD RENDERING:");
  console.log(finalRepaired);
}

main().catch(console.error);
