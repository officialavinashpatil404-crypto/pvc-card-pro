const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = {
  NotoSansBengali: 'NotoSansBengali',
  NotoSansDevanagari: 'NotoSansDevanagari',
  NotoSansKannada: 'NotoSansKannada',
  NotoSansMalayalam: 'NotoSansMalayalam',
  NotoSansOriya: 'NotoSansOriya',
  NotoSansGurmukhi: 'NotoSansGurmukhi',
  NotoSansTamil: 'NotoSansTamil',
  NotoSansTelugu: 'NotoSansTelugu',
  NotoNastaliqUrdu: 'NotoNastaliqUrdu',
  NotoSansMeeteiMayek: 'NotoSansMeeteiMayek'
};

// Urdu has a slightly different repo structure sometimes, but we will try hinted/ttf first.
// Actually, Noto fonts are also available in noto-fonts repository.

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url} ...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Server responded with ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const destDir = path.join(__dirname, 'public', 'fonts');
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  for (const [fontId, folderName] of Object.entries(fonts)) {
    const regularUrl = `https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/${folderName}/${fontId}-Regular.ttf`;
    const boldUrl = `https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/${folderName}/${fontId}-Bold.ttf`;
    
    try {
      await downloadFile(regularUrl, path.join(destDir, `${fontId}-Regular.ttf`));
      await downloadFile(boldUrl, path.join(destDir, `${fontId}-Bold.ttf`));
      console.log(`Successfully downloaded ${fontId}`);
    } catch (e) {
      console.error(`Failed to download ${fontId} from hinted/ttf. Trying unhinted/ttf...`);
      const regUnhintedUrl = `https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/${folderName}/${fontId}-Regular.ttf`;
      const boldUnhintedUrl = `https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/${folderName}/${fontId}-Bold.ttf`;
      try {
        await downloadFile(regUnhintedUrl, path.join(destDir, `${fontId}-Regular.ttf`));
        await downloadFile(boldUnhintedUrl, path.join(destDir, `${fontId}-Bold.ttf`));
        console.log(`Successfully downloaded ${fontId} (unhinted)`);
      } catch (e2) {
        console.error(`Failed completely for ${fontId}: ${e2.message}`);
      }
    }
  }
}

main();
