import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';

console.log("Both pdf and worker imported successfully!");
console.log("workerSrc:", pdfjs.GlobalWorkerOptions.workerSrc);
console.log("workerPort:", pdfjs.GlobalWorkerOptions.workerPort);
