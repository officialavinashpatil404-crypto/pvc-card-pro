import * as fs from 'fs';
import { AadhaarParser } from './src/lib/parsers/AadhaarParser';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';
import { getDynamicRepairs, repairGujaratiText } from './src/utils/gujaratiRepair';

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

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function calculateChangePercentage(original: string, modified: string): number {
  if (!original) return 0;
  const distance = levenshteinDistance(original, modified);
  if (distance <= 6) return 0; 
  return (distance / Math.max(original.length, 1)) * 100;
}

async function main() {
  const filePath = 'C:/Users/NANO/Downloads/OBHU1975.pdf';
  const buffer = fs.readFileSync(filePath);
  const decryptedBytes = await decryptPDF(buffer, 'OBHU1975');
  const workingBuffer = Buffer.from(decryptedBytes);

  const parserObj = new PDFParse({ data: workingBuffer });
  const data = await parserObj.getText();
  await parserObj.destroy();
  const text = data.text || '';

  const parser = new AadhaarParser(text, workingBuffer);
  let extractedData = await parser.parse();

  console.log('[DEBUG] After parser.parse():');
  console.log('  localName =', JSON.stringify(extractedData.localName));
  console.log('  localAddress =', JSON.stringify(extractedData.localAddress));

  const originalLocalName = (extractedData.localName || '').trim();
  const originalLocalAddress = (extractedData.localAddress || '').trim();

  let repairedLocalName = originalLocalName;
  let repairedLocalAddress = originalLocalAddress;

  try {
    const dynamicRepairsMap = await getDynamicRepairs();
    const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
    
    console.log('[DEBUG] Before repairGujaratiText:');
    console.log('  originalLocalName =', JSON.stringify(originalLocalName));
    console.log('  originalLocalAddress =', JSON.stringify(originalLocalAddress));
    
    extractedData.localName = repairGujaratiText(originalLocalName, dynamicMappings);
    extractedData.localAddress = repairGujaratiText(originalLocalAddress, dynamicMappings);
    
    repairedLocalName = extractedData.localName || '';
    repairedLocalAddress = extractedData.localAddress || '';

    console.log('[DEBUG] After repairGujaratiText:');
    console.log('  repairedLocalName =', JSON.stringify(repairedLocalName));
    console.log('  repairedLocalAddress =', JSON.stringify(repairedLocalAddress));
  } catch (err: any) {
    console.error('Repair error:', err.message);
  }

  // Bypassed/Offline fallback path simulation (since DISABLE_GEMINI is true)
  const qrData = (parser as any).qrData || null;
  console.log('[DEBUG] Bypassed/Offline fallback path re-assignment starts.');
  extractedData = {
    ...extractedData,
    name:             (qrData?.name)    || extractedData.name    || '',
    localName:        repairedLocalName || '',
    dob:              (qrData?.dob)     || (qrData?.yob)  || extractedData.dob || '',
    gender:           (qrData?.gender)  || extractedData.gender || '',
    documentNumber:   (qrData?.uid)     || extractedData.documentNumber || '',
    vid:              (qrData?.vid)     || extractedData.vid || '',
    address:          (qrData?.address) || extractedData.address || '',
    localAddress:     repairedLocalAddress || '',
  };
  
  console.log('[DEBUG] After Bypassed/Offline fallback path re-assignment:');
  console.log('  extractedData.localName =', JSON.stringify(extractedData.localName));
  console.log('  extractedData.localAddress =', JSON.stringify(extractedData.localAddress));

  const currentLang = detectLanguageFromText(
    `${extractedData.localName || ''} ${extractedData.localAddress || ''}` || text
  );
  console.log('[DEBUG] currentLang =', currentLang);

  if (currentLang === 'english') {
    extractedData.localAddress = extractedData.address;
    extractedData.localName = '';
  }

  console.log('[DEBUG] After English check:');
  console.log('  extractedData.localName =', JSON.stringify(extractedData.localName));
  console.log('  extractedData.localAddress =', JSON.stringify(extractedData.localAddress));

  const renderedLocalName    = (extractedData.localName    || '').trim();
  const renderedLocalAddress = (extractedData.localAddress || '').trim();
  
  let finalLocalName = renderedLocalName;
  let finalLocalAddress = renderedLocalAddress;

  if (currentLang !== 'english') {
     console.log('[DEBUG] Running change percentage validation...');
     console.log('  originalLocalName =', JSON.stringify(originalLocalName));
     console.log('  renderedLocalName =', JSON.stringify(renderedLocalName));
     const nameChangePct = calculateChangePercentage(originalLocalName, renderedLocalName);
     console.log('  nameChangePct =', nameChangePct);
     if (nameChangePct > 40) {
         finalLocalName = repairedLocalName;
     }

     console.log('  originalLocalAddress =', JSON.stringify(originalLocalAddress));
     console.log('  renderedLocalAddress =', JSON.stringify(renderedLocalAddress));
     const addrChangePct = calculateChangePercentage(originalLocalAddress, renderedLocalAddress);
     console.log('  addrChangePct =', addrChangePct);
     if (addrChangePct > 20) {
         finalLocalAddress = repairedLocalAddress;
     }
  }

  extractedData.localName = finalLocalName;
  extractedData.localAddress = finalLocalAddress;

  console.log('[DEBUG] Final ExtractedData:');
  console.log('  localName =', JSON.stringify(extractedData.localName));
  console.log('  localAddress =', JSON.stringify(extractedData.localAddress));
}

main().catch(console.error);
