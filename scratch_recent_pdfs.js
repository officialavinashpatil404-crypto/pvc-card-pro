const fs = require('fs');
const path = require('path');

function getPdfs(dir) {
  const list = [];
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        const fullPath = path.join(dir, file);
        try {
          const stat = fs.statSync(fullPath);
          list.push({ path: fullPath, mtime: stat.mtime });
        } catch (e) {}
      }
    }
  } catch (e) {}
  return list;
}

function main() {
  const dirs = ['C:/Users/NANO/Downloads', 'C:/Users/NANO/Desktop', 'C:/Users/NANO/Desktop/AVINASH', 'C:/Users/NANO/Documents'];
  let all = [];
  for (const dir of dirs) {
    all = all.concat(getPdfs(dir));
  }
  
  all.sort((a, b) => b.mtime - a.mtime);
  
  console.log('--- 15 MOST RECENT PDFs ---');
  for (const item of all.slice(0, 15)) {
    console.log(`${item.path} | Modified: ${item.mtime.toISOString()}`);
  }
}

main();
