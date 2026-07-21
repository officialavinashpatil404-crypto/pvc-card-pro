import * as pdfjs from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

console.log("Starting native PDF loading test...");

// Create a small 1-page dummy PDF buffer or read a PDF if available
// Since we don't have a PDF path, let's try to load a mock or see if it gets past initialization
try {
  console.log("Calling getDocument with empty/mock data to test worker options check...");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10]), // simple '%PDF-1.4' signature
    useSystemFonts: true,
  });
  
  await loadingTask.promise;
  console.log("Success (unexpected, since PDF is mock)");
} catch (e) {
  console.log("Caught expected/unexpected error:", e.name, "| Message:", e.message);
}
