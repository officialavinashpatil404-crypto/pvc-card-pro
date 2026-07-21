import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { AyushmanParser } from './src/lib/parsers/AyushmanParser';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF file not found at: ${pdfPath}`);
    return;
  }

  console.log(`[Test] Loading PDF from ${pdfPath}...`);
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  console.log('[Test] Parsing PDF text...');
  const pdfParseObj = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const textData = await pdfParseObj.getText();
  await pdfParseObj.destroy();
  const rawText = textData.text || '';
  console.log(`[Test] PDF Text Length: ${rawText.length}`);
  
  console.log('[Test] Initializing AyushmanParser...');
  const parser = new AyushmanParser(rawText, pdfBuffer, null);
  
  console.log('[Test] Executing parse()...');
  try {
    const start = Date.now();
    const result = await parser.parse();
    console.log(`[Test] Execution completed in ${Date.now() - start}ms`);
    console.log('[Test] Extracted Data keys:', Object.keys(result));
    console.log('[Test] Front card base64 length:', result.frontCardBase64?.length);
    console.log('[Test] Back card base64 length:', result.backCardBase64?.length);
  } catch (err: any) {
    console.error('[Test] Parser crashed with error:', err);
    console.error('[Test] Error stack:', err.stack);
  }
}

main().catch(console.error);
