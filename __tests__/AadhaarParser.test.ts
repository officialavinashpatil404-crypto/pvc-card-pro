import { AadhaarParser } from '../src/lib/parsers/AadhaarParser';
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';

const mockRawText = `
UNIQUE IDENTIFICATION AUTHORITY OF INDIA
GOVERNMENT OF INDIA
Enrolment No.: 1024/12345/09876
To
  Rajesh Kumar
  S/O Ramesh Kumar
  123 Main St, Sector 4
  New Delhi
  Delhi - 110001
  
Phone: 9876543210
VID: 9012 3456 7890 1234

सत्यमेव जयते

भारत सरकार
Government of India
Rajesh Kumar
राजेश कुमार
DOB: 01/01/1990
जन्म तिथि: 01/01/1990
Male / पुरुष
1234 5678 9012
MALE
मेरा आधार, मेरी पहचान

पता:
C/O Ramesh Kumar, 123 Main St, Sector 4, New Delhi, Delhi, 110001
Address:
C/O Ramesh Kumar, 123 Main St, Sector 4, New Delhi, Delhi, 110001
`;

describe('AadhaarParser Improved Rules & Asset Extraction', () => {
  let pdfBytes: Buffer;

  beforeAll(async () => {
    // Generate a valid PDF in memory with embedded photo (portrait) and QR code (square)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    // 1x1 red PNG (photo placeholder) — different bytes from QR so pdf-lib doesn't deduplicate
    const photoPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQI12P4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==';
    const photoPngBytes = new Uint8Array(Array.from(Buffer.from(photoPngBase64, 'base64')));

    // 1x1 blue PNG (QR placeholder) — different bytes so a separate stream object is created
    const qrPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQI12P4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg==';
    // Make it truly different by padding extra bytes conceptually — use a known distinct blue 1x1:
    const qrPngBase64Real = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';
    const qrPngBytes = new Uint8Array(Array.from(Buffer.from(qrPngBase64Real, 'base64')));

    // Embed the two different PNGs
    const photoImage = await pdfDoc.embedPng(photoPngBytes);
    const qrImage = await pdfDoc.embedPng(qrPngBytes);

    // Draw photo at portrait dimensions, QR at square dimensions
    page.drawImage(photoImage, { x: 50, y: 200, width: 160, height: 200 });
    page.drawImage(qrImage,   { x: 250, y: 200, width: 200, height: 200 });

    const initialBytes = await pdfDoc.save();

    // Load it back to fix the raw stream dimension metadata
    const editDoc = await PDFDocument.load(initialBytes);
    const objects = editDoc.context.enumerateIndirectObjects();
    const imageObjects: PDFRawStream[] = [];
    for (const [ref, obj] of objects) {
      if (obj && obj.constructor && obj.constructor.name === 'PDFRawStream') {
        const rawStream = obj as PDFRawStream;
        const subtype = rawStream.dict.get(PDFName.of('Subtype'));
        if (subtype && subtype.toString() === '/Image') {
          imageObjects.push(rawStream);
        }
      }
    }
    console.log('--- TEST BEFOREALL: Found imageObjects count:', imageObjects.length);

    if (imageObjects.length >= 2) {
      // First image object = photo: portrait 160×200
      imageObjects[0].dict.set(PDFName.of('Width'),  PDFNumber.of(160));
      imageObjects[0].dict.set(PDFName.of('Height'), PDFNumber.of(200));
      // Second image object = QR: square 200×200
      imageObjects[1].dict.set(PDFName.of('Width'),  PDFNumber.of(200));
      imageObjects[1].dict.set(PDFName.of('Height'), PDFNumber.of(200));
    }

    const savedBytes = await editDoc.save();
    pdfBytes = Buffer.from(savedBytes);
  });

  it('extracts name correctly without matching Enrolment No', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const name = parser.extractName();
    console.log('EXTRACTED NAME:', name);
    expect(name).toBe('Rajesh Kumar');
  });

  it('extracts DOB correctly', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const dob = parser.extractDOB();
    console.log('EXTRACTED DOB:', dob);
    expect(dob).toBe('01/01/1990');
  });

  it('extracts gender correctly', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const gender = parser.extractGender();
    console.log('EXTRACTED GENDER:', gender);
    expect(gender).toBe('Male');
  });

  it('extracts Aadhaar number correctly', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const documentNumber = parser.extractDocumentNumber();
    console.log('EXTRACTED AADHAAR NUMBER:', documentNumber);
    expect(documentNumber).toBe('1234 5678 9012');
  });

  it('extracts VID correctly', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const vid = parser.extractVID();
    console.log('EXTRACTED VID:', vid);
    expect(vid).toBe('9012 3456 7890 1234');
  });

  it('extracts mobile correctly', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const mobile = parser.extractMobile();
    console.log('EXTRACTED MOBILE:', mobile);
    expect(mobile).toBe('9876543210');
  });

  it('extracts address correctly', () => {
    const parser = new AadhaarParser(mockRawText, Buffer.from([]));
    const address = parser.extractAddress();
    console.log('EXTRACTED ADDRESS:', address);
    expect(address).toContain('123 Main St');
    expect(address).toContain('110001');
  });

  it('extracts photo and QR code automatically from PDF buffer', async () => {
    const parser = new AadhaarParser(mockRawText, pdfBytes);
    const photo = await parser.extractPhoto();
    const qr = await parser.extractQRCode();

    console.log('EXTRACTED PHOTO LENGTH:', photo ? photo.length : 0);
    console.log('EXTRACTED QR LENGTH:', qr ? qr.length : 0);

    expect(photo).not.toBeNull();
    expect(photo).toContain('data:image/png;base64,');

    expect(qr).not.toBeNull();
    expect(qr).toContain('data:image/png;base64,');
  });

  it('extracts real PDF file successfully', async () => {
    const filePath = 'C:/Users/NANO/Downloads/AARU2016.pdf';
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      console.log('--- Found Real PDF, starting extraction verification ---');
      const realBuffer = fs.readFileSync(filePath);
      
      const parser = new AadhaarParser('', realBuffer);
      const photoBase64 = await parser.extractPhoto();
      const qrBase64 = await parser.extractQRCode();
      
      console.log('=== REAL PDF TEST RESULTS ===');
      console.log('Photo Extracted:', photoBase64 ? `YES (len=${photoBase64.length})` : 'NO');
      console.log('Photo Error:', parser.photoError);
      console.log('QR Extracted:', qrBase64 ? `YES (len=${qrBase64.length})` : 'NO');
      console.log('QR Error:', parser.qrError);
      
      if (photoBase64) {
        fs.writeFileSync('C:/Users/NANO/Downloads/extracted_photo.png', Buffer.from(photoBase64.split(',')[1], 'base64'));
      }
      if (qrBase64) {
        fs.writeFileSync('C:/Users/NANO/Downloads/extracted_qr.png', Buffer.from(qrBase64.split(',')[1], 'base64'));
      }
    } else {
      console.log('Real PDF file not found at Downloads');
    }
  });
});
