import { AadhaarParser } from './AadhaarParser';
import { PanParser } from './PanParser';
import { AyushmanParser } from './AyushmanParser';
import { EshramParser } from './EshramParser';
import { VoterParser } from './VoterParser';
import { AbhaParser } from './AbhaParser';
import { BaseParser } from './BaseParser';

export class DocumentDetector {
  static detectAndParse(rawText: string, pdfBuffer: Buffer, password: string | null = null, expectedDocType: string | null = null): BaseParser | null {
    console.log('[DocumentDetector] Starting detection. Text length:', rawText.length, 'Expected Type:', expectedDocType);
    
    // 1. Strict Priority: User Explicit Selection (expectedDocType from UI)
    if (expectedDocType) {
      console.log('[DocumentDetector] Strict User Selection provided. Bypassing auto-detection for:', expectedDocType);
      if (expectedDocType === 'AYUSHMAN') return new AyushmanParser(rawText, pdfBuffer, password);
      if (expectedDocType === 'ABHA') return new AbhaParser(rawText, pdfBuffer, password);
      if (expectedDocType === 'VOTER') return new VoterParser(rawText, pdfBuffer, password);
      if (expectedDocType === 'AADHAAR') return new AadhaarParser(rawText, pdfBuffer, password);
      if (expectedDocType === 'PAN') return new PanParser(rawText, pdfBuffer, password);
      if (expectedDocType === 'ESHRAM') return new EshramParser(rawText, pdfBuffer, password);
    }

    const textUpper = rawText.toUpperCase();

    console.log('[DocumentDetector] Checking for PAN signature...');
    const hasPanKeywords = textUpper.includes('INCOME TAX') || 
                           textUpper.includes('PERMANENT ACCOUNT NUMBER') || 
                           textUpper.includes('EPAN') ||
                           textUpper.includes('PAN CARD');
    if (hasPanKeywords && /[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(textUpper)) {
      console.log('[DocumentDetector] Match found: PAN');
      return new PanParser(rawText, pdfBuffer, password);
    }

    console.log('[DocumentDetector] Checking for Ayushman signature...');
    const hasAyushmanKeywords = textUpper.includes('PRADHAN MANTRI JAN AROGYA YOJANA') || 
                                textUpper.includes('PMJAY') || 
                                textUpper.includes('PM-JAY') ||
                                (textUpper.includes('AYUSHMAN') && !textUpper.includes('HEALTH ACCOUNT')) ||
                                /\bP[A-Z0-9]{8}\b/i.test(rawText);
    if (hasAyushmanKeywords) {
      console.log('[DocumentDetector] Match found: Ayushman');
      return new AyushmanParser(rawText, pdfBuffer, password);
    }

    console.log('[DocumentDetector] Checking for ABHA signature...');
    const hasAbhaKeywords = textUpper.includes('HEALTH ACCOUNT') || 
                            textUpper.includes('ABDM') ||
                            textUpper.includes('HEALTH ID');
    const hasAbhaPattern = /\b\d{2}-\d{4}-\d{4}-\d{4}\b/.test(rawText);
    
    if (hasAbhaKeywords || hasAbhaPattern) {
      console.log('[DocumentDetector] Match found: ABHA');
      return new AbhaParser(rawText, pdfBuffer, password);
    }
    
    console.log('[DocumentDetector] Checking for e-Shram signature...');
    if (textUpper.includes('SHRAM SUVIDHA') || textUpper.includes('ESHRAM') || textUpper.includes('UAN')) {
      console.log('[DocumentDetector] Match found: e-Shram');
      return new EshramParser(rawText, pdfBuffer, password);
    }

    console.log('[DocumentDetector] Checking for Voter Card signature...');
    const hasVoterKeywords = textUpper.includes('ELECTION COMMISSION') || 
                             textUpper.includes('ELECTOR PHOTO') || 
                             textUpper.includes('EPIC') ||
                             textUpper.includes('निर्वाचन आयोग') ||
                             textUpper.includes('ચૂંટણી પંચ');
    if (hasVoterKeywords) {
      console.log('[DocumentDetector] Match found: Voter ID');
      return new VoterParser(rawText, pdfBuffer, password);
    }

    console.log('[DocumentDetector] Checking for Aadhaar signature...');
    const hasAadhaarKeywords = (textUpper.includes('GOVERNMENT OF INDIA') && textUpper.includes('UNIQUE IDENTIFICATION AUTHORITY')) ||
                               textUpper.includes('UNIQUE IDENTIFICATION') ||
                               textUpper.includes('AUTHORITY OF INDIA') ||
                               textUpper.includes('MERA AADHAAR') ||
                               textUpper.includes('MY AADHAAR') ||
                               textUpper.includes('AADHAAR NO');
    
    const hasAadhaarPattern = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(rawText);
    
    if (hasAadhaarKeywords || hasAadhaarPattern) {
      console.log('[DocumentDetector] Match found: Aadhaar');
      return new AadhaarParser(rawText, pdfBuffer, password);
    }

    console.log('[DocumentDetector] Detection failed. No matching parsers.');
    return null;
  }
}
