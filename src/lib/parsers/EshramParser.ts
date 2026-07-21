import { BaseParser } from './BaseParser';

export class EshramParser extends BaseParser {
  getDocumentType(): 'AADHAAR' | 'PAN' | 'AYUSHMAN' | 'ESHRAM' | 'UNKNOWN' {
    return 'ESHRAM';
  }

  extractName(): string | null {
    const nameMatch = this.rawText.match(/Name\s+([A-Z\s]+)/i);
    return nameMatch ? nameMatch[1].trim() : null;
  }

  extractDOB(): string | null {
    const dobMatch = this.rawText.match(/(?:DOB|Date of Birth)[\s:]*([\d]{2}\/[\d]{2}\/[\d]{4})/i);
    return dobMatch ? dobMatch[1].trim() : null;
  }

  extractGender(): string | null {
    const genderMatch = this.rawText.match(/(Male|Female|Transgender)/i);
    return genderMatch ? genderMatch[1].trim() : null;
  }

  extractDocumentNumber(): string | null {
    // UAN Number is 12 digits
    const uanMatch = this.rawText.match(/\b\d{12}\b/);
    return uanMatch ? uanMatch[0].trim() : null;
  }

  extractAddress(): string | null {
    const addressMatch = this.rawText.match(/Address[\s:]+([\s\S]*?)(?=\b\d{6}\b|$)/i);
    const pinMatch = this.rawText.match(/(\d{6})/);
    if (addressMatch) {
      return addressMatch[1].trim() + (pinMatch ? ' ' + pinMatch[1] : '');
    }
    return null; 
  }
}
