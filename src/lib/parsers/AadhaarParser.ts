import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream, PDFDict } from 'pdf-lib';
import { BaseParser } from './BaseParser';
import * as zlib from 'zlib';
import jsQR from 'jsqr';
import sharp from 'sharp';

function crc32(buf: Buffer | Uint8Array): number {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, data.length);
  buf.set(Buffer.from(type, 'ascii'), 4);
  buf.set(data, 8);
  const crcInput = buf.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return buf;
}

function rawToPng(rawPixels: Uint8Array, width: number, height: number, bytesPerPixel: number): Buffer {
  const scanlineLength = width * bytesPerPixel;
  const filtered = new Uint8Array(height * (scanlineLength + 1));
  for (let y = 0; y < height; y++) {
    const srcOffset = y * scanlineLength;
    const destOffset = y * (scanlineLength + 1);
    filtered[destOffset] = 0; // Filter type 0 (None)
    filtered.set(rawPixels.subarray(srcOffset, srcOffset + scanlineLength), destOffset + 1);
  }

  const compressed = zlib.deflateSync(filtered);

  const ihdrData = new Uint8Array(13);
  const view = new DataView(ihdrData.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = bytesPerPixel === 3 ? 2 : (bytesPerPixel === 4 ? 6 : 0); // Color type: 2 (RGB), 6 (RGBA), 0 (Grayscale)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export class AadhaarParser extends BaseParser {
  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'UNKNOWN' {
    return 'AADHAAR';
  }

  private rawStreamToBase64(rawStream: PDFRawStream, width: number, height: number, filter: string): string {
    if (filter.includes('DCTDecode') || filter.includes('DCT')) {
      const bytes = rawStream.getContents();
      return `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
    } else {
      try {
        const decodedStream = decodePDFRawStream(rawStream as any);
        const bytes = (decodedStream as any).getBytes();
        const pixelCount = width * height;
        const bpp = Math.floor(bytes.length / pixelCount);

        if (bpp === 1 || bpp === 3 || bpp === 4) {
          const pngBuffer = rawToPng(bytes, width, height, bpp);
          return `data:image/png;base64,${pngBuffer.toString('base64')}`;
        } else {
          return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
        }
      } catch (err: any) {
        console.error('[AadhaarParser] Error converting raw stream to base64 PNG:', err.message);
        try {
          const bytes = rawStream.getContents();
          return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
        } catch (e) {
          return '';
        }
      }
    }
  }

  private extractCoName(): { english: string | null; local: string | null } {
    const lines = this.rawText.split('\n').map(l => l.trim());
    let englishCo: string | null = null;
    let localCo: string | null = null;

    const coRegex = /(?:C\/O|W\/O|S\/O|D\/O|H\/O|F\/O|Care\s+of|Son\s+of|Wife\s+of|Daughter\s+of|Husband\s+of|Father\s+of)\s*[:/,-]?\s*([A-Za-z\s.]+)/i;
    const match = this.rawText.match(coRegex);
    if (match && match[1].trim().length >= 2) {
      englishCo = match[1].trim().replace(/^[,\s:\-]+/, '').replace(/[,\s:\-]+$/, '');
    }

    if (!englishCo) {
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^(?:C\/O|W\/O|S\/O|D\/O|H\/O|F\/O|Care\s+of|Son\s+of|Wife\s+of|Daughter\s+of|CO|WO|SO|DO)[:\s,-]*$/i.test(lines[i])) {
          const nextLine = lines[i + 1];
          if (/^[A-Za-z\s.]+$/.test(nextLine) && nextLine.length >= 2) {
            englishCo = nextLine.replace(/^[,\s:\-]+/, '').replace(/[,\s:\-]+$/, '');
            break;
          }
        }
      }
    }

    const localCoRegex = /(?:દ્વારા|द्वारा|પિતા|પતિ|આત્મજ|સુપુત્ર|સુપુત્રી|કેર\s+ઓફ|મારફતે)\s*[:/,-]?\s*([^\nA-Za-z0-9,.:\-/]+)/i;
    const localMatch = this.rawText.match(localCoRegex);
    if (localMatch && localMatch[1].trim().length >= 2) {
      localCo = localMatch[1].trim().replace(/^[,\s:\-]+/, '').replace(/[,\s:\-]+$/, '');
    }

    if (!localCo) {
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^(?:દ્વારા|द्वारा|પિતા|પતિ|આત્મજ|કેર\s+ઓફ|મારફતે)[:\s,-]*$/i.test(lines[i])) {
          const nextLine = lines[i + 1];
          if (/[^\x00-\x7F]/.test(nextLine) && nextLine.length >= 2) {
            localCo = nextLine.replace(/^[,\s:\-]+/, '').replace(/[,\s:\-]+$/, '');
            break;
          }
        }
      }
    }

    return { english: englishCo, local: localCo };
  }

  extractName(): string | null {
    console.log('[AadhaarParser] Running Name extraction rules');
    const coData = this.extractCoName();
    if (coData.english) console.log(`[AadhaarParser] Detected C/O name to filter: "${coData.english}"`);
    
    const isCoName = (text: string): boolean => {
      if (!text) return false;
      const t = text.trim().toLowerCase();
      if (!coData.english) return false;
      const co = coData.english.trim().toLowerCase();
      if (!co) return false;
      return t === co;
    };

    // ── PRIORITY 0: QR Code name (most accurate — direct from UIDAI) ──
    if (this.qrData && this.qrData.name) {
      const qrName = this.qrData.name.trim();
      if (qrName.length >= 2 && !/\d/.test(qrName) && !isCoName(qrName)) {
        console.log(`[AadhaarParser] Name found via QR code attributes: ${qrName}`);
        return qrName;
      }
    }

    const lines = this.rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const isNoise = (text: string): boolean => {
      const trimmed = text.trim();
      const lower = trimmed.toLowerCase();
      if (lower === 'to' || lower === 'to,' || lower === 'to:' || lower === 'from' || lower === 'from:') return true;
      if (/\d/.test(trimmed)) return true;

      // Exact word boundary regex: matches standalone labels (like 'vid', 'dob', 'po', 'vtc') without breaking names like 'Vidhi'
      const noiseWordRegex = /\b(?:enrolment|enrollment|phone|mobile|email|unique|authority|government|india|address|signature|date|dob|yob|y\.o\.b\.|d\.o\.b\.|male|female|transgender|information|download|generation|help|valid|identity|aadhaar|virtual|vid|details|issue|vtc|po|district|dist|state|pin|code|pincode|city|village|taluka|tehsil|nagar|park|road|street|society|colony|house|plot|sector|block|building|floor|flat|near|behind|opposite|lane|marg|chawk|bazar|bazaar|gali|mohalla|post|thana)\b/i;

      return noiseWordRegex.test(trimmed);
    };

    // Strict guard: MUST NOT be a relationship line or follow a C/O line
    const isRelationshipLine = (text: string, prevText?: string): boolean => {
      const trimmed = text.trim();
      const isRel = /^(?:W\/O|S\/O|D\/O|C\/O|H\/O|F\/O|W\.O\.|S\.O\.|D\.O\.|C\.O\.|Care\s+of|Son\s+of|Wife\s+of|Daughter\s+of|Husband\s+of|Father\s+of|CO|WO|SO|DO)\b/i.test(trimmed);
      if (isRel) return true;
      if (prevText && /^(?:W\/O|S\/O|D\/O|C\/O|H\/O|F\/O|W\.O\.|S\.O\.|D\.O\.|C\.O\.|Care\s+of|Son\s+of|Wife\s+of|Daughter\s+of|Husband\s+of|Father\s+of|CO|WO|SO|DO)[:\s,-]*$/i.test(prevText.trim())) {
        return true;
      }
      return false;
    };

    const isEnglish = (text: string): boolean => {
      return /^[A-Za-z\s\.]+$/.test(text);
    };

    // Find address section boundary so we NEVER parse names from the back card address block
    const addressLineIdx = lines.findIndex(l => /^Address\s*[:/]/i.test(l) || /^पता\s*[:/]/i.test(l) || /^(સરનામું|મુગવરી|చిరునామా|విళાસ|മേൽവിലാസം|ঠিকানা|ଠିକଣା|ਪਤਾ)\s*[:/]/i.test(l));
    const searchLimit = addressLineIdx > 0 ? addressLineIdx : lines.length;

    // Heuristic 1 (TOP PRIORITY): Find line after 'To' or 'To,' (in top letter block)
    // In e-Aadhaar PDFs, 'To' is followed directly by Local Name and English Name!
    for (let i = 0; i < searchLimit - 1; i++) {
      if (/^to\b[:,]?/i.test(lines[i])) {
        for (let offset = 1; offset <= 3; offset++) {
          const candidateIndex = i + offset;
          if (candidateIndex < searchLimit) {
            const candidate = lines[candidateIndex].trim();
            const prevCandidate = candidateIndex > 0 ? lines[candidateIndex - 1] : undefined;
            if (candidate && isEnglish(candidate) && !isNoise(candidate) && !isRelationshipLine(candidate, prevCandidate) && !isCoName(candidate) && candidate.length >= 2 && candidate.toLowerCase() !== 'to') {
              console.log(`[AadhaarParser] Name found via 'To' block: ${candidate}`);
              return candidate;
            }
          }
        }
      }
    }

    // Heuristic 2: Look ABOVE DOB/Birth lines (front card cutout)
    for (let i = 0; i < searchLimit; i++) {
      if (/(?:DOB|Year\s*of\s*Birth|YOB|जन्म\s*तिथि|જન્મ\s*તારીખ)/i.test(lines[i])) {
        for (let offset = 1; offset <= 3; offset++) {
          const candidateIndex = i - offset;
          if (candidateIndex >= 0) {
            const candidate = lines[candidateIndex];
            const prevCandidate = candidateIndex > 0 ? lines[candidateIndex - 1] : undefined;
            if (isEnglish(candidate) && !isNoise(candidate) && !isRelationshipLine(candidate, prevCandidate) && !isCoName(candidate) && candidate.length >= 2) {
              console.log(`[AadhaarParser] Name found above DOB block: ${candidate}`);
              return candidate;
            }
          }
        }
      }
    }

    // Heuristic 3: Find Name labels: "Name / नाम : <Name>" or "Name: <Name>"
    const nameLabelRegex = /(?:Name|नाम)\s*[\/|:|:\-]*\s*([A-Za-z\s\.]+)/i;
    const labelMatch = this.rawText.match(nameLabelRegex);
    if (labelMatch) {
      const candidate = labelMatch[1].trim();
      if (isEnglish(candidate) && !isNoise(candidate) && !isRelationshipLine(candidate) && !isCoName(candidate) && candidate.length >= 2) {
        console.log(`[AadhaarParser] Name found via label: ${candidate}`);
        return candidate;
      }
    }

    // Heuristic 4: Scan all lines before address block for the first clean English title-case name
    for (let i = 0; i < searchLimit; i++) {
      const candidate = lines[i];
      const prevCandidate = i > 0 ? lines[i - 1] : undefined;
      if (isEnglish(candidate) && !isNoise(candidate) && !isRelationshipLine(candidate, prevCandidate) && !isCoName(candidate) && candidate.length >= 2) {
        if (/^[A-Z][A-Za-z\s\.]+$/.test(candidate) && !candidate.toLowerCase().startsWith('to')) {
          console.log(`[AadhaarParser] Name found via pre-address scan: ${candidate}`);
          return candidate;
        }
      }
    }

    // Fallback: look for English title-case phrase before address block
    const preAddressText = lines.slice(0, searchLimit).join('\n');
    const genericNameMatch = preAddressText.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g);
    if (genericNameMatch) {
      for (const candidate of genericNameMatch) {
        if (!isNoise(candidate) && !isRelationshipLine(candidate) && !isCoName(candidate) && candidate.length >= 2) {
          console.log(`[AadhaarParser] Name found via fallback generic regex: ${candidate}`);
          return candidate;
        }
      }
    }

    console.log('[AadhaarParser] Name extraction failed');
    return null;
  }

  extractDOB(): string | null {
    console.log('[AadhaarParser] Running DOB extraction regex');
    // Looks for DOB / Year of Birth / जन्म तिथि / जन्म वर्ष
    const dobRegex = /(?:DOB|Year\s*of\s*Birth|YOB|जन्म\s*तिथि|जन्म\s*वर्ष)[\s/:\-नाम]*([\d]{2}[\-/][\d]{2}[\-/][\d]{4}|[\d]{4})/i;
    const match = this.rawText.match(dobRegex);
    if (match) {
      console.log(`[AadhaarParser] DOB regex result: ${match[1].trim()}`);
      return match[1].trim();
    }
    // Fallback: look for any DD/MM/YYYY or DD-MM-YYYY in the text
    const fallbackMatch = this.rawText.match(/\b\d{2}[-/]\d{2}[-/]\d{4}\b/);
    if (fallbackMatch) {
      console.log(`[AadhaarParser] DOB fallback result: ${fallbackMatch[0]}`);
      return fallbackMatch[0];
    }
    console.log('[AadhaarParser] DOB regex failed to match');
    return null;
  }

  extractGender(): string | null {
    console.log('[AadhaarParser] Running Gender extraction regex');
    const textUpper = this.rawText.toUpperCase();
    if (textUpper.includes('FEMALE') || textUpper.includes('महिला')) {
      console.log('[AadhaarParser] Gender matched: Female');
      return 'Female';
    }
    if (textUpper.includes('MALE') || textUpper.includes('पुरुष')) {
      console.log('[AadhaarParser] Gender matched: Male');
      return 'Male';
    }
    if (textUpper.includes('TRANSGENDER') || textUpper.includes('किन्नर')) {
      console.log('[AadhaarParser] Gender matched: Transgender');
      return 'Transgender';
    }
    console.log('[AadhaarParser] Gender regex failed to match');
    return null;
  }

  extractDocumentNumber(): string | null {
    console.log('[AadhaarParser] Running Document Number extraction regex');
    // Split into lines to inspect
    const lines = this.rawText.split('\n');
    const maskedRegex = /\b(?:\d{4}|[Xx*]{4})[\s-]?(?:\d{4}|[Xx*]{4})[\s-]?\d{4}\b/;
    
    for (const line of lines) {
      // Ignore lines that contain VID or Virtual ID
      if (/(?:VID|Virtual|वर्चुअल)/i.test(line)) {
        continue;
      }
      
      const match = line.match(maskedRegex);
      if (match) {
        // Double check: is this match part of a 16-digit VID?
        const vidRegex = /\b(?:\d{4}|[Xx*]{4})[\s-]?(?:\d{4}|[Xx*]{4})[\s-]?(?:\d{4}|[Xx*]{4})[\s-]?\d{4}\b/;
        if (vidRegex.test(line)) {
          continue;
        }
        
        console.log(`[AadhaarParser] Document Number matched: ${match[0].trim()}`);
        return match[0].trim();
      }
    }
    
    console.log('[AadhaarParser] Document Number regex failed to match');
    return null;
  }

  extractAddress(): string | null {
    console.log('[AadhaarParser] Running Address extraction regex');

    // Prioritize assembling clean address from QR code data if available
    if (this.qrData) {
      const parts = [];
      if (this.qrData.co) parts.push(this.qrData.co);
      if (this.qrData.house) parts.push(this.qrData.house);
      if (this.qrData.street) parts.push(this.qrData.street);
      if (this.qrData.lm) parts.push(this.qrData.lm);
      if (this.qrData.loc) parts.push(this.qrData.loc);
      if (this.qrData.vtc) parts.push(this.qrData.vtc);
      if (this.qrData.po) parts.push(this.qrData.po);
      if (this.qrData.dist) parts.push(this.qrData.dist);
      if (this.qrData.state) parts.push(this.qrData.state);

      let baseAddr = parts.filter(Boolean).join(', ');
      if (this.qrData.pc) {
        baseAddr += ' - ' + this.qrData.pc;
      }
      if (baseAddr.trim().length > 5) {
        console.log('[AadhaarParser] Address assembled from QR code attributes:', baseAddr);
        return baseAddr;
      }
    }

    // Heuristic 1: Look for English Address: block specifically
    const addressRegex = /Address\s*[:/]\s*([\s\S]+?)(?=\b\d{6}\b)/i;
    let match = this.rawText.match(addressRegex);
    
    // Fallback: check other regional address labels if English "Address:" is not found
    if (!match) {
      const fallbackRegex = /(?:Address|पता|સરનામું|સરનામુ|முகவரி|చిరునామా|విళಾಸ|മേൽவിലാസം|ঠিকানা|ଠିକଣา|ਪਤਾ)\s*[:/]\s*([\s\S]+?)(?=\b\d{6}\b)/i;
      match = this.rawText.match(fallbackRegex);
    }

    if (match) {
      const pinMatch = this.rawText.match(/\b\d{6}\b/);
      let cleanAddress = match[1].replace(/\s+/g, ' ').trim();
      cleanAddress = cleanAddress.replace(/^[,\s:\-]+/, '');
      if (pinMatch) {
        cleanAddress += ', ' + pinMatch[0];
      }
      console.log(`[AadhaarParser] Address extracted via card block: ${cleanAddress.substring(0, 30)}...`);
      return cleanAddress;
    }

    // Heuristic 2: Fallback to the 'To' block address
    const name = this.extractName();
    if (name) {
      const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const toNameRegex = new RegExp(`To\\s*,?\\s*\\n?\\s*${escapedName}\\s*,?\\s*\\n?([\\s\\S]+?)(?=\\b\\d{6}\\b)`, 'i');
      const toMatch = this.rawText.match(toNameRegex);
      if (toMatch) {
        const pinMatch = this.rawText.match(/\b\d{6}\b/);
        let cleanAddress = toMatch[1].replace(/\s+/g, ' ').trim();
        cleanAddress = cleanAddress.replace(/^[,\s:\-]+/, '');
        if (pinMatch) {
          cleanAddress += ', ' + pinMatch[0];
        }
        console.log(`[AadhaarParser] Address extracted via 'To' block fallback: ${cleanAddress.substring(0, 30)}...`);
        return cleanAddress;
      }
    }

    console.log('[AadhaarParser] Address regex failed to match');
    return null;
  }

  extractVID(): string | null {
    console.log('[AadhaarParser] Running VID extraction rules');
    // Heuristic 1: Look for "VID" label followed by 16 digits (possibly with spaces or hyphens)
    const vidRegex = /(?:VID|Virtual\s*ID|वर्चुअल\s*आईडी|आईडी)\s*[:\-\s]?\s*(\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b)/i;
    const match = this.rawText.match(vidRegex);
    if (match) {
      console.log(`[AadhaarParser] VID matched via label: ${match[1].trim()}`);
      return match[1].trim();
    }
    // Heuristic 2: Look for any standalone 16 digit number grouped in 4s or sequential
    const fallbackMatch = this.rawText.match(/\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/);
    if (fallbackMatch) {
      console.log(`[AadhaarParser] VID matched via standalone 16-digit regex: ${fallbackMatch[0]}`);
      return fallbackMatch[0];
    }
    console.log('[AadhaarParser] VID extraction failed');
    return null;
  }

  extractMobile(): string | null {
    console.log('[AadhaarParser] Running Mobile extraction rules');
    // Look for mobile keyword followed by colon/dash and then masked or unmasked 10 digit number
    const mobileRegex = /(?:Mobile|Phone|tele|मोबाइल|फ़ोन|मो)\s*(?:Number|No|नं|नंबर)?\s*[:\-\s]?\s*(\b(?:[Xx*\d]{5,7}\d{3,5}|\d{10})\b)/i;
    const match = this.rawText.match(mobileRegex);
    if (match) {
      console.log(`[AadhaarParser] Mobile matched via label: ${match[1].trim()}`);
      return match[1].trim();
    }
    // Heuristic 2: standalone 10 digit number starting with 6-9
    const fallbackMatch = this.rawText.match(/\b[6-9]\d{9}\b/);
    if (fallbackMatch) {
      console.log(`[AadhaarParser] Mobile matched via standalone 10-digit regex: ${fallbackMatch[0]}`);
      return fallbackMatch[0];
    }
    console.log('[AadhaarParser] Mobile extraction failed');
    return null;
  }

  private hasExtractedAssets = false;
  private extractedPhoto: string | null = null;
  private extractedQR: string | null = null;
  public photoError: string | null = null;
  public qrError: string | null = null;

  private async extractAssets() {
    if (this.hasExtractedAssets) return;
    this.hasExtractedAssets = true;

    try {
      console.log('[AadhaarParser] Loading PDF for asset extraction using pdf-lib...');
      const pdfDoc = await PDFDocument.load(new Uint8Array(this.pdfBuffer));
      console.log('[AadhaarParser] PDF_LOADED: PDF loaded successfully for asset extraction');
      
      const candidates: Array<{ base64: string; width: number; height: number; filter: string }> = [];

      const resolveXObjects = (xObjectDict: PDFDict) => {
        const keys = xObjectDict.keys();
        for (const key of keys) {
          try {
            const obj = xObjectDict.lookup(key);
            if (!obj) continue;

            const isRawStream = obj && (
              obj.constructor?.name === 'PDFRawStream' ||
              (typeof obj === 'object' && 'dict' in obj && typeof (obj as any).dict?.get === 'function' && typeof (obj as any).getContents === 'function')
            );

            if (isRawStream) {
              const rawStream = obj as PDFRawStream;
              const { dict } = rawStream;
              const subtype = dict.get(PDFName.of('Subtype'));
              const subtypeStr = subtype ? subtype.toString() : '';

              if (subtypeStr === '/Image' || subtypeStr === 'Image') {
                const widthObj = dict.get(PDFName.of('Width'));
                const heightObj = dict.get(PDFName.of('Height'));
                const filterObj = dict.get(PDFName.of('Filter'));

                const width = widthObj ? Number(widthObj.toString()) : 0;
                const height = heightObj ? Number(heightObj.toString()) : 0;
                const filter = filterObj ? filterObj.toString() : '';

                if (width > 0 && height > 0) {
                  const base64 = this.rawStreamToBase64(rawStream, width, height, filter);
                  if (base64 && !candidates.some(c => c.base64 === base64)) {
                    candidates.push({ base64, width, height, filter });
                  }
                }
              } else if (subtypeStr === '/Form' || subtypeStr === 'Form') {
                const nestedResources = dict.get(PDFName.of('Resources'));
                if (nestedResources && nestedResources instanceof PDFDict) {
                  const nestedXObject = nestedResources.lookupMaybe(PDFName.of('XObject'), PDFDict);
                  if (nestedXObject) {
                    resolveXObjects(nestedXObject);
                  }
                }
              }
            }
          } catch (e: any) {
            console.error('[AadhaarParser] Error resolving XObject:', e.message);
          }
        }
      };

      // 1. Recursive Page XObjects resolution
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const resources = page.node.Resources();
        if (resources) {
          const xObjectDict = resources.lookupMaybe(PDFName.of('XObject'), PDFDict);
          if (xObjectDict) {
            resolveXObjects(xObjectDict);
          }
        }
      }

      // 2. Flat Indirect Objects resolution (fallback)
      const objects = pdfDoc.context.enumerateIndirectObjects();
      for (const [ref, obj] of objects) {
        const isRawStream = obj && (
          obj.constructor?.name === 'PDFRawStream' ||
          (typeof obj === 'object' && 'dict' in obj && typeof (obj as any).dict?.get === 'function' && typeof (obj as any).getContents === 'function')
        );

        if (isRawStream) {
          const rawStream = obj as PDFRawStream;
          const { dict } = rawStream;
          const subtype = dict.get(PDFName.of('Subtype'));
          const subtypeStr = subtype ? subtype.toString() : '';

          if (subtypeStr === '/Image' || subtypeStr === 'Image') {
            try {
              const widthObj = dict.get(PDFName.of('Width'));
              const heightObj = dict.get(PDFName.of('Height'));
              const filterObj = dict.get(PDFName.of('Filter'));

              const width = widthObj ? Number(widthObj.toString()) : 0;
              const height = heightObj ? Number(heightObj.toString()) : 0;
              const filter = filterObj ? filterObj.toString() : '';

              if (width > 0 && height > 0) {
                const base64 = this.rawStreamToBase64(rawStream, width, height, filter);
                if (base64 && !candidates.some(c => c.base64 === base64)) {
                  candidates.push({ base64, width, height, filter });
                }
              }
            } catch (err: any) {
              console.error('[AadhaarParser] Fallback error decoding image object:', err.message);
            }
          }
        }
      }

      console.log(`[AadhaarParser] QR_DETECTION_START: Analysing ${candidates.length} image object(s)`);
      // Log heuristic analysis for trace logs
      for (const c of candidates) {
        const aspectRatio = c.width / c.height;
        
        // QR: must be near-perfect square (width/height within 10% of 1.0)
        const isSquare = Math.abs(aspectRatio - 1.0) <= 0.1;
        const isMinQRSize = c.width >= 100 && c.height >= 100;
        if (isSquare && isMinQRSize) {
          console.log(`[AadhaarParser] QR_CANDIDATE_LOGGED: ${c.width}x${c.height} aspectRatio=${aspectRatio.toFixed(3)} filter=${c.filter}`);
        }

        // Photo: portrait orientation with reasonable dimensions
        const photoRatio = c.height / c.width;
        const isPhotoRatio = photoRatio >= 1.05 && photoRatio <= 1.8;
        const isMinPhotoSize = c.width >= 50 && c.height >= 70;
        const isMaxPhotoSize = c.width <= 400 && c.height <= 550;
        if (isPhotoRatio && isMinPhotoSize && isMaxPhotoSize) {
          console.log(`[AadhaarParser] PHOTO_CANDIDATE_LOGGED: ${c.width}x${c.height} aspectRatio=${aspectRatio.toFixed(3)} filter=${c.filter}`);
        }
      }

      // Filter QR Candidates — near-perfect squares only (within 10% of 1.0 aspect ratio)
      const qrCandidates = candidates.filter(c => {
        const aspectRatio = c.width / c.height;
        const isSquare = Math.abs(aspectRatio - 1.0) <= 0.1;
        const isMinQRSize = c.width >= 100 && c.height >= 100;
        return isSquare && isMinQRSize;
      });

      // Filter Photo Candidates — portrait ratio, portrait-range size
      const photoCandidates = candidates.filter(c => {
        const photoRatio = c.height / c.width;
        const isPhotoRatio = photoRatio >= 1.05 && photoRatio <= 1.8;
        const isMinPhotoSize = c.width >= 50 && c.height >= 70;
        const isMaxPhotoSize = c.width <= 400 && c.height <= 550;
        return isPhotoRatio && isMinPhotoSize && isMaxPhotoSize;
      });
      console.log(`[AadhaarParser] QR candidates after filter: ${qrCandidates.length}, Photo candidates after filter: ${photoCandidates.length}`);

      // Select best QR Code
      if (qrCandidates.length > 0) {
        qrCandidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        this.extractedQR = qrCandidates[0].base64;
        console.log(`[AadhaarParser] QR_EXTRACTED: Matched QR image ${qrCandidates[0].width}x${qrCandidates[0].height} filter=${qrCandidates[0].filter} base64len=${this.extractedQR.length}`);
      } else {
        const reason = candidates.length === 0 
          ? 'No image objects found in PDF' 
          : `Found ${candidates.length} image objects, none passed square heuristic (aspectRatio within 0.1 of 1.0, size >= 100x100). Sizes: ${candidates.map(c => `${c.width}x${c.height}`).join(', ')}`;
        console.warn(`[AadhaarParser] QR_NOT_FOUND: ${reason}`);
        this.qrError = reason;
      }

      // Select best Photo
      if (photoCandidates.length > 0) {
        const dctPhotos = photoCandidates.filter(c => c.filter.includes('DCTDecode'));
        const sourceList = dctPhotos.length > 0 ? dctPhotos : photoCandidates;
        sourceList.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        this.extractedPhoto = sourceList[0].base64;
        console.log(`[AadhaarParser] PHOTO_EXTRACTED: Matched photo image ${sourceList[0].width}x${sourceList[0].height} filter=${sourceList[0].filter} base64len=${this.extractedPhoto.length}`);
      } else {
        const reason = candidates.length === 0 
          ? 'No image objects found in PDF' 
          : `Found ${candidates.length} image objects, none passed portrait heuristic (ratio 1.05-1.8, size 50x70 to 400x550). Sizes: ${candidates.map(c => `${c.width}x${c.height}`).join(', ')}`;
        console.warn(`[AadhaarParser] PHOTO_NOT_FOUND: ${reason}`);
        this.photoError = reason;
      }

    } catch (error: any) {
      console.error('[AadhaarParser] Failed to extract assets from PDF:', error.message);
      this.photoError = `Asset extraction failed: ${error.message}`;
      this.qrError = `Asset extraction failed: ${error.message}`;
    }
  }

  async extractPhoto(): Promise<string | null> {
    await this.extractAssets();
    return this.extractedPhoto;
  }

  public qrData: any = null;

  async decodeQRCode(): Promise<any> {
    console.log('[AadhaarParser] QR_DECODE_STARTED');
    if (!this.extractedQR) {
      console.log('[AadhaarParser] QR decode aborted: No QR image extracted');
      return null;
    }

    try {
      const base64Data = this.extractedQR.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const { data, info } = await sharp(imageBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
      
      if (code) {
        console.log('[AadhaarParser] QR_DECODE_SUCCESS: Decoded payload length: ' + code.data.length);
        
        let xmlString = '';
        
        // Check if plain XML
        if (code.data.includes('<?xml') || code.data.includes('<PrintLetterBarcodeData')) {
           console.log('[AadhaarParser] QR_XML_EXTRACTED: Found plain text XML');
           xmlString = code.data;
        } else {
           // Secure QR: Usually has 255 length signature, then compressed payload
           // Gzip magic number is 0x1f 0x8b
           // Zlib magic number is 0x78 0x9c
           const binData = code.binaryData;
           let compressedIndex = -1;
           let isGzip = false;
           for (let i = 0; i < binData.length - 1; i++) {
             if (binData[i] === 0x1f && binData[i+1] === 0x8b) {
               compressedIndex = i;
               isGzip = true;
               break;
             } else if (binData[i] === 0x78 && (binData[i+1] === 0x9c || binData[i+1] === 0xda || binData[i+1] === 0x01)) {
               compressedIndex = i;
               isGzip = false;
               break;
             }
           }
           
           if (compressedIndex !== -1) {
             console.log(`[AadhaarParser] Found compressed payload at index ${compressedIndex}`);
             const compressedBuf = Buffer.from(binData.slice(compressedIndex));
             try {
               const unzipped = isGzip ? zlib.gunzipSync(compressedBuf) : zlib.unzipSync(compressedBuf);
               const unzippedStr = unzipped.toString('utf-8');
               // Check if decompressed data is the XML-based QR format
               if (unzippedStr.includes('<PrintLetterBarcodeData') || unzippedStr.includes('<?xml')) {
                 xmlString = unzippedStr;
                 console.log('[AadhaarParser] QR_XML_EXTRACTED: Successfully decompressed Secure QR XML');
               } else {
                 // Try UIDAI Secure QR binary (0xFF delimiter) format — post-2018 Aadhaar
                 console.log('[AadhaarParser] Decompressed QR is not XML — trying 0xFF binary delimiter format...');
                 const binaryParsed = this.parseSecureQRBinary(unzipped);
                 if (binaryParsed) {
                   this.qrData = binaryParsed;
                   console.log('[AadhaarParser] QR_BINARY_PARSED: Successfully parsed UIDAI Secure QR binary format');
                   return binaryParsed;
                 } else {
                   // Last resort: treat raw unzipped data as XML
                   xmlString = unzippedStr;
                   console.log('[AadhaarParser] QR_BINARY_FALLBACK: Binary parse failed, trying raw bytes as XML');
                 }
               }
             } catch (zipErr: any) {
               console.error('[AadhaarParser] Decompression failed:', zipErr.message);
             }
           } else {
             const text = code.data;
             // Detect legacy numeric-encoded QR (Big Integer / Base-10 format, pre-2018)
             if (/^\d+$/.test(text.trim())) {
               console.log('[AadhaarParser] Legacy numeric Secure QR detected (Base-10 Big Integer, pre-2018). Length: ' + text.length + '. Falling back to text-layer extraction.');
             } else {
               console.log('[AadhaarParser] QR data is neither plain XML nor compressed stream. Raw preview: ' + text.substring(0, 100));
             }
           }
         }
        
        if (xmlString) {
          // Parse XML using simple regex attributes matching
          const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
          const parsedData: any = {};
          let match;
          while ((match = attrRegex.exec(xmlString)) !== null) {
             parsedData[match[1]] = match[2];
          }
           this.qrData = parsedData;
          return parsedData;
        }
      } else {
        console.warn('[AadhaarParser] jsQR failed to decode image');
      }
    } catch (e: any) {
      console.error('[AadhaarParser] QR Decode error:', e.message);
    }
    return null;
  }

  async extractQRCode(): Promise<string | null> {
    await this.extractAssets();
    await this.decodeQRCode();
    return this.extractedQR;
  }

  /**
   * Parses UIDAI Secure QR binary (0xFF delimiter) format — post-2018 Aadhaar.
   * After gzip decompression, fields are separated by 0xFF byte in a fixed UIDAI-defined order.
   * All text fields are decoded as UTF-8, preserving Devanagari, Gujarati, Tamil, Bengali etc.
   * exactly as UIDAI encoded them — zero AI/OCR required.
   */
  private parseSecureQRBinary(data: Buffer): any | null {
    try {
      // JPEG magic bytes 0xFF 0xD8 0xFF mark start of embedded photo — stop text parsing there
      let photoStart = -1;
      for (let i = 0; i < data.length - 2; i++) {
        if (data[i] === 0xFF && data[i + 1] === 0xD8 && data[i + 2] === 0xFF) {
          photoStart = i;
          break;
        }
      }

      // Only split text fields from the portion before the photo
      const textPortion = photoStart > 0 ? data.slice(0, photoStart) : data;

      // Split by 0xFF delimiter
      const fields: string[] = [];
      let fieldStart = 0;
      for (let i = 0; i <= textPortion.length; i++) {
        if (i === textPortion.length || textPortion[i] === 0xFF) {
          const fieldBytes = textPortion.slice(fieldStart, i);
          // UTF-8 decode — this is why regional scripts come out perfect with no AI
          fields.push(Buffer.from(fieldBytes).toString('utf-8').replace(/\x00/g, '').trim());
          fieldStart = i + 1;
        }
      }

      console.log(`[AadhaarParser] QR binary: Split into ${fields.length} fields (photoStart=${photoStart})`);

      if (fields.length < 5) {
        console.warn('[AadhaarParser] QR binary: Only ' + fields.length + ' fields — not a valid Secure QR binary format');
        return null;
      }

      // UIDAI Secure QR field order (0-indexed):
      // 0: Email/Mobile present flag
      // 1: Reference ID (4-digit Aadhaar suffix + timestamp)
      // 2: Name (English)
      // 3: Date of Birth
      // 4: Gender
      // 5: Care of (C/O)
      // 6: District
      // 7: Landmark
      // 8: House
      // 9: Location
      // 10: Pincode
      // 11: Post Office
      // 12: State
      // 13: Sub-district
      // 14: VTC (Village/Town/City)
      // 15: Local Name in regional script (newer Aadhaar)
      // 16: Local Address in regional script (newer Aadhaar)
      const parsed: any = {
        name:    fields[2]  || null,
        dob:     fields[3]  || null,
        gender:  fields[4]  || null,
        co:      fields[5]  || null,
        dist:    fields[6]  || null,
        lm:      fields[7]  || null,
        house:   fields[8]  || null,
        loc:     fields[9]  || null,
        pc:      fields[10] || null,
        po:      fields[11] || null,
        state:   fields[12] || null,
        subdist: fields[13] || null,
        vtc:     fields[14] || null,
        uid:     fields[1]  ? fields[1].substring(0, 4) : null,
      };

      // Extract local name (field 15) — regional language name in correct Unicode
      if (fields.length > 15 && fields[15] && /[^\x00-\x7F]/.test(fields[15])) {
        parsed.lname = fields[15];
        console.log(`[AadhaarParser] QR binary: Local Name (lname) at field[15]: "${fields[15].substring(0, 40)}"`);
      }

      // Extract local address (field 16) — regional language address in correct Unicode
      if (fields.length > 16 && fields[16] && /[^\x00-\x7F]/.test(fields[16])) {
        parsed.laddress = fields[16];
        console.log(`[AadhaarParser] QR binary: Local Address (laddress) at field[16]: "${fields[16].substring(0, 60)}"`);
      }

      // Fallback scan: if lname/laddress not in expected positions, scan fields 15-20
      if (!parsed.lname || !parsed.laddress) {
        for (let i = 15; i < Math.min(fields.length, 22); i++) {
          const f = fields[i];
          if (!f || !/[^\x00-\x7F]/.test(f)) continue;
          if (!parsed.lname) {
            parsed.lname = f;
            console.log(`[AadhaarParser] QR binary: Local Name found via scan at field[${i}]: "${f.substring(0, 40)}"`);
          } else if (!parsed.laddress) {
            parsed.laddress = f;
            console.log(`[AadhaarParser] QR binary: Local Address found via scan at field[${i}]: "${f.substring(0, 60)}"`);
            break;
          }
        }
      }

      console.log(`[AadhaarParser] QR binary RESULT: name="${parsed.name}" dob="${parsed.dob}" gender="${parsed.gender}" lname="${parsed.lname || '(none)'}" laddress="${(parsed.laddress || '(none)').substring(0, 30)}"`);
      return parsed;
    } catch (err: any) {
      console.error('[AadhaarParser] parseSecureQRBinary failed:', err.message);
      return null;
    }
  }

  /**
   * Decodes UIDAI legacy numeric Secure QR (pre-2018).
   * UIDAI encoded the compressed payload as a large Base-10 integer string.
   * We convert it to bytes using native BigInt, find the gzip header, decompress,
   * and parse local-language fields — ZERO AI needed, works fully offline.
   */
  private decodeNumericQR(numericStr: string): any | null {
    try {
      console.log('[AadhaarParser] Numeric QR: Converting decimal string to bytes using BigInt...');
      // Convert big decimal string → BigInt → byte array (big-endian)
      let num = BigInt(numericStr);
      const byteArr: number[] = [];
      const ZERO = BigInt(0);
      const MASK_FF = BigInt(0xFF);
      const EIGHT = BigInt(8);
      while (num > ZERO) {
        byteArr.unshift(Number(num & MASK_FF));
        num >>= EIGHT;
      }
      const rawBytes = Buffer.from(byteArr);
      console.log(`[AadhaarParser] Numeric QR: Decoded to ${rawBytes.length} bytes`);

      // Find gzip (0x1f 0x8b) or zlib (0x78 0x9c/0xda/0x01) magic bytes
      let compressedIndex = -1;
      let isGzip = false;
      for (let i = 0; i < rawBytes.length - 1; i++) {
        if (rawBytes[i] === 0x1f && rawBytes[i + 1] === 0x8b) {
          compressedIndex = i; isGzip = true; break;
        } else if (rawBytes[i] === 0x78 && (rawBytes[i + 1] === 0x9c || rawBytes[i + 1] === 0xda || rawBytes[i + 1] === 0x01)) {
          compressedIndex = i; isGzip = false; break;
        }
      }

      if (compressedIndex === -1) {
        console.warn('[AadhaarParser] Numeric QR: No compressed payload found in decoded bytes');
        return null;
      }

      console.log(`[AadhaarParser] Numeric QR: Compressed payload at byte[${compressedIndex}] isGzip=${isGzip}`);
      const compressedBuf = rawBytes.slice(compressedIndex);
      const unzipped = isGzip ? zlib.gunzipSync(compressedBuf) : zlib.unzipSync(compressedBuf);
      const unzippedStr = unzipped.toString('utf-8');

      // Try XML format (most common for pre-2018 cards)
      if (unzippedStr.includes('<PrintLetterBarcodeData') || unzippedStr.includes('<?xml')) {
        const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
        const parsedData: any = {};
        let m;
        while ((m = attrRegex.exec(unzippedStr)) !== null) {
          parsedData[m[1]] = m[2];
        }
        console.log(`[AadhaarParser] Numeric QR → XML parsed: name="${parsedData.name}" lname="${parsedData.lname || '(none)'}"`);
        return parsedData;
      }

      // Try 0xFF binary format
      const binaryParsed = this.parseSecureQRBinary(unzipped);
      if (binaryParsed) {
        console.log('[AadhaarParser] Numeric QR → 0xFF binary parsed');
        return binaryParsed;
      }

      console.warn('[AadhaarParser] Numeric QR: Decompressed data matched neither XML nor binary format');
      return null;
    } catch (err: any) {
      console.error('[AadhaarParser] decodeNumericQR failed:', err.message);
      return null;
    }
  }

  /**
   * Returns true if the PDF text has significant local-language (Indic script) content
   * beyond the standard government headers printed on ALL Aadhaar cards.
   * Threshold: ≥30 Devanagari chars (Hindi/Marathi body text) OR ≥10 of any other regional script.
   * Standard headers like "भारत सरकार" (~8 chars) and "भारतीय विशिष्ट पहचान प्राधिकरण" (~20 more)
   * are present on every card — we require substantially more to confirm real local content.
   */
  private hasSignificantLocalContent(): boolean {
    const text = this.rawText;
    let devanagariCount = 0;
    let regionalCount = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0x0900 && code <= 0x097F) devanagariCount++;
      else if (
        (code >= 0x0A80 && code <= 0x0AFF) || // Gujarati
        (code >= 0x0B80 && code <= 0x0BFF) || // Tamil
        (code >= 0x0C00 && code <= 0x0C7F) || // Telugu
        (code >= 0x0C80 && code <= 0x0CFF) || // Kannada
        (code >= 0x0D00 && code <= 0x0D7F) || // Malayalam
        (code >= 0x0980 && code <= 0x09FF) || // Bengali
        (code >= 0x0A00 && code <= 0x0A7F) || // Punjabi
        (code >= 0x0B00 && code <= 0x0B7F)    // Odia
      ) regionalCount++;
    }
    // Require substantial local language text beyond the common government headers.
    // Real Hindi/Marathi local content adds 40+ chars.
    // Regional scripts (Gujarati, Tamil, etc.) require 20+ chars.
    if (devanagariCount >= 40) return true;
    if (regionalCount >= 20) return true;
    return false;
  }

  extractLocalName(): string | null {
    console.log('[AadhaarParser] Running Local Name extraction rules');

    const coData = this.extractCoName();
    if (coData.local) console.log(`[AadhaarParser] Detected local C/O name to filter: "${coData.local}"`);

    const isCoLocalName = (text: string): boolean => {
      if (!text) return false;
      const t = text.trim();
      if (coData.local && t === coData.local.trim()) return true;
      if (coData.english && t.toLowerCase() === coData.english.trim().toLowerCase()) return true;
      return false;
    };

    // ── PRIORITY 1: QR Code lname field (most accurate — direct from UIDAI) ──
    if (this.qrData) {
      // UIDAI QR XML may have 'lname' (local name) attribute
      const qrLocalName = this.qrData.lname || this.qrData.ln || this.qrData.local_name || null;
      if (qrLocalName && /[^\x00-\x7F]/.test(qrLocalName) && !isCoLocalName(qrLocalName)) {
        console.log(`[AadhaarParser] Local Name from QR lname field: ${qrLocalName}`);
        return this.normalizeIndicText(qrLocalName);
      }
    }

    // ── GUARD: Skip local name extraction for English-only PDFs if QR code didn't provide lname ──
    if (!this.hasSignificantLocalContent()) {
      console.log('[AadhaarParser] Skipping local name — PDF has no significant Indic script content (English-only card)');
      return null;
    }

    // ── PRIORITY 2: PDF Text heuristics ──
    const englishName = this.extractName();
    if (!englishName) return null;

    const lines = this.rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const isNonAscii = (text: string): boolean => /[^\x00-\x7F]/.test(text);
    const isEnglishOnly = (text: string): boolean => /^[A-Za-z\s\.]+$/.test(text);
    const isNotNumberLine = (text: string): boolean => !/^[\d\s\-]+$/.test(text);
    const isNotAddrKeyword = (text: string): boolean =>
      !/^(Address|पता|सरनामूं|સરનામું|સરનામુ|મુગવરી|చిరునామా|విళાસ|മേൽവിലാസം|ঠিকানা|ଠିକଣা|ਪਤਾ|प्रति|પ્રતિ|ਪ੍ਰਤੀ|ప్రతి|ప్రతీ|ప్రతి|ಪ್ರತಿ|প্রতি|ଠାରେ|To|From)[:\s,-]*$/i.test(text.trim()) &&
      !/(Address|पता|સરનામું|સરનામુ|મુગવરી|చిరునామా|విళાસ|മേൽവിലാസം|ঠিকানা|ଠିକଣা|ਪਤਾ)/i.test(text);

    const isNotRelationship = (text: string, prevText?: string): boolean => {
      const trimmed = text.trim();
      if (/^(?:W\/O|S\/O|D\/O|C\/O|H\/O|F\/O|W\.O\.|S\.O\.|D\.O\.|C\.O\.|Care\s+of|Son\s+of|Wife\s+of|Daughter\s+of|पति|पिता|आत्मज|पत्नी|સુપુત્ર|સુપુત્રી|કેર\s+ઓફ|પત્ની|આત્મજ|દ્વારા|द्वारा|મારફતે)/i.test(trimmed)) return false;
      if (prevText && /^(?:W\/O|S\/O|D\/O|C\/O|H\/O|F\/O|W\.O\.|S\.O\.|D\.O\.|C\.O\.|Care\s+of|Son\s+of|Wife\s+of|Daughter\s+of|पति|पिता|आत्मज|पत्नी|સુપુત્ર|સુપુત્રી|કેર\s+ઓફ|પત્ની|આત્મજ|દ્વારા|द्वारा|મારફતે)[:\s,-]*$/i.test(prevText.trim())) return false;
      return true;
    };

    // Find address section boundary so we NEVER parse local names from the back card address block
    const addressLineIdx = lines.findIndex(l => /^Address\s*[:/]/i.test(l) || /^(पता|સરનામું|முகவரி|చిరునామా|విళಾಸ|മേൽവിലാസം|ঠিকানা|ଠିକଣা|ਪਤਾ)\s*[:/]/i.test(l));
    const searchLimit = addressLineIdx > 0 ? addressLineIdx : lines.length;

    // Heuristic 1: Look for the exact English name line, then check line above AND below (before address)
    for (let i = 0; i < searchLimit; i++) {
      const lineUpper = lines[i].toLowerCase();
      const nameUpper = englishName.toLowerCase();
      if (lineUpper === nameUpper || lineUpper.includes(nameUpper) || nameUpper.includes(lineUpper.replace(/[^a-z ]/gi, '').trim())) {
        // Check line above
        if (i > 0) {
          const prevLine = lines[i - 1];
          const beforePrev = i > 1 ? lines[i - 2] : undefined;
          if (isNonAscii(prevLine) && prevLine.length >= 2 && isNotNumberLine(prevLine) && isNotAddrKeyword(prevLine) && isNotRelationship(prevLine, beforePrev) && !isCoLocalName(prevLine)) {
            console.log(`[AadhaarParser] Local Name found above English name: ${prevLine}`);
            return this.normalizeIndicText(prevLine);
          }
        }
        // Check line below
        if (i < searchLimit - 1) {
          const nextLine = lines[i + 1];
          if (isNonAscii(nextLine) && !isEnglishOnly(nextLine) && nextLine.length >= 2 && isNotNumberLine(nextLine) && isNotAddrKeyword(nextLine) && isNotRelationship(nextLine, lines[i]) && !isCoLocalName(nextLine)) {
            console.log(`[AadhaarParser] Local Name found below English name: ${nextLine}`);
            return this.normalizeIndicText(nextLine);
          }
        }
      }
    }

    // Heuristic 2: Look near DOB line (before address)
    for (let i = 0; i < searchLimit; i++) {
      if (/(?:DOB|Date\s*of\s*Birth|YOB|Year\s*of\s*Birth|जन्म\s*तिथि|જન્મ\s*તારીખ)/i.test(lines[i])) {
        for (let offset = 1; offset <= 4; offset++) {
          const idx = i - offset;
          if (idx >= 0) {
            const candidate = lines[idx];
            if (isNonAscii(candidate) && candidate.length >= 2 && !candidate.match(/\d{4}/) && isNotAddrKeyword(candidate) && isNotRelationship(candidate)) {
              console.log(`[AadhaarParser] Local Name found near DOB line: ${candidate}`);
              return this.normalizeIndicText(candidate);
            }
          }
        }
      }
    }

    console.log('[AadhaarParser] Local Name extraction failed');
    return null;
  }

  extractLocalAddress(): string | null {
    console.log('[AadhaarParser] Running Local Address extraction rules');

    // ── PRIORITY 1: QR Code address fields (most accurate — direct from UIDAI) ──
    if (this.qrData) {
      const qrLocalAddr = this.qrData.laddress || this.qrData.local_address || null;
      if (qrLocalAddr && /[^\x00-\x7F]/.test(qrLocalAddr) && qrLocalAddr.length > 5) {
        console.log(`[AadhaarParser] Local Address from QR laddress field: ${qrLocalAddr.substring(0, 50)}`);
        return this.normalizeIndicText(qrLocalAddr);
      }
    }

    // ── GUARD: Skip local address extraction for English-only PDFs if QR code didn't provide laddress ──
    if (!this.hasSignificantLocalContent()) {
      console.log('[AadhaarParser] Skipping local address — PDF has no significant Indic script content (English-only card)');
      return null;
    }

    // All known address labels across Indian languages (including Gujarati care-of/relation prefixes)
    const addrLabelPatterns = [
      'સરનામું', 'સરનામુ', 'સંભાળી', 'કેર ઓફ', 'આત્મજ', 'પોસ્ટ', 'જીલ્લો', 'રહેવાસી', // Gujarati
      'पता', 'पत्ता', 'देखभाल', 'द्वारा', 'आत्मज', 'पुत्र', 'पत्नी',              // Hindi/Devanagari
      'முகவரி',                                                                 // Tamil
      'చిరునామా', 'రునామా',                                                     // Telugu
      'ವಿಳಾಸ',                                                                  // Kannada
      'മേൽവിലാസം', 'വിലാസം',                                                    // Malayalam
      'ঠিকানা', 'ঠিকના',                                                        // Bengali/Assamese
      'ਪਤਾ',                                                                    // Punjabi
      'ଠିକଣା',                                                                  // Odia
    ];

    const addrPattern = addrLabelPatterns.join('|');

    // Try matching local address label followed by content until English "Address"
    const localAddrRegex = new RegExp(
      `(${addrPattern})\\s*[:/]?\\s*([\\s\\S]+?)(?=Address\\s*[:/]|$)`,
      'i'
    );
    const match = this.rawText.match(localAddrRegex);
    if (match && match[2] && match[2].trim().length > 5) {
      let addr = match[2].replace(/[\r\n]+/g, '  ').trim();
      addr = addr.replace(/^[,\s:\-]+/, '');
      // Remove any trailing English text (usually "Address:" or similar)
      addr = addr.replace(/\s*Address\s*[:/].*$/i, '').trim();
      if (addr.length > 5) {
        console.log(`[AadhaarParser] Local Address found via label pattern: ${addr.substring(0, 50)}`);
        return this.normalizeIndicText(addr);
      }
    }

    // Fallback 2: Collect all consecutive non-ASCII lines that appear before the English address block
    const lines = this.rawText.split('\n').map(l => l.trim());
    const addressLineIdx = lines.findIndex(l => /Address/i.test(l));

    if (addressLineIdx > 0) {
      const localAddrLines: string[] = [];
      for (let i = addressLineIdx - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line) continue;
        if (/^[A-Za-z0-9 .,\-/]+$/.test(line) && line.length > 3 && !/[^\x00-\x7F]/.test(line)) break;
        if (/(?:DOB|YOB|MALE|FEMALE|Aadhaar|VID|Virtual)/i.test(line)) break;
        if (/[^\x00-\x7F]/.test(line)) {
          localAddrLines.unshift(line);
        }
      }
      if (localAddrLines.length > 0) {
        const addr = localAddrLines.join('  ').trim();
        if (addr.length > 5) {
          console.log(`[AadhaarParser] Local Address found via backwards scan: ${addr.substring(0, 50)}`);
          return this.normalizeIndicText(addr);
        }
      }
    }

    console.log('[AadhaarParser] Local Address extraction failed');
    return null;
    return null;
  }

  detectLanguage(): string {
    const text = this.rawText;
    const counts: Record<string, number> = {
      gujarati: 0,
      devanagari: 0,
      tamil: 0,
      telugu: 0,
      kannada: 0,
      malayalam: 0,
      bengali: 0,
      punjabi: 0,
      odia: 0,
    };

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0x0A80 && code <= 0x0AFF) counts.gujarati++;
      else if (code >= 0x0900 && code <= 0x097F) counts.devanagari++;
      else if (code >= 0x0B80 && code <= 0x0BFF) counts.tamil++;
      else if (code >= 0x0C00 && code <= 0x0C7F) counts.telugu++;
      else if (code >= 0x0C80 && code <= 0x0CFF) counts.kannada++;
      else if (code >= 0x0D00 && code <= 0x0D7F) counts.malayalam++;
      else if (code >= 0x0980 && code <= 0x09FF) counts.bengali++;
      else if (code >= 0x0A00 && code <= 0x0A7F) counts.punjabi++;
      else if (code >= 0x0B00 && code <= 0x0B7F) counts.odia++;
    }

    const regionalLangs = ['gujarati', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali', 'punjabi', 'odia'];
    let bestRegionalLang = '';
    let bestRegionalCount = 0;
    for (const lang of regionalLangs) {
      if (counts[lang] > bestRegionalCount) {
        bestRegionalCount = counts[lang];
        bestRegionalLang = lang;
      }
    }

    // 1. TOP PRIORITY: If any non-Devanagari regional script is present (>3 chars), return it!
    // National Devanagari headers ("भारत सरकार" ~60 chars) are on ALL cards and must NOT override state script.
    if (bestRegionalCount > 3) {
      return bestRegionalLang;
    }

    if (counts.devanagari > 5) {
      return 'devanagari';
    }

    return 'english';
  }

  extractLocalAddressLabel(): string | null {
    console.log('[AadhaarParser] Running Local Address Label extraction');
    const lang = this.detectLanguage();
    if (lang === 'english') return 'Address:';
    const mapping = LANGUAGE_MAP[lang] || LANGUAGE_MAP.english;
    return mapping.addressLabel;
  }

  extractDobLine(): string | null {
    console.log('[AadhaarParser] Running DOB line extraction');
    const dob = this.extractDOB();
    const lines = this.rawText.split('\n');
    
    if (dob) {
      for (const line of lines) {
        if (line.includes(dob) && /(?:DOB|Birth|YOB|Year)/i.test(line)) {
          return line.trim();
        }
      }
    }
    
    for (const line of lines) {
      if (/(?:DOB|Birth|YOB)/i.test(line) && /\b\d{2}[-/]\d{2}[-/]\d{4}\b|\b\d{4}\b/.test(line)) {
        return line.trim();
      }
    }
    
    // Fallback: construct it from detected language template
    const lang = this.detectLanguage();
    const mapping = LANGUAGE_MAP[lang] || LANGUAGE_MAP.english;
    return `${mapping.dobLabel} ${dob || ''}`;
  }

  extractGenderLine(): string | null {
    console.log('[AadhaarParser] Running Gender line extraction');
    const lines = this.rawText.split('\n');
    let matchedLine: string | null = null;
    
    for (const line of lines) {
      const upper = line.toUpperCase().trim();
      const hasGenderWord = upper.includes('MALE') || upper.includes('FEMALE') || upper.includes('TRANSGENDER');
      if (hasGenderWord && line.length < 60) {
        if (!upper.includes('ADDRESS') && !upper.includes('EMAIL') && !upper.includes('PHONE') && !upper.includes('MOBILE')) {
          matchedLine = line.trim();
          break;
        }
      }
    }
    
    const gender = this.extractGender() || 'Male';
    const lang = this.detectLanguage();
    const mapping = LANGUAGE_MAP[lang] || LANGUAGE_MAP.english;

    if (matchedLine) {
      if (lang !== 'english') {
        if (gender.toUpperCase().includes('FEMALE')) {
          const cleanLocal = mapping.femaleLabel.split('/')[0].trim();
          if (!matchedLine.includes(cleanLocal)) {
            return mapping.femaleLabel;
          }
        } else if (gender.toUpperCase().includes('MALE') && !gender.toUpperCase().includes('FEMALE')) {
          const cleanLocal = mapping.maleLabel.split('/')[0].trim();
          if (!matchedLine.includes(cleanLocal)) {
            return mapping.maleLabel;
          }
        } else if (gender.toUpperCase().includes('TRANS')) {
          const cleanLocal = mapping.transgenderLabel.split('/')[0].trim();
          if (!matchedLine.includes(cleanLocal)) {
            return mapping.transgenderLabel;
          }
        }
      }
      return matchedLine;
    }
    
    // Fallback: construct it from detected language template
    if (gender.toUpperCase().includes('FEMALE')) {
      return mapping.femaleLabel;
    } else if (gender.toUpperCase().includes('TRANS')) {
      return mapping.transgenderLabel;
    } else {
      return mapping.maleLabel;
    }
  }

  extractIssueDate(): string | null {
    console.log('[AadhaarParser] Running Issue Date extraction rules');
    const match = this.rawText.match(/Aadhaar\s*no\.\s*issued\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (match) {
      console.log(`[AadhaarParser] Issue Date found: ${match[1]}`);
      return match[1].trim();
    }
    return null;
  }

  extractDetailsAsOn(): string | null {
    console.log('[AadhaarParser] Running Details As On extraction rules');
    const match = this.rawText.match(/Details\s*as\s*on\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (match) {
      console.log(`[AadhaarParser] Details As On found: ${match[1]}`);
      return match[1].trim();
    }
    return null;
  }

  private normalizeIndicText(text: string): string {
    if (!text) return '';
    let normalized = text.replace(/\u0000/g, '');

    // 1. Strip invisible control characters (ZWJ, ZWNJ, BOM, ZWS)
    normalized = normalized.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

    const INDIC_BASE = '\u0900-\u0D7F';
    const ALL_VIRAMA = '\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D';
    const ALL_COMBINING =
      '\u0900-\u0903\u093C\u093E-\u094D\u0945-\u0948\u094E\u094F\u0951-\u0954' +
      '\u0981-\u0983\u09BC\u09BE-\u09CD\u09D7' +
      '\u0A01-\u0A03\u0A3C\u0A3E-\u0A4D\u0A51\u0A70\u0A71\u0A75' +
      '\u0A81-\u0A83\u0ABC\u0ABE-\u0ACD\u0AE2\u0AE3' +
      '\u0B01-\u0B03\u0B3C\u0B3E-\u0B4D\u0B56\u0B57\u0B62\u0B63' +
      '\u0B82\u0BBE-\u0BCD\u0BD7' +
      '\u0C00-\u0C03\u0C3E-\u0C4D\u0C55\u0C56\u0C62\u0C63' +
      '\u0C80-\u0C83\u0CBC\u0CBE-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3' +
      '\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D4D\u0D57\u0D62\u0D63';

    // Remove stray space AFTER virama/halant before conjunct consonant (e.g. "ક ્ ર" -> "ક્ર")
    normalized = normalized.replace(
      new RegExp(`([${ALL_VIRAMA}])\\s+(?=[${INDIC_BASE}])`, 'gu'),
      '$1'
    );

    // Remove stray space BEFORE combining matra/vowel sign (e.g. "શ િ વ" -> "શિવ")
    normalized = normalized.replace(
      new RegExp(`(?<=[${INDIC_BASE}A-Za-z])\\s([${ALL_COMBINING}])(?=[${INDIC_BASE}A-Za-z,. ])`, 'gu'),
      '$1'
    );

    return normalized.normalize('NFC').replace(/\s{2,}/g, ' ').trim();
  }


  async parse(): Promise<import('./BaseParser').ExtractedDocumentData> {
    // ── CRITICAL: Extract assets & decode QR code FIRST so qrData is available for extractName(), extractLocalName() etc. ──
    await this.extractAssets();
    if (this.extractedQR && !this.qrData) {
      await this.decodeQRCode();
    }

    const baseData = await super.parse();

    return {
      ...baseData,
      name: this.extractName(),
      photoError: this.photoError,
      qrError: this.qrError,
      localName: this.extractLocalName(),
      localAddress: this.extractLocalAddress(),
      issueDate: this.extractIssueDate(),
      detailsAsOn: this.extractDetailsAsOn(),
      localAddressLabel: this.extractLocalAddressLabel(),
      dobLine: this.extractDobLine(),
      genderLine: this.extractGenderLine()
    };
  }
}

interface LanguageAssets {
  addressLabel: string;
  dobLabel: string;
  maleLabel: string;
  femaleLabel: string;
  transgenderLabel: string;
}

const LANGUAGE_MAP: Record<string, LanguageAssets> = {
  gujarati: {
    addressLabel: 'સરનામું :',
    dobLabel: 'જન્મ તારીખ / DOB:',
    maleLabel: 'પુરુષ / MALE',
    femaleLabel: 'સ્ત્રી / FEMALE',
    transgenderLabel: 'ટ્રાન્સજેન્ડર / TRANSGENDER'
  },
  devanagari: {
    addressLabel: 'पता :',
    dobLabel: 'जन्म तिथि / DOB:',
    maleLabel: 'पुरुष / MALE',
    femaleLabel: 'महिला / FEMALE',
    transgenderLabel: 'किन्नर / TRANSGENDER'
  },
  tamil: {
    addressLabel: 'முகவரி :',
    dobLabel: 'பிறந்த தேதி / DOB:',
    maleLabel: 'ஆண் / MALE',
    femaleLabel: 'பெண் / FEMALE',
    transgenderLabel: 'திருநங்கை / TRANSGENDER'
  },
  telugu: {
    addressLabel: 'చిరునామా :',
    dobLabel: 'పుట్టిన తేదీ / DOB:',
    maleLabel: 'పురుషుడు / MALE',
    femaleLabel: 'స్త్రీ / FEMALE',
    transgenderLabel: 'నపుంసకుడు / TRANSGENDER'
  },
  kannada: {
    addressLabel: 'ವಿಳಾಸ :',
    dobLabel: 'ಹುಟ್ಟಿದ ದಿನಾಂಕ / DOB:',
    maleLabel: 'ಪುರುಷ / MALE',
    femaleLabel: 'ಮಹಿಳೆ / FEMALE',
    transgenderLabel: 'ತೃತೀಯಲಿಂಗಿ / TRANSGENDER'
  },
  malayalam: {
    addressLabel: 'മേൽവിലാസം :',
    dobLabel: 'ജനന തീയതി / DOB:',
    maleLabel: 'പുരുഷൻ / MALE',
    femaleLabel: 'സ്ത്രീ / FEMALE',
    transgenderLabel: 'ഭിന്നലിംഗക്കാരൻ / TRANSGENDER'
  },
  bengali: {
    addressLabel: 'ঠিকানা :',
    dobLabel: 'জন্ম তারিখ / DOB:',
    maleLabel: 'পুরুষ / MALE',
    femaleLabel: 'মহিলা / FEMALE',
    transgenderLabel: 'রূপান্তরিত লিঙ্গ / TRANSGENDER'
  },
  punjabi: {
    addressLabel: 'ਪਤਾ :',
    dobLabel: 'ਜਨਮ ਮਿਤੀ / DOB:',
    maleLabel: 'ਪੁਰਸ਼ / MALE',
    femaleLabel: 'ਔਰਤ / FEMALE',
    transgenderLabel: 'ਟ੍ਰਾਂਸਜੈਂਡਰ / TRANSGENDER'
  },
  odia: {
    addressLabel: 'ଠିକଣା :',
    dobLabel: 'ଜନ୍ମ ତାରିଖ / DOB:',
    maleLabel: 'ପୁରୁଷ / MALE',
    femaleLabel: 'ମହିଳା / FEMALE',
    transgenderLabel: 'ରୂପାନ୍ତରିତ ଲିଙ୍ਗ / TRANSGENDER'
  },
  english: {
    addressLabel: 'Address:',
    dobLabel: 'DOB:',
    maleLabel: 'MALE',
    femaleLabel: 'FEMALE',
    transgenderLabel: 'TRANSGENDER'
  }
};
