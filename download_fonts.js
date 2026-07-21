const https = require('https');
const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, 'public', 'fonts');

if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Map of Font Family -> Google Fonts query name
const FONT_MAP = {
  'NotoSansBengali': 'Noto+Sans+Bengali:wght@400;700',
  'NotoSansDevanagari': 'Noto+Sans+Devanagari:wght@400;700',
  'NotoSansKannada': 'Noto+Sans+Kannada:wght@400;700',
  'NotoSansMalayalam': 'Noto+Sans+Malayalam:wght@400;700',
  'NotoSansOriya': 'Noto+Sans+Oriya:wght@400;700',
  'NotoSansGurmukhi': 'Noto+Sans+Gurmukhi:wght@400;700',
  'NotoSansTamil': 'Noto+Sans+Tamil:wght@400;700',
  'NotoSansTelugu': 'Noto+Sans+Telugu:wght@400;700',
  'NotoNastaliqUrdu': 'Noto+Nastaliq+Urdu:wght@400;700',
  'NotoSansMeeteiMayek': 'Noto+Sans+Meetei+Mayek:wght@400;700'
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function getWoff2Url(familyName) {
  return new Promise((resolve, reject) => {
    const url = `https://fonts.googleapis.com/css2?family=${familyName}&display=swap`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Find URLs
        const regularMatch = data.match(/font-weight: 400;[\s\S]*?url\((https:\/\/[^)]+\.woff2)\)/);
        const boldMatch = data.match(/font-weight: 700;[\s\S]*?url\((https:\/\/[^)]+\.woff2)\)/);
        
        resolve({
          regular: regularMatch ? regularMatch[1] : null,
          bold: boldMatch ? boldMatch[1] : null
        });
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const [fontId, query] of Object.entries(FONT_MAP)) {
    console.log(`Fetching CSS for ${fontId}...`);
    const urls = await getWoff2Url(query);
    
    if (urls.regular) {
      const regularPath = path.join(FONTS_DIR, `${fontId}-Regular.woff2`);
      console.log(`Downloading ${fontId}-Regular.woff2...`);
      await downloadFile(urls.regular, regularPath);
    }
    
    if (urls.bold) {
      const boldPath = path.join(FONTS_DIR, `${fontId}-Bold.woff2`);
      console.log(`Downloading ${fontId}-Bold.woff2...`);
      await downloadFile(urls.bold, boldPath);
    }
  }
  console.log('All fonts downloaded successfully!');
}

main().catch(console.error);
