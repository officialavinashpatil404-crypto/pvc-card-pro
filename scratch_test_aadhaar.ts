import * as fs from 'fs';
import * as path from 'path';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/SONA1974.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found at: ${pdfPath}`);
    return;
  }

  const encryptedBytes = fs.readFileSync(pdfPath);
  console.log('[Test] PDF Encrypted Bytes length:', encryptedBytes.length);

  // Try to find the correct password by brute-forcing birth year for "BHUSxxxx" or "NAVAxxxx"
  let decryptedBytes: Uint8Array | null = null;
  let correctPassword = '';
  const prefixes = ['SONA'];
  
  for (const prefix of prefixes) {
    for (let year = 1900; year <= 2026; year++) {
      const pwd = `${prefix}${year}`;
      try {
        decryptedBytes = await decryptPDF(encryptedBytes, pwd);
        correctPassword = pwd;
        console.log(`[Test] Decryption SUCCESS with password: ${pwd}`);
        break;
      } catch (e) {
        // ignore decryption failure
      }
    }
    if (decryptedBytes) break;
  }

  if (!decryptedBytes) {
    console.error('[Test] Failed to decrypt PDF with any birth year for BHUS.');
    return;
  }

  // Save the decrypted PDF
  const outputPath = 'C:/Users/NANO/Downloads/decrypted_aadhaar.pdf';
  fs.writeFileSync(outputPath, decryptedBytes);
  console.log(`[Test] Decrypted PDF saved to: ${outputPath}`);

  // 1. PDF Loaded and Total Pages log
  console.log('PDF_LOADED');
  
  // Load using pdfjs-dist
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(decryptedBytes),
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    console.log('TOTAL_PAGES =', pdf.numPages);

    // 2 & 3. Validate and Log page access
    for (let pageNum = 1; pageNum <= 4; pageNum++) {
      const pageIndex = pageNum - 1;
      console.log(`READING_PAGE_${pageNum}`);
      
      if (pageIndex >= pdf.numPages) {
        throw new Error(`Invalid page index ${pageIndex} of ${pdf.numPages}`);
      }

      const page = await pdf.getPage(pageNum);
      console.log(`[Test] Page ${pageNum} loaded successfully. Width: ${page.view[2]}, Height: ${page.view[3]}`);
    }
  } catch (err: any) {
    console.error('[Test] Crash details:');
    console.error('Exact Stack Trace:', err.stack || err.message);
  }
}

main().catch(console.error);
