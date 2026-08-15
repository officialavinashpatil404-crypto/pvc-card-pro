export interface ExtractedDocumentData {
  documentType: 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'VOTER' | 'ABHA' | 'UNKNOWN';
  name: string | null;
  dob: string | null;
  gender: string | null;
  documentNumber: string | null;
  address: string | null;
  photoBase64: string | null;
  qrBase64: string | null;
  vid?: string | null;
  mobile?: string | null;
  rawText?: string;
  photoError?: string | null;
  qrError?: string | null;
  localName?: string | null;
  localAddress?: string | null;
  issueDate?: string | null;
  detailsAsOn?: string | null;
  localAddressLabel?: string | null;
  dobLine?: string | null;
  genderLine?: string | null;
  signatureBase64?: string | null;
  signatureError?: string | null;
  frontCardBase64?: string | null;
  backCardBase64?: string | null;
  textSource?: string;
  languageSource?: string;
  lang?: string;
  fatherName?: string | null;
  fatherNameLocal?: string | null;
  assemblyConstituency?: string | null;
  voterCropDebug?: {
    detectedRectangle: string;
    originalSize: string;
    exportSize: string;
    aspectRatio: string;
    scalePercent: string;
    rotationAngle: string;
    status: 'SUCCESS' | 'FAILED';
  } | null;
  abhaCropError?: string | null;
  village?: string | null;
  subdivision?: string | null;
  district?: string | null;
  state?: string | null;
  rationId?: string | null;
  isOldLayout?: boolean;
  careOf?: string | null;
  pincode?: string | null;
  isDeterministicPython?: boolean;
  extractionMethod?: string;
}

export abstract class BaseParser {
  protected rawText: string;
  protected pdfBuffer: Buffer;
  protected password: string | null;

  constructor(rawText: string, pdfBuffer: Buffer, password: string | null = null) {
    this.rawText = rawText;
    this.pdfBuffer = pdfBuffer;
    this.password = password;
  }

  abstract extractName(): string | null;
  abstract extractDOB(): string | null;
  abstract extractGender(): string | null;
  abstract extractDocumentNumber(): string | null;
  abstract extractAddress(): string | null;

  extractVID(): string | null {
    return null;
  }

  extractMobile(): string | null {
    return null;
  }

  
  // Base implementation for image extraction (mocked for now as true extraction requires complex pdf stream parsing)
  async extractPhoto(): Promise<string | null> {
    // In a real production system, we would parse the PDF dictionaries to extract Image XObjects.
    // For this demonstration, we return a null or a placeholder base64 if needed.
    return null; 
  }

  async extractQRCode(): Promise<string | null> {
    // Similarly, finding the QR code requires detecting image dimension heuristics or using a barcode scanner on rendered pages.
    return null;
  }

  async parse(): Promise<ExtractedDocumentData> {
    return {
      documentType: this.getDocumentType(),
      name: this.extractName(),
      dob: this.extractDOB(),
      gender: this.extractGender(),
      documentNumber: this.extractDocumentNumber(),
      address: this.extractAddress(),
      photoBase64: await this.extractPhoto(),
      qrBase64: await this.extractQRCode(),
      vid: this.extractVID(),
      mobile: this.extractMobile(),
      rawText: this.rawText,
    };
  }

  abstract getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'VOTER' | 'ABHA' | 'UNKNOWN';
}
