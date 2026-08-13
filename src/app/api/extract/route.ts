import '@/utils/pdfPolyfill';
import { NextRequest, NextResponse } from 'next/server';
import { DocumentDetector } from '@/lib/parsers/DocumentDetector';
import { PDFDocument } from 'pdf-lib';
import { decryptPDF } from '@pdfsmaller/pdf-decrypt';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { getDynamicRepairs, repairGujaratiText, alignAndLogRepairs } from '@/utils/gujaratiRepair';
import { getDynamicRepairs as getMarathiRepairs, repairMarathiText } from '@/utils/marathiRepair';
import { createClient } from '@/utils/supabase/server';
import { decrypt } from '@/utils/crypto';
import { cropAadhaarRegions } from '@/lib/utils/pdfRenderer';
import { translateOrRepairWithAI, detectLocalTextErrors } from '@/utils/translationEngine';

// Global cache to store repaired regional language fields to minimize API calls
const geminiCache = new Map<string, string>();

// Helper to detect state from English address to choose the correct local language
function detectStateFromAddress(address: string): string {
  if (!address) return '';
  const addr = address.toLowerCase();
  const states = [
    'maharashtra', 'gujarat', 'rajasthan', 'uttar pradesh', 'madhya pradesh',
    'delhi', 'punjab', 'haryana', 'bihar', 'west bengal', 'andhra pradesh',
    'telangana', 'karnataka', 'tamil nadu', 'kerala', 'odisha', 'assam',
    'tripura', 'goa', 'himachal pradesh', 'uttarakhand', 'jharkhand', 'chhattisgarh'
  ];
  for (const state of states) {
    if (addr.includes(state)) {
      return state;
    }
  }
  return '';
}

const STATE_LANG_MAP: Record<string, string> = {
  'maharashtra': 'marathi',
  'gujarat': 'gujarati',
  'tamil nadu': 'tamil',
  'andhra pradesh': 'telugu',
  'telangana': 'telugu',
  'karnataka': 'kannada',
  'kerala': 'malayalam',
  'west bengal': 'bengali',
  'tripura': 'bengali',
  'assam': 'assamese',
  'punjab': 'punjabi',
  'odisha': 'odia',
  'goa': 'marathi',
  // Hindi-speaking states
  'uttar pradesh': 'hindi',
  'bihar': 'hindi',
  'rajasthan': 'hindi',
  'madhya pradesh': 'hindi',
  'haryana': 'hindi',
  'delhi': 'hindi',
  'jharkhand': 'hindi',
  'uttarakhand': 'hindi',
  'himachal pradesh': 'hindi',
  'chhattisgarh': 'hindi',
};

function getLocalLanguageFromAddress(address: string): string {
  const state = detectStateFromAddress(address);
  if (state) {
    return STATE_LANG_MAP[state] || 'hindi';
  }
  return '';
}

// Convert subset-font shifted Gujarati unicode points back to Devanagari (Marathi/Hindi)
function fixGujaratiToDevanagariShift(text: string): string {
  if (!text) return '';
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code >= 0x0A80 && code <= 0x0AFF) {
      return String.fromCharCode(code - 0x0180);
    }
    return char;
  }).join('');
}

// Smart space healing for concatenated Indic names based on English word structures
function splitConcatenatedIndicName(repaired: string, englishName: string): string {
  if (!repaired || !englishName) return repaired;
  let name = repaired.trim().replace(/\s+/g, ' ');
  const engWords = englishName.trim().split(/\s+/).filter(Boolean);
  if (engWords.length <= 1) return name;

  // If word count already matches or exceeds English word count, DO NOT alter internal spaces!
  let currentTokens = name.split(/\s+/);
  if (currentTokens.length >= engWords.length) {
    return name;
  }

  // 1. Split before independent vowels if they are in the middle of a token
  const independentVowels = /[अआइईउऊऋएऐओऔઅઆઇઈઉઊઋએઐઓઔ]/;
  let newName = '';
  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    if (i > 0 && independentVowels.test(char) && name[i - 1] !== ' ') {
      newName += ' ';
    }
    newName += char;
  }
  name = newName.replace(/\s+/g, ' ').trim();

  currentTokens = name.split(/\s+/);
  if (currentTokens.length >= engWords.length) {
    return name;
  }

  // 2. Safely split concatenated tokens ONLY at full English word initial boundaries
  const engToIndicStartMap: Record<string, string[]> = {
    'r': ['ર', 'र', 'ర', 'ர', 'ರ', 'ര', 'র', 'ਰ', 'ର'],
    'b': ['ભ', 'બ', 'भ', 'ब', 'భ', 'బ', 'ப', 'ಭ', 'ಬ', 'ഭ', 'ബ', 'ভ', 'ব', 'ਭ', 'ਬ', 'ଭ', 'ବ'],
    'v': ['વ', 'व', 'వ', 'வ', 'ವ', 'വ', 'ভ', 'ਬ', 'ଵ'],
    'w': ['વ', 'व', 'వ', 'வ', 'ವ', 'വ'],
    'p': ['પ', 'प', 'ప', 'ப', 'ಪ', 'പ', 'প', 'ਪ', 'ପ'],
    'k': ['ક', 'क', 'క', 'க', 'ಕ', 'ക', 'ক', 'ਕ', 'କ'],
    'n': ['ન', 'न', 'న', 'ன', 'ನ', 'ന', 'ন', 'ਨ', 'ନ'],
    'm': ['મ', 'म', 'మ', 'ம', 'ಮ', 'മ', 'ম', 'ਮ', 'ମ'],
    's': ['સ', 'શ', 'ષ', 'स', 'श', 'ष', 'స', 'శ', 'ஸ', 'ஷ', 'സ', 'സ', 'স', 'ਸ', 'ସ'],
    'h': ['હ', 'ह', 'హ', 'ஹ', 'ಹ', 'ഹ', 'হ', 'ਹ', 'ဟ'],
    'd': ['દ', 'ધ', 'द', 'ध', 'ద', 'ధ', 'த', 'ದ', 'ಧ', 'ദ', 'ധ', 'দ', 'ਧ', 'ଦ'],
    'g': ['ગ', 'ग', 'గ', 'க', 'ഗ', 'ഗ', 'গ', 'ਗ', 'ଗ'],
    'j': ['જ', 'ज', 'జ', 'ஜ', 'ಜ', 'ജ', 'જ', 'ਜ', 'ଜ'],
    'ch': ['ચ', 'च', 'చ', 'ச', 'ಚ', 'ച', 'চ', 'ਚ', 'ଚ'],
    'sh': ['શ', 'श', 'శ', 'ష', 'ஸ', 'ಶ', 'ശ', 'শ', 'ਸ਼', 'ଶ']
  };

  const newTokens: string[] = [];
  for (let tIdx = 0; tIdx < currentTokens.length; tIdx++) {
    let token = currentTokens[tIdx];

    if (tIdx < engWords.length - 1 && token.length >= 4) {
      const nextEngWord = engWords[tIdx + 1].toLowerCase();
      let startKey = nextEngWord[0];
      if (nextEngWord.startsWith('sh') || nextEngWord.startsWith('ch')) {
        startKey = nextEngWord.substring(0, 2);
      }

      const possibleIndicStarts = engToIndicStartMap[startKey] || [];
      for (const startChar of possibleIndicStarts) {
        const splitIdx = token.indexOf(startChar);
        if (splitIdx >= 3 && token[splitIdx - 1] !== ' ') {
          token = token.substring(0, splitIdx) + ' ' + token.substring(splitIdx);
          break;
        }
      }
    }
    newTokens.push(token);
  }

  return newTokens.join(' ').replace(/\s+/g, ' ').trim();
}



// Allow parsing of body size up to 10MB for PDFs in App Router
export const maxDuration = 60;

function detectLanguageFromText(text: string): string {
  if (!text) return 'english';

  const counts: Record<string, number> = {
    gujarati: (text.match(/[\u0A80-\u0AFF]/g) || []).length,
    tamil: (text.match(/[\u0B80-\u0BFF]/g) || []).length,
    telugu: (text.match(/[\u0C00-\u0C7F]/g) || []).length,
    kannada: (text.match(/[\u0C80-\u0CFF]/g) || []).length,
    malayalam: (text.match(/[\u0D00-\u0D7F]/g) || []).length,
    bengali: (text.match(/[\u0980-\u09FF]/g) || []).length,
    punjabi: (text.match(/[\u0A00-\u0A7F]/g) || []).length,
    odia: (text.match(/[\u0B00-\u0B7F]/g) || []).length,
    devanagari: (text.match(/[\u0900-\u097F]/g) || []).length,
    urdu: (text.match(/[\u0600-\u06FF]/g) || []).length,
  };

  let maxLang = 'english';
  let maxCount = 0;

  for (const [lang, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang;
    }
  }

  if (maxCount === 0) return 'english';
  if (maxLang === 'devanagari') {
    if (/[\u0933]/.test(text)) return 'marathi';
    return 'hindi';
  }
  if (maxLang === 'bengali') {
    if (/[\u09F0\u09F1]/.test(text)) return 'assamese';
    return 'bengali';
  }

  return maxLang;
}

function applyDynamicRepairs(text: string, dynamicMappings: Record<string, string>): string {
  if (!text || !dynamicMappings) return text;
  let repaired = text;
  // Sort keys by length descending to match longest sequences first
  const sortedKeys = Object.keys(dynamicMappings).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (key.length >= 2 && repaired.includes(key)) {
      const value = dynamicMappings[key];
      repaired = repaired.split(key).join(value);
    }
  }
  return repaired;
}

