const fs = require('fs');
const path = require('path');

const paths = [
  './node_modules/pdfjs-dist/build/pdf.js',
  './node_modules/pdfjs-dist/build/pdf.min.js',
  './node_modules/pdfjs-dist/legacy/build/pdf.js',
  './node_modules/pdfjs-dist/legacy/build/pdf.min.js',
  './node_modules/pdfjs-dist/build/pdf.worker.js',
  './node_modules/pdfjs-dist/build/pdf.worker.min.js',
  './node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
  './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js',
  './node_modules/jsqr/dist/jsQR.js'
];

paths.forEach(p => {
  const abs = path.resolve(p);
  console.log(`${p}: ${fs.existsSync(abs) ? 'EXISTS' : 'NOT FOUND'} (${abs})`);
});
