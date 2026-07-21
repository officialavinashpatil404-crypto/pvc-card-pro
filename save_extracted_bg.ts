import * as fs from 'fs';
import { AyushmanParser } from './src/lib/parsers/AyushmanParser';

async function main() {
  const pdfPath = 'C:/Users/NANO/Downloads/orginal ayushman card pdf.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    return;
  }
  const buffer = fs.readFileSync(pdfPath);
  
  const parser = new AyushmanParser('', buffer);
  const data = await parser.parse();
  
  if (data.frontCardBase64) {
    const frontBuf = Buffer.from(data.frontCardBase64.split(',')[1], 'base64');
    fs.writeFileSync('C:/Users/NANO/Downloads/raw_front_bg.png', frontBuf);
    console.log('Saved raw_front_bg.png');
  } else {
    console.log('No front background extracted');
  }
  
  if (data.backCardBase64) {
    const backBuf = Buffer.from(data.backCardBase64.split(',')[1], 'base64');
    fs.writeFileSync('C:/Users/NANO/Downloads/raw_back_bg.png', backBuf);
    console.log('Saved raw_back_bg.png');
  } else {
    console.log('No back background extracted');
  }
}

main().catch(console.error);