async function callGoogleVisionOcr(base64Image: string, apiKey: string): Promise<string> {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            features: [{ type: 'TEXT_DETECTION' }],
            imageContext: {
              languageHints: ['gu', 'hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'pa', 'or']
            }
          }
        ]
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Vision API error: ${response.status} | ${errText}`);
    }
    const result = await response.json();
    const textAnnotation = result.responses?.[0]?.textAnnotations?.[0];
    return textAnnotation?.description || '';
  } catch (error: any) {
    console.error('[VisionOCR] API Call failed:', error.message);
    return '';
  }
}

function parseLocalNameFromOcr(ocrText: string): string {
  if (!ocrText) return '';
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const isIndic = (text: string) => /[\u0900-\u0D7F]/.test(text);
  const noiseKeywords = [
    'ભારત', 'સરકાર', 'ભારતીય', 'ઓળખ', 'પ્રાધિકરણ',
    'भारत', 'सरकार', 'प्राधिकरण', 'अथॉरिटी',
    'Authority', 'Government', 'India', 'Unique',
    'જન્મ', 'તારીખ', 'DOB', 'YOB', 'વર્ષ',
    'પુરુષ', 'સ્ત્રી', 'MALE', 'FEMALE',
    'લિંગ', 'જન્મ તિથિ', 'વર્ચ્યુઅલ', 'આઈડી', 'VID',
    'તમારો', 'આધાર', 'મારો', 'મેરી', 'મેરા', 'પહચાન',
    'Signature', 'Not', 'Verified', 'Digitally', 'signed',
    'DATE', 'Valid'
  ];
  const isNoise = (text: string): boolean => {
    const lower = text.toLowerCase();
    return noiseKeywords.some(kw => lower.includes(kw.toLowerCase()));
  };
  for (const line of lines) {
    if (isIndic(line) && !isNoise(line) && line.length >= 3 && !/\d/.test(line)) {
      console.log('[VisionOCR] Extracted local name candidate from front card OCR:', line);
      return line;
    }
  }
  return '';
}

function parseLocalAddressFromOcr(ocrText: string): string {
  if (!ocrText) return '';
  const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const isIndic = (text: string) => /[\u0900-\u0D7F]/.test(text);
  const addressKeywords = [
    'સરનામું', 'સરનામુ', 'पता', 'पत्ता', 'முகவரி', 'చిరునామా', 'చిరునామా:', 'విళાસ', 'മേൽവിലാസം', 'پتا', 'ଠିକଣା', 'ঠিকানা', 'ਪਤਾ'
  ];
  let addressStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasAddrKeyword = addressKeywords.some(kw => line.toLowerCase().includes(kw));
    if (hasAddrKeyword && isIndic(line)) {
      addressStartIndex = i;
      break;
    }
  }
  if (addressStartIndex === -1) {
    const relationKeywords = [
      'દ્વારા', 'द्वारा', 'ద్వారా', 'વઝિયાક', 'મૂલક', 'વઝિ', 'માધ્યમે', 'દુઆરા', 'ଦ୍ବାରା',
      'c/o', 's/o', 'w/o', 'd/o', 'c.o.', 's.o.', 'w.o.', 'd.o.'
    ];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasRelation = relationKeywords.some(kw => line.toLowerCase().includes(kw));
      if (hasRelation && isIndic(line)) {
        addressStartIndex = i;
        break;
      }
    }
  }
  if (addressStartIndex !== -1) {
    return lines.slice(addressStartIndex).join('\n');
  }
  return '';
}

export function crossReferenceRepairLocalName(englishName: string, localName: string, lang: string): string {
  if (!localName) return '';
  let repaired = localName.trim();
  const langLower = (lang || '').toLowerCase();

  if (langLower === 'gujarati') {
    const commonGujaratiNameParts = [
      'પટેલ', 'શાહ', 'જોશી', 'સોની', 'સોનાર', 'ગોહિલ', 'મોદી', 'દવે',
      'જાની', 'ભટ્ટ', 'રાવલ', 'મોરી', 'કંઠારીયા', 'પ્રજાપતિ', 'કડિયા',
      'સુથાર', 'લોહાર', 'ઝાલા', 'જાડેજા', 'ચાવડા', 'કુસુમ', 'અનિલ',
      'અમિત', 'વિજય', 'વિનય', 'વિકાસ', 'નિતિન', 'કિરણ', 'હર્ષ',
      'બાઇ', 'ભાઇ', 'લાલ', 'રાય', 'દેવી', 'બેન', 'સિંઘ', 'જી'
    ];
    commonGujaratiNameParts.sort((a, b) => b.length - a.length);
    for (const part of commonGujaratiNameParts) {
      let idx = repaired.indexOf(part);
      while (idx !== -1) {
        if (idx > 0 && repaired[idx - 1] !== ' ') {
          repaired = repaired.substring(0, idx) + ' ' + repaired.substring(idx);
          idx++;
        }
        const endIdx = idx + part.length;
        if (endIdx < repaired.length && repaired[endIdx] !== ' ') {
          repaired = repaired.substring(0, endIdx) + ' ' + repaired.substring(endIdx);
        }
        idx = repaired.indexOf(part, idx + part.length + 1);
      }
    }
  }

  // Apply script-independent splitConcatenatedIndicName to safely restore word boundaries without chopping characters
  repaired = splitConcatenatedIndicName(repaired, englishName);
  return repaired;
}

interface RepairAssets {
  poLabel: string;
  distLabel: string;
  soLabel: string;
  woLabel: string;
  doLabel: string;
  coLabel: string;
  stateMap: Record<string, string>;
}

const LANGUAGE_REPAIR_CONFIG: Record<string, RepairAssets> = {
  hindi: {
    poLabel: 'डाकघर:',
    distLabel: 'जिला:',
    soLabel: 'आत्मज:',
    woLabel: 'पत्नी:',
    doLabel: 'सुपुत्री:',
    coLabel: 'केयर ऑफ:',
    stateMap: {
      'rajasthan': 'राजस्थान',
      'gujarat': 'गुजरात',
      'maharashtra': 'महाराष्ट्र',
      'uttar pradesh': 'उत्तर प्रदेश',
      'madhya pradesh': 'मध्य प्रदेश',
      'delhi': 'दिल्ली',
      'punjab': 'पंजाब',
      'haryana': 'हरियाणा',
      'bihar': 'बिहार',
      'west bengal': 'पश्चिम बंगाल',
      'andhra pradesh': 'आंध्र प्रदेश',
      'telangana': 'तेलंगाना',
      'karnataka': 'कर्नाटक',
      'tamil nadu': 'तमिलनाडु',
      'kerala': 'केरल',
      'odisha': 'ओडिशा',
      'assam': 'असम',
    }
  },
  devanagari: {
    poLabel: 'डाकघर:',
    distLabel: 'जिला:',
    soLabel: 'आत्मज:',
    woLabel: 'पत्नी:',
    doLabel: 'सुपुत्री:',
    coLabel: 'केयर ऑफ:',
    stateMap: {
      'rajasthan': 'राजस्थान',
      'gujarat': 'गुजरात',
      'maharashtra': 'महाराष्ट्र',
      'uttar pradesh': 'उत्तर प्रदेश',
      'madhya pradesh': 'मध्य प्रदेश',
      'delhi': 'दिल्ली',
      'punjab': 'पंजाब',
      'haryana': 'हरियाणा',
      'bihar': 'बिहार',
      'west bengal': 'पश्चिम बंगाल',
      'andhra pradesh': 'आंध्र प्रदेश',
      'telangana': 'तेलंगाना',
      'karnataka': 'कर्नाटक',
      'tamil nadu': 'तमिलनाडु',
      'kerala': 'केरल',
      'odisha': 'ओडिशा',
      'assam': 'असम',
    }
  },
  marathi: {
    poLabel: 'पोस्ट:',
    distLabel: 'जिल्हा:',
    soLabel: 'आत्मज:',
    woLabel: 'पत्नी:',
    doLabel: 'सुपुत्री:',
    coLabel: 'केअर ऑफ:',
    stateMap: {
      'maharashtra': 'महाराष्ट्र',
      'goa': 'गोवा',
      'gujarat': 'गुजरात',
      'rajasthan': 'राजस्थान',
    }
  },
  gujarati: {
    poLabel: 'પોસ્ટ:',
    distLabel: 'જીલ્લો:',
    soLabel: 'આત્મજ:',
    woLabel: 'પત્ની:',
    doLabel: 'પુત્રી:',
    coLabel: 'કેર ઓફ:',
    stateMap: {
      'gujarat': 'ગુજરાત',
      'maharashtra': 'મહારાષ્ટ્ર',
      'rajasthan': 'રાજસ્થાન',
    }
  }
};
const UNUSED_LEGACY_CONFIG: any = {
  tamil: {
      soLabel: 'à°à±à°®à°¾à°°à±à°¡à±:',
        woLabel: 'à°­à°¾à°°à±à°¯:',
          doLabel: 'à°à±à°®à°¾à°°à±à°¤à±:',
            coLabel: 'à°à±à°°à± à°à°«à±:',
              stateMap: {
    'andhra pradesh': 'à°à°à°§à±à°°à°ªà±à°°à°¦à±à°¶à±',
      'telangana': 'à°¤à±à°²à°à°à°¾à°£',
    }
},
kannada: {
  poLabel: 'à²à²à²à³:',
    distLabel: 'à²à²¿à²²à³à²²à³:',
      soLabel: 'à²®à²:',
        woLabel: 'à²ªà²¤à³à²¨à²¿:',
          doLabel: 'à²®à²à²³à³:',
            coLabel: 'à²à³à²°à³ à²à²«à³:',
              stateMap: {
    'karnataka': 'à²à²°à³à²¨à²¾à²à²',
    }
},
malayalam: {
  poLabel: 'à´ªàµà´¸àµà´±àµà´±àµ:',
    distLabel: 'à´à´¿à´²àµà´²:',
      soLabel: 'à´®à´àµ»:',
        woLabel: 'à´­à´¾à´°àµà´¯:',
          doLabel: 'à´®à´àµ¾:',
            coLabel: 'à´àµà´¯àµ¼ à´à´«àµ:',
              stateMap: {
    'kerala': 'à´àµà´°à´³',
    }
},
bengali: {
  poLabel: 'à¦ªà§à¦¸à§à¦:',
    distLabel: 'à¦à§à¦²à¦¾:',
      soLabel: 'à¦ªà§à¦¤à§à¦°:',
        woLabel: 'à¦¸à§à¦¤à§à¦°à§:',
          doLabel: 'à¦à¦¨à§à¦¯à¦¾:',
            coLabel: 'à¦¯à¦¤à§à¦¨à§:',
              stateMap: {
    'west bengal': 'à¦ªà¦¶à§à¦à¦¿à¦®à¦¬à¦à§à¦',
      'tripura': 'à¦¤à§à¦°à¦¿à¦ªà§à¦°à¦¾',
    }
},
punjabi: {
  poLabel: 'à¨¡à¨¾à¨à¨à¨¾à¨¨à¨¾:',
    distLabel: 'à¨à¨¼à¨¿à¨²à©à¨¹à¨¾:',
      soLabel: 'à¨ªà©à©±à¨¤à¨°:',
        woLabel: 'à¨ªà¨¤à¨¨à©:',
          doLabel: 'à¨§à©:',
            coLabel: 'à¨à©à¨à¨° à¨à¨«:',
              stateMap: {
    'punjab': 'à¨ªà©°à¨à¨¾à¨¬',
      'haryana': 'à¨¹à¨°à¨¿à¨à¨£à¨¾',
    }
},
odia: {
  poLabel: 'à¬ªà­à¬·à­à¬:',
    distLabel: 'à¬à¬¿à¬²à­à¬²à¬¾:',
      soLabel: 'à¬ªà­à¬¤à­à¬°:',
        woLabel: 'à¬ªà¬¤à­à¬¨à­:',
          doLabel: 'à¬à¬¨à­à­à¬¾:',
            coLabel: 'à¬¯à¬¤à­à¬¨à¬°à­:',
              stateMap: {
    'odisha': 'à¬à¬¡à¬¼à¬¿à¬¶à¬¾',
    }
}
};

export function repairLocalAddress(englishAddress: string | null | undefined, localAddress: string | null | undefined, lang: string): string {
  if (!localAddress) return '';
  if (!englishAddress) return localAddress.trim();

  const langKey = (lang || 'hindi').toLowerCase();
  const config = LANGUAGE_REPAIR_CONFIG[langKey] || LANGUAGE_REPAIR_CONFIG.hindi;

  const engParts = englishAddress.split(',').map(p => p.trim()).filter(Boolean);
  const localParts = localAddress.split(',').map(p => p.trim()).filter(Boolean);

  // 0. Repair relationship name inside address (e.g. C/O, S/O name spacing and shift)
  let firstEngPart = engParts[0] || '';
  let firstLocalPart = localParts[0] || '';
  if (firstEngPart && firstLocalPart) {
    const engRelMatch = firstEngPart.match(/^(C\/O|W\/O|S\/O|D\/O|H\/O|F\/O|C\.O\.|W\.O\.|S\.O\.|D\.O\.)\s*([\s\S]+)$/i);
    if (engRelMatch) {
      const relPrefix = engRelMatch[1];
      const engRelName = engRelMatch[2].trim();

      const allLocalPrefixes = Object.values(LANGUAGE_REPAIR_CONFIG)
        .map(c => [c.soLabel, c.woLabel, c.doLabel, c.coLabel])
        .flat()
        .map(p => p.replace(':', ''))
        .join('|');

      const localRelRegex = new RegExp(`^(${allLocalPrefixes}|C\\/O|W\\/O|S\\/O|D\\/O|C\\.O\\.|S\\.O\\.|W\\.O\\.|D\\.O\\.|à¤à¥à¤¯à¤° à¦à¦«|à¤à¥à¤¯à¤° à¤à¤«|à¤à¥à¤à¤° à¤à¤«|àªà«àª° àªàª«)[:\\s]*([\\s\\S]+)$`, 'i');
      const localRelMatch = firstLocalPart.match(localRelRegex);

      if (localRelMatch) {
        const localPrefix = localRelMatch[1];
        let localRelName = localRelMatch[2].trim();

        if (langKey === 'marathi' || langKey === 'hindi' || langKey === 'devanagari') {
          localRelName = fixGujaratiToDevanagariShift(localRelName);
        }

        const healedLocalRelName = splitConcatenatedIndicName(localRelName, engRelName);
        firstLocalPart = `${localPrefix} ${healedLocalRelName}`;
        localParts[0] = firstLocalPart;
      }
    }
  }

  let localIdx = localParts.length - 1;
  for (let engIdx = engParts.length - 1; engIdx >= 0 && localIdx >= 0; engIdx--) {
    const engPart = engParts[engIdx];
    let localPart = localParts[localIdx];

    // 1. If English part has a PIN code / State
    if (/\b\d{6}\b/.test(engPart)) {
      for (const [engState, localState] of Object.entries(config.stateMap)) {
        if (engPart.toLowerCase().includes(engState)) {
          const parts = localPart.split('-');
          if (parts.length > 1) {
            const statePart = parts[0].trim();
            const pinPart = parts[1].trim();
            localPart = `${localState} - ${pinPart}`;
          } else {
            localPart = localPart.replace(/[^\d\s\u0000-\u007F]+/g, localState);
          }
        }
      }
      localParts[localIdx] = localPart;
      localIdx--;
      continue;
    }

    // 2. If English part starts with DIST
    if (/^DIST\b/i.test(engPart) || /District/i.test(engPart)) {
      localPart = `${config.distLabel} ${localPart.replace(new RegExp(config.distLabel, 'gi'), '').trim()}`;
      localParts[localIdx] = localPart;
      localIdx--;
      continue;
    }

    // 3. If English part starts with PO
    if (/^PO\b/i.test(engPart) || /^P\.O\./i.test(engPart) || /Post\s*Office/i.test(engPart)) {
      localPart = `${config.poLabel} ${localPart.replace(new RegExp(config.poLabel, 'gi'), '').trim()}`;
      localParts[localIdx] = localPart;
      localIdx--;
      continue;
    }

    // Otherwise align one step down
    localIdx--;
  }

  // 4. Handle relationship prefix at index 0 of localAddress
  if (localParts.length > 0) {
    let firstPart = localParts[0];
    const relMatch = firstPart.match(/^(S\/O|W\/O|D\/O|C\/O|C\.O\.|S\.O\.|W\.O\.|D\.O\.)[:\s]*/i);
    if (relMatch) {
      const rel = relMatch[1].toUpperCase().replace(/\./g, '');
      let localPrefix = '';
      if (rel === 'SO') localPrefix = config.soLabel;
      else if (rel === 'WO') localPrefix = config.woLabel;
      else if (rel === 'DO') localPrefix = config.doLabel;
      else if (rel === 'CO') localPrefix = config.coLabel;

      if (localPrefix) {
        firstPart = firstPart.replace(/^(S\/O|W\/O|D\/O|C\/O|C\.O\.|S\.O\.|W\.O\.|D\.O\.)[:\s]*/i, `${localPrefix} `);
        localParts[0] = firstPart;
      }
    } else {
      const engRelMatch = engParts[0]?.match(/^(S\/O|W\/O|D\/O|C\/O|C\.O\.|S\.O\.|W\.O\.|D\.O\.)[:\s]*/i);
      if (engRelMatch) {
        const rel = engRelMatch[1].toUpperCase().replace(/\./g, '');
        let localPrefix = '';
        if (rel === 'SO') localPrefix = config.soLabel;
        else if (rel === 'WO') localPrefix = config.woLabel;
        else if (rel === 'DO') localPrefix = config.doLabel;
        else if (rel === 'CO') localPrefix = config.coLabel;

        const allLocalPrefixes = Object.values(LANGUAGE_REPAIR_CONFIG)
          .map(c => [c.soLabel, c.woLabel, c.doLabel, c.coLabel])
          .flat()
          .map(p => p.replace(':', '[:\\s]*'))
          .join('|');
        const prefixRegex = new RegExp(`^(${allLocalPrefixes})`, 'i');

        if (localPrefix && !prefixRegex.test(firstPart)) {
          localParts[0] = `${localPrefix} ${firstPart}`;
        }
      }
    }
  }

  return localParts.join(', ');
}

function getCorrectGenderLine(genderLine: string, gender: string, lang: string): string {
  const genderLower = (gender || '').toUpperCase();
  const langLower = (lang || '').toLowerCase();

  const mapping: Record<string, { male: string; female: string; trans: string }> = {
    odia: { male: 'à¬ªà­à¬°à­à¬· / MALE', female: 'à¬®à¬¹à¬¿à¬³à¬¾ / FEMALE', trans: 'à¬°à­à¬ªà¬¾à¬¨à­à¬¤à¬°à¬¿à¬¤ à¬²à¬¿à¬à­à¬ / TRANSGENDER' },
    urdu: { male: 'ÙØ±Ø¯ / MALE', female: 'Ø¹ÙØ±Øª / FEMALE', trans: 'Ø®ÙØ§Ø¬Û Ø³Ø±Ø§ / TRANSGENDER' },
    english: { male: 'MALE', female: 'FEMALE', trans: 'TRANSGENDER' }
  };

  const currentMap = mapping[langLower] || mapping.english;

  if (genderLower.includes('FEMALE')) {
    return currentMap.female;
  } else if (genderLower.includes('TRANS')) {
    return currentMap.trans;
  } else {
    return currentMap.male;
  }
}

function getCorrectDobLine(dob: string, lang: string): string {
  const langLower = (lang || '').toLowerCase();
  const mapping: Record<string, string> = {
    gujarati: 'àªàª¨à«àª® àª¤àª¾àª°à«àª / DOB: ',
    hindi: 'à¤à¤¨à¥à¤® à¤¤à¤¿à¤¥à¤¿ / DOB: ',
    marathi: 'à¤à¤¨à¥à¤® à¤¤à¤¾à¤°à¥à¤ / DOB: ',
    devanagari: 'à¤à¤¨à¥à¤® à¤¤à¤¿à¤¥à¤¿ / DOB: ',
    tamil: 'à®ªà®¿à®±à®¨à¯à®¤ à®¤à¯à®¤à®¿ / DOB: ',
    telugu: 'à°ªà±à°à±à°à°¿à°¨ à°¤à±à°¦à± / DOB: ',
    kannada: 'à²¹à³à²à³à²à²¿à²¦ à²¦à²¿à²¨à²¾à²à² / DOB: ',
    malayalam: 'à´à´¨à´¨ à´¤àµà´¯à´¤à´¿ / DOB: ',
    bengali: 'à¦à¦¨à§à¦® à¦¤à¦¾à¦°à¦¿à¦ / DOB: ',
    assamese: 'à¦à¦¨à§à¦® à¦¤à¦¾à§°à¦¿à¦ / DOB: ',
    punjabi: 'à¨à¨¨à¨® à¨®à¨¿à¨¤à© / DOB: ',
    odia: 'à¬à¬¨à­à¬® à¬¤à¬¾à¬°à¬¿à¬ / DOB: ',
    urdu: 'ØªØ§Ø±ÛØ® Ù¾ÛØ¯Ø§Ø¦Ø´ / DOB: ',
    english: 'DOB: '
  };
  const label = mapping[langLower] || mapping.english;
  return `${label}${dob || ''}`.trim();
}

function getCorrectAddressLabel(lang: string): string {
  const langLower = (lang || '').toLowerCase();
  const mapping: Record<string, string> = {
    gujarati: 'àª¸àª°àª¨àª¾àª®à«àª :',
    hindi: 'à¤ªà¤¤à¤¾ :',
    marathi: 'à¤ªà¤¤à¥à¤¤à¤¾ :',
    tamil: 'à®®à¯à®à®µà®°à®¿ :',
    telugu: 'à°à°¿à°°à±à°¨à°¾à°®à°¾ :',
    kannada: 'à²µà²¿à²³à²¾à²¸ :',
    malayalam: 'à´®àµàµ½à´µà´¿à´²à´¾à´¸à´ :',
    bengali: 'à¦ à¦¿à¦à¦¾à¦¨à¦¾ :',
    assamese: 'à¦ à¦¿à¦à¦¨à¦¾ :',
    punjabi: 'à¨ªà¨¤à¨¾ :',
    odia: 'à¬ à¬¿à¬à¬£à¬¾ :',
    urdu: 'Ù¾ØªÛ :',
    english: 'Address:'
  };
  return mapping[langLower] || mapping.english;
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function calculateChangePercentage(original: string, modified: string): number {
  if (!original) return 0;
  const distance = levenshteinDistance(original, modified);
  // Allow up to 6 character changes safely for short strings without triggering the % limit
  // Indic conjuncts like àªà«àª· use 4 codepoints (àª + à« + àª· + à«), so a single visual missing letter is distance=4.
  if (distance <= 6) return 0;
  return (distance / Math.max(original.length, 1)) * 100;
}

/**
 * Checks if a PDF buffer is encrypted (password-protected).
 */
async function checkIsEncrypted(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
    return false;
  } catch (e: any) {
    if (e.message?.includes('encrypted') || e.message?.includes('decrypt') || e.name === 'EncryptedPDFError') {
      return true;
    }
    throw e;
  }
}

/**
 * Fallback parser using pdfjs-dist to extract text from PDFs that have unsupported encryption.
 */
async function extractTextWithPdfJs(pdfBytes: Uint8Array, password: string | null): Promise<string> {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
    password: password || undefined,
    useSystemFonts: true,
    isEvalSupported: false,
    disableWorker: true,
  });
  const pdf = await loadingTask.promise;
  console.log('PDF_LOADED');
  console.log(`TOTAL_PAGES = ${pdf.numPages}`);
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const pageIndex = i - 1;
    console.log(`READING_PAGE_${i}`);
    if (pageIndex >= pdf.numPages) {
      throw new Error(`Invalid page index ${pageIndex} of ${pdf.numPages}`);
    }
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

/**
 * Extracts text from a PDF buffer by unlocking it if necessary and parsing it server-side.
 */
async function extractTextFromPdf(
  pdfBytes: Uint8Array,
  password: string | null
): Promise<{ text: string; decryptedBytes: Uint8Array; error?: never } | { text?: never; decryptedBytes?: never; error: string; code?: number }> {
  try {
    const isEncrypted = await checkIsEncrypted(pdfBytes);
    console.log(`[PdfExtract] PDF encryption status: ${isEncrypted}`);

    let workingBytes = pdfBytes;
    if (isEncrypted) {
      if (!password) {
        console.log('[PdfExtract] PDF is encrypted, but no password was provided');
        return { error: 'PASSWORD_REQUIRED', code: 1 };
      }

      try {
        console.log('[PdfExtract] PASSWORD_UNLOCK_ATTEMPT: Attempting decryption with password...');
        workingBytes = await decryptPDF(pdfBytes, password);
        console.log('PDF_DECRYPTED');
      } catch (decryptError: any) {
        console.error('[PdfExtract] Decryption failed:', decryptError.message);
        if (decryptError.message?.includes('Unsupported encryption') || decryptError.message?.includes('V=')) {
          console.log('[PdfExtract] Decryption failed due to unsupported encryption version. Falling back to pdfjs-dist text extraction...');
          try {
            const text = await extractTextWithPdfJs(pdfBytes, password);
            console.log(`[PdfExtract] Successfully extracted text using pdfjs-dist fallback. Length: ${text.length}`);
            return { text, decryptedBytes: pdfBytes };
          } catch (pdfjsErr: any) {
            console.error('[PdfExtract] pdfjs-dist extraction fallback failed:', pdfjsErr.name, '|', pdfjsErr.message);
            if (pdfjsErr.name === 'PasswordException' || pdfjsErr.name === 'DataCloneError' || pdfjsErr.message?.includes('password') || pdfjsErr.message?.includes('unsupported type')) {
              return { error: 'INVALID_PASSWORD', code: 2 };
            }
            return { error: `Failed to read PDF: ${pdfjsErr.message}` };
          }
        }
        return { error: 'INVALID_PASSWORD', code: 2 };
      }
    } else {
      console.log('PDF_DECRYPTED');
    }

    console.log('PDF_LOADED');
    try {
      const pdfDoc = await PDFDocument.load(workingBytes, { ignoreEncryption: true });
      console.log(`TOTAL_PAGES = ${pdfDoc.getPageCount()}`);
    } catch (e: any) {
      console.error('[PdfExtract] Error getting page count:', e.message);
    }

    console.log('[PdfExtract] Parsing text using pdf-parse...');
    console.log('typeof PDFParse:', typeof PDFParse);
    const backupBytes = new Uint8Array(workingBytes.slice(0));
    const parser = new PDFParse({ data: workingBytes, disableWorker: true } as any);
    const data = await parser.getText();
    try {
      await parser.destroy();
    } catch (destroyErr: any) {
      console.warn('[PdfExtract] parser.destroy() failed (expected in some pdfjs-dist versions):', destroyErr.message);
    }
    const text = data.text || '';
    console.log(`[PdfExtract] Successfully extracted text. Length: ${text.length}`);

    return { text, decryptedBytes: backupBytes };

  } catch (e: any) {
    console.error('[PdfExtract] Unhandled exception:', e.message);
    return { error: `Failed to read PDF: ${e.message}` };
  }
}

function calculateTextConfidence(original: string, repaired: string): number {
  const o = (original || '').trim();
  const r = (repaired || '').trim();
  if (!o) return 100;

  // Rule 1: If the regional field contains English alphabet letters (excluding C/O prefixes), confidence is 0%
  const cleanO = o.replace(/\b(C\/O|S\/O|D\/O|W\/O|P\/O|DIR|DIST|PO|PIN|STATE|TALUKA|VILLAGE)\b/gi, '').trim();
  if (/[A-Za-z]{2,}/.test(cleanO)) {
    console.log(`[Confidence] Low confidence (0%) because regional field contains English letters: "${o}"`);
    return 0;
  }

  // Rule 2: If we have no changes made by offline engine (o === r), but there is no QR data,
  // we return 90% to trigger Gemini correction (since PDF text layers are frequently corrupted without changes).
  if (o === r) {
    return 90;
  }

  const dist = levenshteinDistance(o, r);
  const score = 100 - (dist / Math.max(o.length, 1)) * 100;
  return Math.max(0, Math.min(100, score));
}

async function invokeUserGeminiRepair(
  apiKey: string,
  lang: string,
  fieldsToRepair: Record<string, string>,
  docType: string,
  state: string | null = null
): Promise<{ result: Record<string, string>; tokensUsed?: { input: number; output: number; total: number; } }> {
  const cacheKeyPrefix = `${lang}:${docType}:`;
  const result: Record<string, string> = {};
  const uncachedFields: Record<string, string> = {};

  for (const [key, val] of Object.entries(fieldsToRepair)) {
    const cacheKey = `${cacheKeyPrefix}${key}:${val}`;
    if (geminiCache.has(cacheKey)) {
      result[key] = geminiCache.get(cacheKey)!;
    } else {
      uncachedFields[key] = val;
    }
  }

  // If all fields are cached, return immediately
  if (Object.keys(uncachedFields).length === 0) {
    console.log('[API/Extract] All fields fetched from Gemini cache.');
    return { result };
  }

  console.log(`[API/Extract] Gemini API key loaded: Yes (length=${apiKey.length})`);
  console.log(`[API/Extract] Model name: gemini-2.0-flash`);

  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[API/Extract] Gemini request timed out (5s threshold reached). Aborting fetch...');
    controller.abort();
  }, 5000); // 5s timeout

  try {
    const englishFields: Record<string, string> = {};
    const brokenRegionalFields: Record<string, string> = {};

    for (const [key, val] of Object.entries(uncachedFields)) {
      if (key.endsWith('English') || key.toLowerCase().includes('english') || key === 'nameEnglish' || key === 'addressEnglish') {
        englishFields[key] = val;
      } else {
        brokenRegionalFields[key] = val;
      }
    }

    const prompt = `You are the AI Official Local Language Reconstruction Engine for ${docType} documents.
