const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  const pdfs = [];
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      pdfs.push({
        path: fullPath,
        mtime: stat.mtime,
        size: stat.size
      });
    }
  }
  
  // Sort by mtime descending
  pdfs.sort((a, b) => b.mtime - a.mtime);
  
  console.log(`\n--- RECENT PDFs IN ${dir} ---`);
  pdfs.slice(0, 15).forEach(p => {
    console.log(`${path.basename(p.path)} | Size: ${(p.size/1024).toFixed(1)} KB | Modified: ${p.mtime.toLocaleString()}`);
  });
}

checkDir('C:/Users/NANO/Desktop/AVINASH');
checkDir('C:/Users/NANO/Downloads');
checkDir('C:/Users/NANO/Desktop');
