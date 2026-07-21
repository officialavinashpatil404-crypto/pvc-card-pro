const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
            scanDir(fullPath);
          }
        } else if (file.toLowerCase().endsWith('.pdf')) {
          console.log(`PDF: ${fullPath} (${(stat.size / 1024).toFixed(1)} KB)`);
        }
      } catch (e) {}
    }
  } catch (e) {}
}

async function main() {
  console.log('--- ALL DOWNLOADS PDFs ---');
  scanDir('C:/Users/NANO/Downloads');
  console.log('--- ALL DESKTOP PDFs ---');
  scanDir('C:/Users/NANO/Desktop');
  console.log('--- ALL DOCUMENTS PDFs ---');
  scanDir('C:/Users/NANO/Documents');
}

main();