Your sole objective is to reconstruct the original official regional-language text exactly as it appears on the government document, using the English text ONLY as a phonetic/spelling reference.

--- DOCUMENT INFORMATION ---
Document Type: ${docType}
State (if available): ${state || 'Not Specified'}

--- INPUT DATA ---
${JSON.stringify({
      EnglishFields: englishFields,
      BrokenRegionalFields: brokenRegionalFields
    }, null, 2)}

--- TARGET LANGUAGE ---
Language: ${lang.toUpperCase()}

--- MANDATORY SYSTEM RULES ---
1. Gemini must NEVER translate names or addresses creatively.
2. Gemini must NEVER invent text or hallucinate information.
3. Gemini must NEVER paraphrase or simplify addresses.
4. Gemini must NEVER create new spellings.
5. Gemini must NEVER modify numbers, PIN codes, UIDs, or English fields.
6. The only responsibility is: Restore damaged regional-language text using the English field as a reference.

--- ADDRESS RULES ---
Keep House Number, PIN Code, Village, Taluka, District, and State exactly the same in regional script. Only repair damaged regional-language words.

--- NAME RULES ---
Never guess names. If confidence is low, repair using English phonetics. Preserve official spelling, never shorten, and never expand initials.

--- FALLBACK RULE ---
If you cannot confidently repair a word, keep the original extracted regional-language word. Never invent or hallucinate.

