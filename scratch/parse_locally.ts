import * as fs from 'fs';
import * as path from 'path';
import { DocumentDetector } from '../src/lib/parsers/DocumentDetector';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';

async function main() {
  const filePath = 'C:/Users/NANO/Desktop/AVINASH/doc03132220260624224114.pdf';
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(filePath);
  console.log(`Parsing ${filePath} locally...`);

  const parser = new PDFParse({ data: fileBuffer });
  const parsedData = await parser.getText();
  const text = parsedData.text || '';
  console.log(`Text Length: ${text.length}`);
  console.log(`Text sample: "${text.substring(0, 100)}"`);

  const docParser = DocumentDetector.detectAndParse(text, fileBuffer);
  if (!docParser) {
    console.error(`Could not detect document type!`);
    return;
  }

  console.log(`Detected Document: ${docParser.constructor.name}`);
  const result = await docParser.parse();
  console.log(`Extracted result:`, JSON.stringify(result, null, 2));
}

main().catch(console.error);