--- OUTPUT FORMAT ---
Return ONLY a valid JSON object matching the keys of the BrokenRegionalFields input (e.g. ${JSON.stringify(Object.keys(brokenRegionalFields))}).
Do not include any markdown formatting, code blocks (no \`\`\`json), or explanations. Return raw JSON text only.`;

    console.log(`[API/Extract] Prompt size: ${prompt.length} characters`);

    const startTime = Date.now();
    
    // Smart model cascade: try valid active models
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
    let response: any = null;
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json' }
        });
        console.log(`[API/Extract] invokeRepair using model: ${modelName}`);
        break;
      } catch (modelErr: any) {
        console.warn(`[API/Extract] invokeRepair model ${modelName} failed: ${modelErr.message?.substring(0, 60)}`);
      }
    }
    if (!response) throw new Error('All Gemini models failed in invokeUserGeminiRepair');

    const duration = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`[API/Extract] Response received in ${duration}ms`);
    const responseText = (response.text || '').trim();
    console.log(`[API/Extract] Response body:\n${responseText}`);

    const parsed = JSON.parse(responseText);

    // Cache and merge results
    for (const [key, val] of Object.entries(uncachedFields)) {
      const repairedVal = parsed[key] || val;
      const cacheKey = `${cacheKeyPrefix}${key}:${val}`;
      geminiCache.set(cacheKey, repairedVal);
      result[key] = repairedVal;
    }

    // Get token usage metadata from response
    let tokensUsed = undefined;
    if (response.usageMetadata) {
      tokensUsed = {
        input: response.usageMetadata.promptTokenCount || 0,
        output: response.usageMetadata.candidatesTokenCount || 0,
        total: response.usageMetadata.totalTokenCount || 0
      };
    }

    return { result, tokensUsed };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[API/Extract] Gemini request exception:', err);
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const apiStartTime = Date.now();
  try {
    console.log(`[API/Extract] PDF_UPLOAD_RECEIVED (time: ${Date.now()}, elapsed: 0ms)`);
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const password = formData.get('password') as string | null;
    const expectedDocType = formData.get('docType') as string | null;

    // Always trim the password â whitespace causes "INVALID_PASSWORD" errors
    const trimmedPassword = password ? password.trim() : null;

    let userGeminiApiKey: string | null = null;
    let user: any = null;
    let aiEnabled = false;
    let aiRepaired = false;
    let aiWarning: string | null = null;

    // Helper to verify native text is healthy and not garbled/corrupted
    const isHealthyLocalText = (text: string | null | undefined): boolean => {
      if (!text || text.trim().length < 2) return false;
      if (/àª|à§|Ã¢|ï¿½|\uFFFD/i.test(text)) return false;
      return /[\u0900-\u0D7F\u0A80-\u0AFF\u0600-\u06FF]/.test(text);
    };

    try {
      const supabase = await createClient();
      const [authRes, dbRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('users').select('gemini_api_key').maybeSingle().then(r => r)
      ]);
      user = authRes.data?.user || null;
      if (user) {
        // Re-fetch with user id now that we have it
        const { data, error } = await supabase
          .from('users')
          .select('gemini_api_key, remaining_cards')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          if ((data.remaining_cards || 0) <= 0 && process.env.TEST_MODE !== 'true') {
            return NextResponse.json({
              error: 'Recharge Required: You have 0 credits. Please purchase at least the Trial Pack (₹20 for 10 Credits) to start using PVC card services.'
            }, { status: 403 });
          }
          if (data.gemini_api_key) {
            userGeminiApiKey = decrypt(data.gemini_api_key);
            if (userGeminiApiKey) {
              aiEnabled = true;
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[API/Extract] User auth check failed:', err.message);
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 413 });
    }

    const uint8Array = new Uint8Array(await file.arrayBuffer());
    const result = await extractTextFromPdf(uint8Array, trimmedPassword);

    if ('error' in result) {
      if (result.error === 'PASSWORD_REQUIRED') {
        return NextResponse.json({ error: 'PASSWORD_REQUIRED' }, { status: 400 });
      }
      if (result.error === 'INVALID_PASSWORD') {
        return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 400 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const rawText = result.text;
    const decryptedBytes = result.decryptedBytes;
    console.log(`[API/Extract] Text extracted. Length: ${rawText.length}`);

    if (rawText.length < 10) {
      console.warn('[API/Extract] Very short text â PDF may contain only images (scanned)');
      return NextResponse.json({
        error: 'Could not extract text. The PDF may be a scanned image. Please upload a digital (e-Aadhaar) PDF.'
      }, { status: 400 });
    }

    console.log('[API/Extract] Detecting document type...');
    const decryptedBuffer = Buffer.from(decryptedBytes);
    const parser = DocumentDetector.detectAndParse(rawText, decryptedBuffer, trimmedPassword, expectedDocType);

    if (!parser) {
      console.error('[API/Extract] Detection failed. Raw text sample:', rawText.substring(0, 500));
      return NextResponse.json({
        error: 'Unsupported document type. Could not detect Aadhaar, PAN, Ayushman, e-Shram, Voter, or ABHA structure.'
      }, { status: 400 });
    }

    console.log(`[API/Extract] Parser: ${parser.constructor.name}`);
    let extractedData = await parser.parse();

    // Default sources
    extractedData.textSource = (parser as any).qrData ? 'QR_XML' : 'PDF_TEXT';
    extractedData.languageSource = extractedData.textSource;

    console.log('DATA_EXTRACTED_LOCALLY');
    if ((parser as any).qrData) {
      console.log('[API/Extract] TEXT_SOURCE_SELECTED: QR_XML (No Gemini needed for base data)');
    }

    // ââ CAPTURE ORIGINAL PDF TEXT LAYER VALUES âââââââââââââââââââââââââââââââ
    // These values are frozen here â before any AI/QR can modify them.
    // They represent the raw Unicode exactly as embedded in the Aadhaar PDF.
    const originalLocalName = (extractedData.localName || '').trim();
    const originalLocalAddress = (extractedData.localAddress || '').trim();
    console.log(`[LOCAL_LANG_DEBUG] PDF Text Layer â localName="${originalLocalName}" localAddress="${originalLocalAddress.substring(0, 50)}"`);
    // ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

    let repairedLocalName = originalLocalName;
    let repairedLocalAddress = originalLocalAddress;

    const detectedLangForRepair = detectLanguageFromText(
      `${originalLocalName} ${originalLocalAddress}` || rawText
    );

    const googleVisionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    const isVisionOcrEnabled = process.env.ENABLE_VISION_OCR === 'true';
    let visionOcrSuccess = false;
    const ocrLogs: string[] = [];

    ocrLogs.push(`Vision OCR Config - Key present: ${!!googleVisionKey}, Enabled: ${isVisionOcrEnabled}`);

    const hasHealthyNativeText = isHealthyLocalText(originalLocalName) && isHealthyLocalText(originalLocalAddress);
    if (hasHealthyNativeText) {
      ocrLogs.push('Bypassing Google Vision OCR because native PDF parser extracted complete, healthy local language text.');
      console.log('[API/Extract] Bypassing Google Vision OCR: Native PDF parser already has healthy local language text.');
    }

    if (!hasHealthyNativeText && googleVisionKey && isVisionOcrEnabled && decryptedBytes && parser.getDocumentType() === 'AADHAAR') {
      try {
        console.log('[API/Extract] Google Vision OCR: Attempting extraction via high-res PDF rendering and Google OCR...');
        ocrLogs.push('Attempting high-res PDF rendering via Puppeteer...');

        // Convert decrypted bytes to base64 for pdfRenderer
        const decryptedBase64 = Buffer.from(decryptedBytes).toString('base64');

        // Render PDF page and crop full front and back cards
        const crops = await cropAadhaarRegions(decryptedBase64);
        ocrLogs.push(`PDF rendering complete. Front card crop present: ${!!crops.frontCardFull}, Back card crop present: ${!!crops.backCardFull}`);

        if (crops.frontCardFull && crops.backCardFull) {
          console.log('[API/Extract] Running Google Vision API on cropped front and back cards...');
          ocrLogs.push('Sending front and back card images to Google Cloud Vision REST endpoint...');

          // Execute Google OCR in parallel to save time
          const [frontOcrText, backOcrText] = await Promise.all([
            callGoogleVisionOcr(crops.frontCardFull, googleVisionKey),
            callGoogleVisionOcr(crops.backCardFull, googleVisionKey)
          ]);

          ocrLogs.push(`Front card OCR raw text length: ${frontOcrText.length}`);
          ocrLogs.push(`Back card OCR raw text length: ${backOcrText.length}`);

          const ocrLocalName = parseLocalNameFromOcr(frontOcrText);
          const ocrLocalAddress = parseLocalAddressFromOcr(backOcrText);

          ocrLogs.push(`Parsed OCR Local Name: "${ocrLocalName}"`);
          ocrLogs.push(`Parsed OCR Local Address: "${ocrLocalAddress}"`);

          if (ocrLocalName || ocrLocalAddress) {
            console.log(`[API/Extract] Google Vision OCR Success! Name="${ocrLocalName}" Address="${ocrLocalAddress.substring(0, 50)}..."`);
            extractedData.localName = ocrLocalName || extractedData.localName;
            extractedData.localAddress = ocrLocalAddress || extractedData.localAddress;
            repairedLocalName = extractedData.localName || '';
            repairedLocalAddress = extractedData.localAddress || '';
            visionOcrSuccess = true;
            ocrLogs.push('Vision OCR parsing succeeded and overrode local fallbacks.');
          } else {
            ocrLogs.push('Failed to parse name or address from Google OCR text.');
          }
        } else {
          ocrLogs.push('Crops frontCardFull or backCardFull was undefined after rendering.');
        }
      } catch (ocrErr: any) {
        console.error('[API/Extract] Google Vision OCR failed:', ocrErr.message);
        ocrLogs.push(`Google Vision OCR failed with error: ${ocrErr.message}`);
      }
    } else {
      ocrLogs.push(`Bypassed Vision OCR because: KeyMissing=${!googleVisionKey}, Disabled=${!isVisionOcrEnabled}, NoDecryptedBytes=${!decryptedBytes}, DocType=${parser.getDocumentType()}`);
    }

    const docType = parser.getDocumentType();
    const detectedLang = detectLanguageFromText(rawText);

    if (!visionOcrSuccess) {
      if (detectedLangForRepair === 'gujarati') {
        try {
          const dynamicRepairsMap = await getDynamicRepairs();
          const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
          repairedLocalName = repairGujaratiText(originalLocalName, dynamicMappings);
          repairedLocalAddress = repairGujaratiText(originalLocalAddress, dynamicMappings);
        } catch (repairErr: any) {
          console.error('[LOCAL_REPAIR] Failed to run Gujarati repair engine:', repairErr.message);
        }
      } else if (detectedLangForRepair === 'marathi' || detectedLangForRepair === 'hindi' || detectedLangForRepair === 'devanagari') {
        try {
          const dynamicRepairsMap = await getMarathiRepairs();
          const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
          repairedLocalName = repairMarathiText(originalLocalName, dynamicMappings);
          repairedLocalAddress = repairMarathiText(originalLocalAddress, dynamicMappings);
        } catch (repairErr: any) {
          console.error('[LOCAL_REPAIR] Failed to run Marathi repair engine:', repairErr.message);
        }
      }
    }

    // Check if Gemini AI is needed. For Aadhaar, if native text layer/QR XML already extracted clean local text, bypass Gemini to make extraction instant (<1 sec).
    let needGemini = !!((process.env.GEMINI_API_KEY || userGeminiApiKey) && (docType === 'AADHAAR' || docType === 'VOTER' || docType === 'AYUSHMAN' || docType === 'PAN' || docType === 'ESHRAM' || docType === 'ABHA'));
    
    if (docType === 'AADHAAR' && originalLocalName && originalLocalAddress) {
      const isClean = !originalLocalName.includes('\uFFFD') && !originalLocalAddress.includes('\uFFFD') && !originalLocalName.includes('?') && originalLocalName.trim().length > 1;
      if (isClean) {
        console.log('[API/Extract] Native PDF text/QR XML contains complete, clean local language text. Bypassing Gemini AI to make extraction instant (<1s).');
        needGemini = false;
      }
    }
    let tryLocalOcr = false;

    let localOcrData: any = null;
    if (tryLocalOcr) {
      try {
        console.log('[API/Extract] Local OCR: Attempting extraction via local Python OCR service...');
        const formDataObj = new FormData();
        const pdfBlob = new Blob([Buffer.from(decryptedBytes)], { type: 'application/pdf' });
        formDataObj.append('pdf_file', pdfBlob, 'document.pdf');
        if (trimmedPassword) {
          formDataObj.append('password', trimmedPassword);
        }
        formDataObj.append('target_lang', detectedLang);

        const ocrResponse = await fetch('http://127.0.0.1:8000/process-pdf', {
          method: 'POST',
          body: formDataObj,
          signal: AbortSignal.timeout(8000)  // Fast fail: if OCR service isn't up, skip in 8s
        });

        if (ocrResponse.ok) {
          const ocrResult = await ocrResponse.json();
          if (ocrResult.success && (ocrResult.localName || ocrResult.localAddress)) {
            console.log('[API/Extract] Local OCR Success. Bypassing Gemini API.');
            localOcrData = {
              nameLocalScript: ocrResult.localName,
              addressLocalScript: ocrResult.localAddress,
              nameEnglish: extractedData.name,
              dob: extractedData.dob,
              gender: extractedData.gender,
              aadhaarNumber: extractedData.documentNumber,
              vid: extractedData.vid,
              addressEnglish: extractedData.address,
              issuedDate: extractedData.issueDate,
              detailsAsOnDate: extractedData.detailsAsOn
            };
            needGemini = false;
          } else {
            console.log('[API/Extract] Local OCR server returned error status. Disabling Gemini AI extraction to save tokens.');
            needGemini = false;
          }
        } else {
          console.log('[API/Extract] Local OCR server returned error status. Disabling Gemini AI extraction to save tokens.');
          needGemini = false;
        }
      } catch (ocrErr: any) {
        console.warn('[API/Extract] Local OCR service unavailable or timed out. Disabling Gemini AI extraction to save tokens:', ocrErr.message);
        needGemini = false;
      }
    }

    let aiData: any = localOcrData;

    // --- DYNAMIC GEMINI AI EXTRACTION OVERRIDE ---
    if (needGemini) {
      try {
        let promptLang = detectedLang;
        if (promptLang === 'english' && extractedData.address) {
          promptLang = getLocalLanguageFromAddress(extractedData.address) || 'english';
        }
        if (promptLang === 'english') {
          promptLang = 'the regional script visible in the PDF image (e.g. Hindi, Marathi, Bengali, Tamil, etc.)';
        }

          let aiPrompt = '';
          if (docType === 'AADHAAR') {
            aiPrompt = `You are an expert Aadhaar regional text repair engine for ${promptLang.toUpperCase()} script.
Your ONLY job is to output the clean, properly-spaced, and correctly-spelled name and address in the local ${promptLang.toUpperCase()} language.

REFERENCE DATA (English & Raw Local fields extracted from PDF):
- Name (EN): "${extractedData.name || ''}"
- Address (EN): "${extractedData.address || ''}"
- Raw Local Name (PDF): "${originalLocalName || ''}"
- Raw Local Address (PDF): "${originalLocalAddress || ''}"

ORIGINAL PDF TEXT LAYER (Contains encoding/font corruptions):
--- START ---
${rawText}
--- END ---

CRITICAL RULES:
1. NAME REPAIR (CRITICAL): Cross-reference the English Name ("${extractedData.name || ''}") to repair any missing vowel signs (matras) or broken letters in the local name.
   - Example: If English is "Ninave" and local raw text has "નાનાવે" or "નનાવે", you must repair it to "નિનાવે" (adding the missing "િ" matra to match "Ni-").
   - Example: If English is "Siddhi" and local raw text has "સદ્ધિ" or "સદી", repair it to "સિદ્ધિ".
   - Keep the local name parts together as they are spelled, ensuring no letters are dropped or misspelled.
2. WORD FIDELITY & SPACING: Use the English Name and English Address to repair individual broken glyphs, matras, and spacing issues (e.g. joining words that were split like "ચંદ્ર શેખર" -> "ચંદ્રશેખર" if they are one word in English "Chandrashekhar"), but KEEP the exact wording and structure from the PDF text layer.
3. DO NOT translate English into the local language arbitrarily. For example, if the PDF text has "ના દ્વારા" or "દ્વારા", preserve it. DO NOT translate "C/O" into anything else if the local text has a specific prefix.
4. OUTPUT FORMAT: Return ONLY a valid JSON object. No explanation, no markdown, no backticks.
{
  "nameLocalScript": "repaired name in local language",
  "addressLocalScript": "repaired full address in local language"
}`;
          } else if (false) { /*
CRITICAL INSTRUCTIONS:
1. You are a REPAIR ENGINE, NOT a content generator. Your ONLY job is to repair broken characters (glyphs, matras, conjuncts) in the original local-language text.
2. DO NOT translate English into the local language arbitrarily. DO NOT reorder words. DO NOT rewrite addresses. DO NOT hallucinate new data.
5. REPAIR RULE FOR ADDRESS: Preserve the exact structure, line order, and word order of the original local address. Repair broken individual characters and matras (e.g. 'àª¡à«àªàª¡à«àª²à«' -> 'àª¡àª¿àªàª¡à«àª²à«').
6. If the document is purely in English and has absolutely NO regional script anywhere on it, leave local script fields empty. Otherwise, extract the regional script accurately.

FIELD EXTRACTION RULES:
- nameLocalScript: REPAIRED exact name in local script
- nameEnglish: The name in English Roman letters
- dob: Date of birth (DD/MM/YYYY)
- gender: "MALE" or "FEMALE"
- mobile: 10-digit number or null
- aadhaarNumber: 12-digit number (XXXX XXXX XXXX)
- vid: 16-digit number or null
- addressLocalScript: REPAIRED full address in local script
- addressEnglish: Full address in English
- issuedDate: Date from "Aadhaar No. Issued:"
- detailsAsOnDate: Date from "Details As On:"

OUTPUT FORMAT:
Return ONLY a valid JSON object. No explanation, no markdown, no backticks.
{
  "nameLocalScript": "repaired name",
  "nameEnglish": "Name In English",
  "dob": "DD/MM/YYYY",
  "gender": "MALE or FEMALE",
  "mobile": "10 digit number or null",
  "aadhaarNumber": "XXXX XXXX XXXX",
  "vid": "XXXX XXXX XXXX XXXX or null",
  "addressLocalScript": "repaired full address",
  "addressEnglish": "Full address in English",
  "issuedDate": "DD/MM/YYYY or null",
  "detailsAsOnDate": "DD/MM/YYYY or null"
}`;
          */ } else if (docType === 'PAN') {
            aiPrompt = `You are an expert PAN card data extractor.
We have extracted some raw text from the PDF:
--- START RAW TEXT ---
${rawText}
--- END RAW TEXT ---

Extract the following details from the PAN card text:
- name: The person's full name in English Roman capital letters (usually below "Name" or "à¤¨à¤¾à¤®")
- dob: Date of birth in DD/MM/YYYY format
- panNumber: The 10-character alphanumeric PAN number formatted as AAAAA1111A (5 uppercase letters, 4 digits, 1 uppercase letter)

Return ONLY a valid JSON object:
{
  "name": "full name in English",
  "dob": "DD/MM/YYYY",
  "panNumber": "AAAAA1111A"
}`;
          } else if (docType === 'AYUSHMAN') {
            aiPrompt = `You are an expert Ayushman Bharat PMJAY card data extractor. You are looking at the attached PDF of an Ayushman Bharat card.

Extract ALL of the following fields from what you can see in the PDF:
- name: The BENEFICIARY's full name in English (this is the PERSON's name, NOT a city/district/state name)
- dob: Year of Birth (YYYY) or Date of Birth if shown
- gender: exactly "MALE" or "FEMALE"
- pmjayId: The PM-JAY ID / PMJAY ID (alphanumeric, may be numeric-only for some states like UP, usually 8-14 chars)
- state: State name in English (e.g. "Uttar Pradesh", "Gujarat", "Maharashtra")
- district: District name in English
- subdivision: Sub-division / Town / Taluka name in English
- village: Village / Ward name or numeric code
- mobile: 10-digit mobile number if visible (null if not shown)
- abhaNumber: ABHA Health ID number in format XX-XXXX-XXXX-XXXX if shown (null if not)
- rationId: Ration card number if shown (null if not)

IMPORTANT RULES:
1. "name" must be the PERSON's actual name â NOT a district, city, or state name
2. PM-JAY IDs can be purely numeric for some states (like UP) â extract them even if they look like a plain number
3. If a field is not visible or not on the card, return null for that field
4. Return ONLY valid JSON, no explanation, no markdown

Return format:
{
  "name": "FULL NAME IN ENGLISH",
  "dob": "YYYY or DD/MM/YYYY",
  "gender": "MALE or FEMALE",
  "pmjayId": "PMJAY ID or null",
  "state": "State name or null",
  "district": "District name or null",
  "subdivision": "Subdivision/Town or null",
  "village": "Village/Ward or null",
  "mobile": "10 digit number or null",
  "abhaNumber": "XX-XXXX-XXXX-XXXX or null",
  "rationId": "ration ID or null"
}`;
          } else if (docType === 'ESHRAM') {
            aiPrompt = `You are an expert e-Shram card data extractor.
We have extracted some raw text from the PDF:
--- START RAW TEXT ---
${rawText}
--- END RAW TEXT ---

Extract the following details from the e-Shram card text:
- name: The person's full name in English
- dob: Date of birth in DD/MM/YYYY format
- gender: "MALE" or "FEMALE"
- uan: The 12-digit UAN number (Universal Account Number)
- mobile: 10-digit mobile number
- address: Full address in English

Return ONLY a valid JSON object:
{
  "name": "full name in English",
  "dob": "DD/MM/YYYY",
  "gender": "MALE or FEMALE",
  "uan": "XXXXXXXXXXXX",
  "mobile": "10-digit number or null",
  "address": "full address"
}`;
          } else if (docType === 'ABHA') {
            aiPrompt = `You are an expert ABHA (Ayushman Bharat Health Account) health card data extractor.
We have extracted some raw text from the PDF:
--- START RAW TEXT ---
${rawText}
--- END RAW TEXT ---

Extract the following details from the ABHA health card text:
- name: The person's full name in English (usually below "Name of health ID holder" or "Name")
- dob: Date of birth in DD/MM/YYYY format
- gender: "MALE" or "FEMALE" or "TRANSGENDER"
- abhaNumber: The 14-digit ABHA number formatted as XX-XXXX-XXXX-XXXX
- mobile: 10-digit mobile number if printed

Return ONLY a valid JSON object:
{
  "name": "full name in English",
  "dob": "DD/MM/YYYY",
  "gender": "MALE or FEMALE or TRANSGENDER",
  "abhaNumber": "XX-XXXX-XXXX-XXXX",
  "mobile": "10-digit number or null"
}`;
          } else if (docType === 'VOTER') {
            aiPrompt = `You are an expert Voter ID (EPIC) card data extractor with deep knowledge of Indian regional scripts.
Original Extracted PDF Text:
--- START RAW TEXT ---
${rawText}
--- END RAW TEXT ---

Extract the following details from the Voter ID card:
- name: Elector's name in English
- nameLocalScript: Elector's name in local script (e.g. Gujarati/Hindi/Marathi) if present, or null
- fatherName: Father's or Husband's name in English
- fatherNameLocalScript: Father's or Husband's name in local script if present, or null
- dob: Date of birth (DD/MM/YYYY) or Year of Birth or Age (e.g., "30" or "01/01/1985"). Extract age as a number if DOB is not available.
- gender: "MALE" or "FEMALE" or "TRANSGENDER"
- epicNumber: The unique EPIC Number (e.g. ABC1234567 or XYZ/123456/789)
- address: Full address in English
- addressLocalScript: Full address in local script if present, or null
- assemblyConstituency: Assembly Constituency Name & Number (e.g. "155 - Olpad" or "155-àªàª²àªªàª¾àª¡") in English or regional, or null

Return ONLY a valid JSON object:
{
  "name": "full name in English",
  "nameLocalScript": "name in local script or null",
  "fatherName": "father or husband name in English",
  "fatherNameLocalScript": "father or husband name in local script or null",
  "dob": "DD/MM/YYYY or YYYY or age",
  "gender": "MALE or FEMALE or TRANSGENDER",
  "epicNumber": "EPIC Number",
  "address": "full address in English",
  "addressLocalScript": "full address in local script or null",
  "assemblyConstituency": "Assembly Constituency detail"
}`;
          }



        let liveApiKey = process.env.GEMINI_API_KEY;
        try {
          const envPath = require('path').resolve(process.cwd(), '.env.local');
          if (require('fs').existsSync(envPath)) {
            const envFile = require('fs').readFileSync(envPath, 'utf8');
            const match = envFile.match(/GEMINI_API_KEY\s*=\s*["']?(AQ\.[^"'\r\n]+|AIza[^"'\r\n]+)["']?/);
            if (match && match[1]) {
              liveApiKey = match[1];
            }
          }
        } catch (e) {}

        // Only use valid Gemini API keys (not Vision API keys or expired hardcoded keys)
        const candidateKeys = Array.from(new Set([
          liveApiKey,
          userGeminiApiKey,
        ].filter(Boolean))) as string[];

        if (candidateKeys.length === 0) {
          console.warn('[API/Extract] No Gemini API key available. Skipping AI extraction.');
        }

        let aiResult: any = null;
        let lastError: string = '';

        for (const key of candidateKeys) {
          try {
            console.log(`[API/Extract] Trying Gemini API Key (${key.substring(0, 8)}...)...`);
            const ai = new GoogleGenAI({ apiKey: key });

            // Smart model cascade: try valid active models
            const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
            for (const modelName of modelsToTry) {
              try {
                aiResult = await ai.models.generateContent({
                  model: modelName,
                  contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
                  config: { responseMimeType: 'application/json' }
                });
                console.log(`[API/Extract] AI extraction using model: ${modelName}`);
                if (aiResult) break;
              } catch (modelErr: any) {
                console.warn(`[API/Extract] Model ${modelName} failed: ${modelErr.message?.substring(0, 80)}`);
              }
            }

            if (aiResult) break;
          } catch (keyErr: any) {
            lastError = keyErr.message || String(keyErr);
            console.warn(`[API/Extract] Key ${key.substring(0, 8)} failed:`, lastError);
          }
        }

        if (aiResult) {
          const rawText = (aiResult.text || '').replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
          aiData = JSON.parse(rawText);

          console.log('[API/Extract] AI Extraction Success:', aiData.name || aiData.nameEnglish);

          try {
            const supabase = await createClient();
            let targetUserId = user?.id;
            if (!targetUserId) {
              const { data: firstUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
              targetUserId = firstUser?.id || null;
            }
            const inputTokens = aiResult.usageMetadata?.promptTokenCount || 850;
            const outputTokens = aiResult.usageMetadata?.candidatesTokenCount || 95;
            const totalTokens = aiResult.usageMetadata?.totalTokenCount || (inputTokens + outputTokens);

            const { error: insertErr } = await supabase.from('gemini_token_usage').insert({
              user_id: targetUserId,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: totalTokens,
              document_type: docType
            });
            if (insertErr) {
              console.error('[API/Extract] Supabase token insert error:', insertErr.message);
            } else {
              console.log(`[API/Extract] AI Tokens logged to Supabase: total=${totalTokens}`);
            }
          } catch (dbErr: any) {
            console.error('[API/Extract] Failed to log AI extraction tokens to Supabase:', dbErr.message);
          }
        } else {
          console.error('[API/Extract] All Gemini API keys failed. Last error:', lastError);
          ocrLogs.push(`All Gemini API keys failed: ${lastError}`);
        }
      } catch (aiError: any) {
        console.error('[API/Extract] AI Extraction failed, falling back to local text:', aiError.message);
      }
    }

    // --- MERGE LOGIC ---
    if (docType === 'AADHAAR') {
      const qrData = (parser as any).qrData || null;

      if (aiData) {
        // We have successfully run Gemini or Local OCR
        const textSource = localOcrData ? (qrData ? 'QR_XML' : 'LOCAL_OCR') : 'GEMINI';
        const langSource = localOcrData ? (qrData ? 'QR_XML' : 'LOCAL_OCR') : 'GEMINI';

        extractedData.textSource = textSource;
        extractedData.languageSource = langSource;

        const aiLocalName = aiData.nameLocalScript || aiData.nameLocal || aiData.localName || aiData.name_local || repairedLocalName || extractedData.localName || '';
        const aiLocalAddress = aiData.addressLocalScript || aiData.addressLocal || aiData.localAddress || aiData.address_local || repairedLocalAddress || extractedData.localAddress || '';

        if (qrData) {
          console.log('[API/Extract] TEXT_SOURCE_SELECTED: QR_XML (AI emergency fallback path)');
          extractedData = {
            ...extractedData,
            name: qrData.name || extractedData.name || aiData.nameEnglish || aiData.name,
            localName: aiLocalName,
            dob: qrData.dob || qrData.yob || extractedData.dob || aiData.dob,
            gender: qrData.gender || extractedData.gender || aiData.gender,
            documentNumber: qrData.uid || extractedData.documentNumber || aiData.aadhaarNumber,
            vid: qrData.vid || extractedData.vid || aiData.vid,
            address: qrData.address || extractedData.address || aiData.addressEnglish || aiData.address,
            localAddress: aiLocalAddress,
            mobile: extractedData.mobile || aiData.mobile,
            issueDate: extractedData.issueDate || aiData.issuedDate,
            detailsAsOn: extractedData.detailsAsOn || aiData.detailsAsOnDate,
            dobLine: null,
            genderLine: null,
            localAddressLabel: null,
          };
        } else {
          extractedData = {
            ...extractedData,
            name: aiData.nameEnglish || aiData.name || extractedData.name,
            localName: aiLocalName,
            dob: aiData.dob || extractedData.dob,
            gender: aiData.gender || extractedData.gender,
            documentNumber: aiData.aadhaarNumber || extractedData.documentNumber,
            vid: aiData.vid || extractedData.vid,
            address: aiData.addressEnglish || aiData.address || extractedData.address,
            localAddress: aiLocalAddress,
            mobile: extractedData.mobile || aiData.mobile,
            issueDate: extractedData.issueDate || aiData.issuedDate,
            detailsAsOn: extractedData.detailsAsOn || aiData.detailsAsOnDate,
            dobLine: null,
            genderLine: null,
            localAddressLabel: null,
          };
        }
      } else {
        // Offline / local repair fallback path
        console.log('[API/Extract] TEXT_SOURCE_SELECTED: PDF_TEXT (Bypassed/Offline fallback path)');
        extractedData.textSource = qrData ? 'QR_XML' : 'PDF_TEXT';
        extractedData.languageSource = extractedData.textSource;

        // Use QR lname field as the most accurate local name source (direct from UIDAI)
        const qrLocalName = qrData
          ? (qrData.lname || qrData.ln || qrData.local_name || null)
          : null;
        const bestLocalName = (qrLocalName && /[^\x00-\x7F]/.test(qrLocalName))
          ? qrLocalName
          : repairedLocalName;

        // Use QR laddress for local address if available
        const qrLocalAddr = qrData
          ? (qrData.laddress || qrData.local_address || null)
          : null;
        const bestLocalAddress = (qrLocalAddr && /[^\x00-\x7F]/.test(qrLocalAddr))
          ? qrLocalAddr
          : repairedLocalAddress;

        extractedData = {
          ...extractedData,
          name: (qrData?.name) || extractedData.name || '',
          localName: bestLocalName || '',
          dob: (qrData?.dob) || (qrData?.yob) || extractedData.dob || '',
          gender: (qrData?.gender) || extractedData.gender || '',
          documentNumber: (qrData?.uid) || extractedData.documentNumber || '',
          vid: (qrData?.vid) || extractedData.vid || '',
          address: (qrData?.address) || extractedData.address || '',
          localAddress: bestLocalAddress || '',
          mobile: extractedData.mobile || '',
          issueDate: extractedData.issueDate || '',
          detailsAsOn: extractedData.detailsAsOn || '',
          dobLine: null,
          genderLine: null,
          localAddressLabel: null,
        };
      }

      // Calculate confidence score and perform user-provided Gemini correction if needed
      const hasQrLocalData = !!(qrData && (qrData.lname || qrData.laddress || qrData.local_name || qrData.local_address));

      let confidenceScore = 100;
      if (!hasQrLocalData && detectedLangForRepair !== 'english') {
        const nameConf = calculateTextConfidence(originalLocalName, repairedLocalName);
        const addrConf = calculateTextConfidence(originalLocalAddress, repairedLocalAddress);
        confidenceScore = Math.min(nameConf, addrConf);
      }

      const geminiApiKeyForRepair = process.env.GEMINI_API_KEY || userGeminiApiKey;
      const runLegacyAadhaarRepair = false; // Bypassed in favor of the new, optimized translateOrRepairWithAI pipeline to save 50% AI cost
      if (runLegacyAadhaarRepair && !hasQrLocalData && detectedLangForRepair !== 'english' && confidenceScore < 95 && geminiApiKeyForRepair) {
        try {
          console.log(`[API/Extract] Aadhaar regional text detected (${detectedLangForRepair}) with confidence ${confidenceScore.toFixed(1)}% < 95%. Triggering Gemini correction...`);
          const fieldsToRepair = {
            localName: originalLocalName,
            localAddress: originalLocalAddress,
            nameEnglish: extractedData.name || '',
            addressEnglish: extractedData.address || ''
          };
          const repairRes = await invokeUserGeminiRepair(geminiApiKeyForRepair, detectedLangForRepair, fieldsToRepair, 'AADHAAR', extractedData.state || null);
          const repaired = repairRes.result;
          if (repaired.localName) {
            extractedData.localName = repaired.localName;
          }
          if (repaired.localAddress) {
            extractedData.localAddress = repaired.localAddress;
          }
          if (repairRes.tokensUsed) {
            try {
              const supabase = await createClient();
              await supabase.from('gemini_token_usage').insert({
                user_id: user && user.id ? user.id : null,
                input_tokens: repairRes.tokensUsed.input,
                output_tokens: repairRes.tokensUsed.output,
                total_tokens: repairRes.tokensUsed.total,
                document_type: 'AADHAAR'
              });
            } catch (dbErr: any) {
              console.error('[API/Extract] Failed to log Aadhaar repair tokens to Supabase:', dbErr.message);
            }
          }
          aiRepaired = true;
          extractedData.languageSource = 'GEMINI_AI';
          console.log('[API/Extract] Gemini correction completed successfully.');
        } catch (geminiErr: any) {
          const errMsg = geminiErr.message || String(geminiErr);
          console.error('[API/Extract] Gemini correction failed with exception:', geminiErr);
          let errorDetail = "Unknown AI error";
          if (errMsg.includes("aborted") || errMsg.includes("timeout") || geminiErr.name === "AbortError") {
            errorDetail = "Timeout (exceeded 15s limit)";
          } else if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
            errorDetail = "Invalid API Key (401)";
          } else if (errMsg.includes("quota") || errMsg.includes("429")) {
            errorDetail = "Quota exceeded (429)";
          } else {
            errorDetail = errMsg.replace(/\[GoogleGenerativeAI Error\]:\s*/, '').substring(0, 80);
          }
          aiWarning = `AI repair unavailable: ${errorDetail}. Standard language engine used.`;
        }
      }



      // ââ COMMON CLEANUPS AND FORMATTING âââââââââââââââ
      const rawLang = detectLanguageFromText(
        `${extractedData.localName || ''} ${extractedData.localAddress || ''}` || rawText
      );

      // Determine correct language based on the extracted local text
      let currentLang = rawLang;

      // Only fallback to address-based state mapping if no local language is detected (english)
      if (currentLang === 'english' || currentLang === 'unknown') {
        currentLang = getLocalLanguageFromAddress(extractedData.address || '') || 'english';
      }

      // Check explicit slogans and indicators to identify genuine Marathi, Hindi, or Gujarati cards
      // IMPORTANT: Previously these strings were mojibake-encoded and never matched rawText. Now using Unicode.
      const hasMarathiIndicators =
        rawText.includes('\u092E\u093E\u091D\u0947') || // contains "माझ" (Majhe)
        rawText.includes('\u092E\u093E\u091D\u0940') || // contains "माझी" (Majhi)
        rawText.includes('\u0928\u093E\u0917\u0930\u093F\u0915\u0924\u094D\u0935') || // "नागरिकत्व"
        rawText.includes('\u092E\u093E\u0939\u093F\u0924\u0940'); // "माहिती" (Marathi-specific word)

      // NOTE: Hindi indicators use unique slogan phrases printed only on Hindi Aadhaar cards
      const hasHindiIndicators =
        rawText.includes('\u092E\u0947\u0930\u093E \u0906\u0927\u093E\u0930') || // "मेरा आधार"
        rawText.includes('\u092E\u0947\u0930\u0940 \u092A\u0939\u091A\u093E\u0928'); // "मेरी पहचान"

      const hasGujaratiIndicators =
        rawText.includes('\u0AAE\u0ABE\u0AB0\u0ACB') || // "મારો" (Gujarati for "my")
        rawText.includes('\u0AAE\u0ABE\u0AB0\u0AC0') || // "મારી" (Gujarati for "my" fem.)
        /[\u0A80-\u0AFF]/.test(rawText); // Any Gujarati script character
      // ── HIGHEST PRIORITY: Gujarati script or slogan check first ──
      // If Gujarati script or slogans are present anywhere in rawText, trust Gujarati completely!
      // National Devanagari headers (à¤­à¤¾à¤°à¤¤ à¤¸à¤°à¤•à¤¾à¤° etc.) are printed on ALL Aadhaar cards and must NOT block Gujarati detection.
      if (hasGujaratiIndicators) {
        console.log('[LOCAL_LANG_DEBUG] Genuine Gujarati Aadhaar card detected via script/slogan indicators (HIGHEST PRIORITY). Target language: Gujarati.');
        currentLang = 'gujarati';
      } else if (hasMarathiIndicators) {
        console.log('[LOCAL_LANG_DEBUG] Genuine Marathi Aadhaar card detected via slogan indicators. Setting target language to Marathi.');
        currentLang = 'marathi';
      } else if (hasHindiIndicators && currentLang !== 'marathi' && currentLang !== 'gujarati') {
        // Only override to Hindi when rawLang is ambiguous (not already a confident regional language)
        const isAlreadyConfidentRegional = ['gujarati', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali', 'punjabi', 'odia', 'assamese'].includes(rawLang);
        if (!isAlreadyConfidentRegional) {
          console.log('[LOCAL_LANG_DEBUG] Genuine Hindi Aadhaar card detected via indicators. Forcing target language to Hindi.');
          currentLang = 'hindi';
        } else {
          console.log(`[LOCAL_LANG_DEBUG] Hindi slogans present but rawLang=${rawLang} is a confident regional language — keeping regional lang.`);
        }
      }

      // Priority Devanagari Check: Only run when no regional language was already confirmed above.
      // Prevents national Devanagari headers (भारत सरकार on all cards) from overriding correctly
      // detected Gujarati/Tamil/etc. cards.
      const alreadyConfirmedRegional = ['gujarati', 'tamil', 'telugu', 'kannada', 'malayalam', 'bengali', 'punjabi', 'odia', 'assamese'].includes(currentLang);
      if (!alreadyConfirmedRegional && /[\u0900-\u097F]/.test(`${extractedData.localName || ''} ${extractedData.localAddress || ''}`)) {
        if (currentLang !== 'hindi' && currentLang !== 'marathi') {
          // Fallback: use English address state to distinguish Hindi vs Marathi
          const addrLangFromState = getLocalLanguageFromAddress(extractedData.address || '');
          if (addrLangFromState === 'hindi') {
            console.log('[LOCAL_LANG_DEBUG] Devanagari fallback: Hindi-speaking state detected. Setting lang=hindi.');
            currentLang = 'hindi';
          } else if (addrLangFromState === 'marathi') {
            console.log('[LOCAL_LANG_DEBUG] Devanagari fallback: Marathi-speaking state detected. Setting lang=marathi.');
            currentLang = 'marathi';
          } else {
            // Check for Marathi-specific characters not in Hindi
            const localText = `${extractedData.localName || ''} ${extractedData.localAddress || ''}`;
            const hasMarathiChar = /[\u0933\u0934\u0930\u094D\u200D]/.test(localText);
            if (hasMarathiChar) {
              console.log('[LOCAL_LANG_DEBUG] Devanagari fallback: Marathi-specific char found. Setting lang=marathi.');
              currentLang = 'marathi';
            } else {
              console.log('[LOCAL_LANG_DEBUG] Devanagari fallback: No conclusive indicator, defaulting to hindi.');
              currentLang = 'hindi';
            }
          }
        }
      }

      console.log(`[LOCAL_LANG_DEBUG] Raw detected language: ${rawLang} | Final language: ${currentLang}`);
      extractedData.lang = currentLang;

      if (currentLang === 'english') {
        extractedData.localAddress = extractedData.address;
        extractedData.localName = '';
      }

      // ── LOCAL LANGUAGE SELECTION: QR CODE DIRECT & GEMINI AI SINGLE SOURCE OF TRUTH ──
      let finalLocalName = extractedData.localName?.trim() || '';
      let finalLocalAddress = extractedData.localAddress?.trim() || '';

      // If local fields are missing or contain no Indic script, run Gemini AI Precision engine directly
      if (currentLang !== 'english' && (!finalLocalName || !finalLocalAddress || !/[^\x00-\x7F]/.test(finalLocalName))) {
        try {
          const geminiApiKey = process.env.GEMINI_API_KEY || userGeminiApiKey;
          const aiRes = await translateOrRepairWithAI({
            nameEnglish: extractedData.name || '',
            addressEnglish: extractedData.address || '',
            localName: finalLocalName,
            localAddress: finalLocalAddress
          }, currentLang, geminiApiKey);

          if (aiRes.localName) finalLocalName = aiRes.localName;
          if (aiRes.localAddress) finalLocalAddress = aiRes.localAddress;
        } catch (e: any) {
          console.error('[Extract/Route] AI fallback translation error:', e.message);
        }
      }

      extractedData.localName = finalLocalName;
      extractedData.localAddress = finalLocalAddress;

      if (currentLang === 'gujarati') {
        const { repairGujaratiText } = require('../../../utils/gujaratiRepair');
        extractedData.localName = repairGujaratiText(extractedData.localName || '');
        extractedData.localAddress = repairGujaratiText(extractedData.localAddress || '');
      }

      // If language is Devanagari (Marathi/Hindi) but extracted text has subset-font shifted Gujarati codepoints, shift them back to Devanagari
      if ((currentLang === 'marathi' || currentLang === 'hindi' || currentLang === 'devanagari') &&
        (rawLang === 'gujarati' || /[\u0A80-\u0AFF]/.test(extractedData.localName || '') || /[\u0A80-\u0AFF]/.test(extractedData.localAddress || ''))) {
        console.log('[LOCAL_LANG_DEBUG] Correcting Gujarati script offset to Devanagari (Marathi/Hindi)');
        extractedData.localName = fixGujaratiToDevanagariShift(extractedData.localName || '');
        extractedData.localAddress = fixGujaratiToDevanagariShift(extractedData.localAddress || '');
      }



      extractedData.dobLine = getCorrectDobLine(extractedData.dob || '', currentLang);
      extractedData.genderLine = getCorrectGenderLine('', extractedData.gender || 'Male', currentLang);
      extractedData.localAddressLabel = getCorrectAddressLabel(currentLang);
      console.log(`[API/Extract] COMMON_CLEANUPS: lang=${currentLang} dobLine="${extractedData.dobLine}"`);

      // ââ DICTIONARY-BASED AND AI-FALLBACK TRANSLATION FOR MISSING FIELDS ONLY ââ
      // ── DICTIONARY-BASED AND AI-FALLBACK TRANSLATION & REPAIR FOR MISSING OR CORRUPTED LOCAL FIELDS ──
      const checkRepair = detectLocalTextErrors({
        nameEnglish: extractedData.name || '',
        addressEnglish: extractedData.address || '',
        localName: extractedData.localName || '',
        localAddress: extractedData.localAddress || ''
      }, currentLang);

      const wasAiExtracted = extractedData.textSource === 'GEMINI';
      if (!wasAiExtracted && currentLang !== 'english' && checkRepair.needsRepair) {
        console.log(`[TranslationEngine] Indic text repair triggered for lang=${currentLang}. Reason: ${checkRepair.reason}`);
        try {
          const geminiApiKeyForTranslation = process.env.GEMINI_API_KEY || userGeminiApiKey;
          const result = await translateOrRepairWithAI({
            nameEnglish: extractedData.name || '',
            addressEnglish: extractedData.address || '',
            localName: extractedData.localName || '',
            localAddress: extractedData.localAddress || ''
          }, currentLang, geminiApiKeyForTranslation);

          if (result.localName) {
            extractedData.localName = result.localName;
          }
          if (result.localAddress) {
            extractedData.localAddress = result.localAddress;
          }

          // Log token usage to Supabase if tokens were consumed
          if (result.tokensUsed) {
            try {
              const supabase = await createClient();
              await supabase.from('gemini_token_usage').insert({
                user_id: user?.id || null,
                input_tokens: result.tokensUsed.input,
                output_tokens: result.tokensUsed.output,
                total_tokens: result.tokensUsed.total,
                document_type: parser.getDocumentType() || 'AADHAAR'
              });
              console.log(`[TranslationEngine] Logged token usage: Input=${result.tokensUsed.input}, Output=${result.tokensUsed.output}, Total=${result.tokensUsed.total}`);
            } catch (dbErr: any) {
              console.error('[TranslationEngine] Failed to log token usage to Supabase:', dbErr.message);
            }
          }

          aiRepaired = true; // Bypass the over-modification guard for dictionary and AI repairs
          console.log(`[TranslationEngine] Translation/repair applied for lang=${currentLang}. name="${extractedData.localName}" address="${(extractedData.localAddress || '').substring(0, 50)}..."`);
        } catch (transErr: any) {
          console.error(`[TranslationEngine] Failed to apply translation for ${currentLang}:`, transErr.message);
        }
      }

      // ââ LOCAL LANGUAGE PDF TEXT PRESERVATION ââââââââââââââââ
      if (!extractedData.localName) {
        extractedData.localName = originalLocalName || '';
      }
      if (!extractedData.localAddress) {
        extractedData.localAddress = originalLocalAddress || '';
      }

      // ââ ALIGN & LOG REPAIRS ââââââââââââââââââââââââââââââââââââââââââââââ
      if (currentLang !== 'english') {
        alignAndLogRepairs(originalLocalName, finalLocalName, currentLang).catch((err: any) => {
          console.error(`[LOCAL_REPAIR_LOG] Name alignment logging failed for ${currentLang}:`, err.message);
        });
        alignAndLogRepairs(originalLocalAddress, finalLocalAddress, currentLang).catch((err: any) => {
          console.error(`[LOCAL_REPAIR_LOG] Address alignment logging failed for ${currentLang}:`, err.message);
        });
      }

      console.log(`
====== AADHAAR GENERATION AUDIT LOG ======
QR Name:                ${qrData ? qrData.name : '(none)'}
QR Local Name (lname):  ${qrData ? (qrData.lname || qrData.ln || '(not in QR)') : '(none)'}
PDF Local Name:         ${originalLocalName}
Final Repaired Name:    ${extractedData.localName}
-----------------------------------------
QR Address:             ${qrData ? qrData.address : '(none)'}
QR Local Addr (laddr):  ${qrData ? (qrData.laddress || '(not in QR)') : '(none)'}
PDF Local Address:      ${originalLocalAddress}
Final Repaired Addr:    ${extractedData.localAddress}
=========================================
`);
    } else if (docType === 'PAN' && aiData) {
      extractedData = {
        ...extractedData,
        name: aiData.name || extractedData.name,
        dob: aiData.dob || extractedData.dob,
        documentNumber: aiData.panNumber || extractedData.documentNumber,
      };
    } else if (docType === 'AYUSHMAN') {
      if (aiData) {
        // Gemini is the most reliable source for AYUSHMAN across all state formats
        // Use Gemini's data as primary, parser's data only as fallback
        extractedData = {
          ...extractedData,
          name: (extractedData.name && extractedData.name.trim().split(/\s+/).length >= 2) ? extractedData.name.trim() : (aiData.name || extractedData.name),
          dob: extractedData.dob || aiData.dob,
          gender: extractedData.gender || aiData.gender,
          documentNumber: (extractedData.documentNumber && /^[A-Z0-9]{8,16}$/i.test(extractedData.documentNumber)) ? extractedData.documentNumber : (aiData.pmjayId || extractedData.documentNumber),
          vid: extractedData.vid || aiData.abhaNumber,
          state: extractedData.state || aiData.state,
          district: extractedData.district || aiData.district,
          village: extractedData.village || aiData.village,
          subdivision: extractedData.subdivision || aiData.subdivision,
          mobile: extractedData.mobile || aiData.mobile,
          rationId: extractedData.rationId || aiData.rationId,
        };
        console.log('[API/Extract] AYUSHMAN: Gemini extracted -', {
          name: aiData.name, pmjayId: aiData.pmjayId, state: aiData.state,
          district: aiData.district, gender: aiData.gender, dob: aiData.dob
        });
      } else {
        console.warn('[API/Extract] AYUSHMAN: Gemini extraction failed or unavailable. Using parser data as-is.');
      }

      const originalName = (extractedData.name || '').trim();
      const originalDistrict = (extractedData.district || '').trim();
      const originalState = (extractedData.state || '').trim();
      const originalVillage = (extractedData.village || '').trim();
      const originalSubdivision = (extractedData.subdivision || '').trim();

      // Perform local repairs on local fields for AYUSHMAN cards
      const currentLang = detectLanguageFromText(
        `${extractedData.name || ''} ${extractedData.district || ''} ${extractedData.state || ''}`
      );
      if (currentLang === 'gujarati') {
        try {
          const dynamicRepairsMap = await getDynamicRepairs();
          const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
          extractedData.name = repairGujaratiText(extractedData.name || '', dynamicMappings);
          if (extractedData.district) extractedData.district = repairGujaratiText(extractedData.district, dynamicMappings);
          if (extractedData.state) extractedData.state = repairGujaratiText(extractedData.state, dynamicMappings);
          if (extractedData.village) extractedData.village = repairGujaratiText(extractedData.village, dynamicMappings);
          if (extractedData.subdivision) extractedData.subdivision = repairGujaratiText(extractedData.subdivision, dynamicMappings);
        } catch (repairErr: any) {
          console.error('[LOCAL_REPAIR] Ayushman Gujarati repair failed:', repairErr.message);
        }
      } else if (currentLang === 'marathi' || currentLang === 'hindi' || currentLang === 'devanagari') {
        try {
          const dynamicRepairsMap = await getMarathiRepairs();
          const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
          extractedData.name = repairMarathiText(extractedData.name || '', dynamicMappings);
          if (extractedData.district) extractedData.district = repairMarathiText(extractedData.district, dynamicMappings);
          if (extractedData.state) extractedData.state = repairMarathiText(extractedData.state, dynamicMappings);
          if (extractedData.village) extractedData.village = repairMarathiText(extractedData.village, dynamicMappings);
          if (extractedData.subdivision) extractedData.subdivision = repairMarathiText(extractedData.subdivision, dynamicMappings);
        } catch (repairErr: any) {
          console.error('[LOCAL_REPAIR] Ayushman Devanagari repair failed:', repairErr.message);
        }
      }

      // Calculate confidence score and perform user-provided Gemini correction if needed
      let confidenceScore = 100;
      if (currentLang !== 'english') {
        const nameConf = calculateTextConfidence(originalName, extractedData.name || '');
        const distConf = calculateTextConfidence(originalDistrict, extractedData.district || '');
        const stateConf = calculateTextConfidence(originalState, extractedData.state || '');
        const villageConf = calculateTextConfidence(originalVillage, extractedData.village || '');
        const subConf = calculateTextConfidence(originalSubdivision, extractedData.subdivision || '');
        confidenceScore = Math.min(nameConf, distConf, stateConf, villageConf, subConf);
      }

      const geminiApiKeyForAyushman = process.env.GEMINI_API_KEY || userGeminiApiKey;
      if (currentLang !== 'english' && confidenceScore < 95 && geminiApiKeyForAyushman) {
        try {
          console.log(`[API/Extract] Ayushman regional text detected (${currentLang}) with confidence ${confidenceScore.toFixed(1)}% < 95%. Triggering Gemini correction...`);
          const fieldsToRepair: Record<string, string> = {
            name: originalName,
            district: originalDistrict,
            state: originalState,
            village: originalVillage,
            subdivision: originalSubdivision
          };
          const repairRes = await invokeUserGeminiRepair(geminiApiKeyForAyushman, currentLang, fieldsToRepair, 'AYUSHMAN', extractedData.state || null);
          const repaired = repairRes.result;
          if (repaired.name) extractedData.name = repaired.name;
          if (repaired.district) extractedData.district = repaired.district;
          if (repaired.state) extractedData.state = repaired.state;
          if (repaired.village) extractedData.village = repaired.village;
          if (repaired.subdivision) extractedData.subdivision = repaired.subdivision;

          // Log token usage to Supabase if tokens were consumed
          if (repairRes.tokensUsed) {
            try {
              const supabase = await createClient();
              await supabase.from('gemini_token_usage').insert({
                user_id: user?.id || null,
                input_tokens: repairRes.tokensUsed.input,
                output_tokens: repairRes.tokensUsed.output,
                total_tokens: repairRes.tokensUsed.total,
                document_type: 'AYUSHMAN'
              });
            } catch (dbErr: any) {
              console.error('[API/Extract] Failed to log Ayushman repair tokens to Supabase:', dbErr.message);
            }
          }

          aiRepaired = true;
          console.log('[API/Extract] Gemini correction completed successfully for Ayushman.');
        } catch (geminiErr: any) {
          const errMsg = geminiErr.message || String(geminiErr);
          const errStack = geminiErr.stack || "";
          console.error('[API/Extract] Gemini correction failed for Ayushman with exception:', geminiErr);
          console.error('[API/Extract] Exception stack trace:', errStack);

          let errorDetail = "Unknown AI error";
          if (errMsg.includes("aborted") || errMsg.includes("timeout") || geminiErr.name === "AbortError") {
            errorDetail = "Timeout (exceeded 15s limit)";
          } else if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("invalid api key")) {
            errorDetail = "Invalid API Key (401)";
          } else if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("429")) {
            errorDetail = "Quota exceeded (429)";
          } else if (errMsg.includes("permission") || errMsg.includes("403")) {
            errorDetail = "Permission denied (403)";
          } else if (errMsg.includes("not found") || errMsg.includes("404")) {
            errorDetail = "Model not found (404)";
          } else if (errMsg.includes("safety") || errMsg.includes("blocked")) {
            errorDetail = "Safety block (blocked content)";
          } else if (errMsg.includes("fetch failed") || errMsg.includes("network")) {
            errorDetail = "Network error (cannot connect to Google)";
          } else {
            errorDetail = errMsg.replace(/\[GoogleGenerativeAI Error\]:\s*/, '').substring(0, 80);
          }

          aiWarning = `AI repair unavailable: ${errorDetail}. Standard language engine used.`;
        }
      }
    } else if (docType === 'ESHRAM' && aiData) {
      extractedData = {
        ...extractedData,
        name: aiData.name || extractedData.name,
        dob: aiData.dob || extractedData.dob,
        gender: aiData.gender || extractedData.gender,
        documentNumber: aiData.uan || extractedData.documentNumber,
        mobile: aiData.mobile || extractedData.mobile,
        address: aiData.address || extractedData.address,
        frontCardBase64: extractedData.frontCardBase64,
        backCardBase64: extractedData.backCardBase64,
      };
    } else if (docType === 'ABHA' && aiData) {
      extractedData = {
        ...extractedData,
        name: aiData.name || extractedData.name,
        dob: aiData.dob || extractedData.dob,
        gender: aiData.gender || extractedData.gender,
        documentNumber: aiData.abhaNumber || extractedData.documentNumber,
        mobile: aiData.mobile || extractedData.mobile,
      };
    } else if (docType === 'VOTER' && aiData) {
      extractedData = {
        ...extractedData,
        name: aiData.name || extractedData.name,
        localName: aiData.nameLocalScript || extractedData.localName || '',
        dob: aiData.dob || extractedData.dob,
        gender: aiData.gender || extractedData.gender,
        documentNumber: aiData.epicNumber || extractedData.documentNumber,
        address: aiData.address || extractedData.address,
        localAddress: aiData.addressLocalScript || extractedData.localAddress || '',
        fatherName: aiData.fatherName || (extractedData as any).fatherName || '',
        fatherNameLocal: aiData.fatherNameLocalScript || (extractedData as any).fatherNameLocal || '',
        assemblyConstituency: aiData.assemblyConstituency || (extractedData as any).assemblyConstituency || '',
      };

      // Perform local repairs on local fields for VOTER cards
      const currentLang = detectLanguageFromText(
        `${extractedData.localName || ''} ${extractedData.localAddress || ''} ${extractedData.fatherNameLocal || ''}`
      );
      if (currentLang === 'gujarati') {
        try {
          const dynamicRepairsMap = await getDynamicRepairs();
          const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
          extractedData.localName = repairGujaratiText(extractedData.localName || '', dynamicMappings);
          extractedData.localAddress = repairGujaratiText(extractedData.localAddress || '', dynamicMappings);
          if (extractedData.fatherNameLocal) {
            extractedData.fatherNameLocal = repairGujaratiText(extractedData.fatherNameLocal, dynamicMappings);
          }
        } catch (repairErr: any) {
          console.error('[LOCAL_REPAIR] Voter Gujarati repair failed:', repairErr.message);
        }
      } else if (currentLang === 'marathi' || currentLang === 'hindi' || currentLang === 'devanagari') {
        try {
          const dynamicRepairsMap = await getMarathiRepairs();
          const dynamicMappings = Object.fromEntries(dynamicRepairsMap.entries());
          extractedData.localName = repairMarathiText(extractedData.localName || '', dynamicMappings);
          extractedData.localAddress = repairMarathiText(extractedData.localAddress || '', dynamicMappings);
          if (extractedData.fatherNameLocal) {
            extractedData.fatherNameLocal = repairMarathiText(extractedData.fatherNameLocal, dynamicMappings);
          }
        } catch (repairErr: any) {
          console.error('[LOCAL_REPAIR] Voter Devanagari repair failed:', repairErr.message);
        }
      }
    }

    if (docType === 'VOTER' && extractedData.voterCropDebug?.status === 'FAILED') {
      console.warn('[API/Extract] Voter card border verification warning. Proceeding with cropped result.');
    }

    if (docType === 'ABHA' && (extractedData.abhaCropError || !extractedData.frontCardBase64 || !extractedData.backCardBase64)) {
      console.error('[API/Extract] ABHA card extraction failed:', extractedData.abhaCropError || 'missing card images');
      return NextResponse.json({
        error: 'Card region not detected'
      }, { status: 400 });
    }

    console.log('[API/Extract] Success:', {
      name: extractedData.name,
      dob: extractedData.dob,
      gender: extractedData.gender,
      documentNumber: extractedData.documentNumber,
    });

    if (extractedData.photoBase64) {
      console.log(`[API/Extract] PHOTO_SENT_TO_CLIENT: Sending photo (length=${extractedData.photoBase64.length})`);
    } else {
      console.log(`[API/Extract] Photo not extracted automatically. Reason: ${extractedData.photoError || 'Unknown'}`);
    }

    const decryptedPdfBase64 = decryptedBytes ? Buffer.from(decryptedBytes).toString('base64') : null;

    if (extractedData.documentType === 'AYUSHMAN') {
      console.log(`[API/Extract] RESPONSE_SENT (time: ${Date.now()}, elapsed: ${Date.now() - apiStartTime}ms)`);
    }

    aiEnabled = !!aiData;
    aiRepaired = !!aiData;

    return NextResponse.json({
      data: {
        ...extractedData,
        decryptedPdfBase64,
        aiRepaired,
        aiWarning,
        aiEnabled,
        ocrLogs
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API/Extract] Unhandled error:', error);
    const msg = `Processing Error: ${error.message || String(error)}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
