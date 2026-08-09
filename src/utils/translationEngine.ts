import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { learnFromTranslation, translateOfflineWithLearning } from './selfLearningEngine';
import { createClient } from '@/utils/supabase/server';

let gujaratiDict: Record<string, string> = {};
let gujaratiPhonetic: Record<string, string> = {};
let sortedDictKeys: string[] = [];
let sortedPhoneticKeys: string[] = [];

try {
  const dictPath = path.resolve('./src/data/dictionaries/gujarati.json');
  if (fs.existsSync(dictPath)) {
    gujaratiDict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    sortedDictKeys = Object.keys(gujaratiDict).sort((a, b) => b.length - a.length);
  }
} catch (e) {
  console.error('[TranslationEngine] Failed to load gujarati.json:', e);
}

try {
  const phoneticPath = path.resolve('./src/data/dictionaries/gujarati_phonetic.json');
  if (fs.existsSync(phoneticPath)) {
    gujaratiPhonetic = JSON.parse(fs.readFileSync(phoneticPath, 'utf8'));
    sortedPhoneticKeys = Object.keys(gujaratiPhonetic).sort((a, b) => b.length - a.length);
  }
} catch (e) {
  console.error('[TranslationEngine] Failed to load gujarati_phonetic.json:', e);
}

// Escapes special characters for RegExp
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Digraph mapping for consonants that are represented by two letters in English
const digraphMap: Record<string, string> = {
  'sh': 'શ',
  'ch': 'ચ',
  'kh': 'ખ',
  'gh': 'ઘ',
  'th': 'થ',
  'dh': 'ધ',
  'bh': 'ભ',
  'ph': 'ફ'
};

// Standalone consonant mappings when not part of standard syllables
const consonantMap: Record<string, string> = {
  'b': 'બ', 'c': 'ક', 'd': 'દ', 'f': 'ફ', 'g': 'ગ', 'h': 'હ', 'j': 'જ',
  'k': 'ક', 'l': 'લ', 'm': 'મ', 'n': 'ન', 'p': 'પ', 'r': 'ર', 's': 'સ',
  't': 'ત', 'v': 'વ', 'w': 'વ', 'x': 'ક્ષ', 'y': 'ય', 'z': 'ઝ'
};

/**
 * Phonetically transliterates a single English word to Gujarati using barakhadi rules.
 */
export function transliterateWord(word: string): string {
  let cleanWord = word.toLowerCase().trim();
  if (!cleanWord) return '';

  // Rewrite trailing 'a' (preceded by a consonant) to 'aa' to preserve the long 'a' (kana) sound in names/surnames
  if (cleanWord.endsWith('a') && !cleanWord.endsWith('aa') && cleanWord.length > 2) {
    const secondLast = cleanWord[cleanWord.length - 2];
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    if (!vowels.includes(secondLast)) {
      cleanWord = cleanWord + 'a'; // Make it end with 'aa'
    }
  }

  let result = '';
  let i = 0;
  while (i < cleanWord.length) {
    let matched = false;

    // 1. Try to match standard barakhadi syllables first (longest matching prefix)
    for (const key of sortedPhoneticKeys) {
      if (cleanWord.startsWith(key, i)) {
        result += gujaratiPhonetic[key];
        i += key.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // 2. Try to match English consonant digraphs (e.g. sh, ch, th)
    if (i + 1 < cleanWord.length) {
      const digraph = cleanWord.substring(i, i + 2);
      if (digraphMap[digraph]) {
        result += digraphMap[digraph];
        i += 2;
        matched = true;
        continue;
      }
    }

    // 3. Fallback to single consonant or vowel character
    const char = cleanWord[i];
    if (consonantMap[char]) {
      result += consonantMap[char];
    } else {
      // Skip unknown/vowels symbols that didn't match syllables
    }
    i++;
  }

  return result;
}

/**
 * Translates a complete English address or name using dictionary lookup and phonetic fallback.
 */
export function translateOrRepairAddress(englishText: string, rawLocalText: string): string {
  if (!englishText) return rawLocalText || '';

  // Step 1: Clean and standardize the English text
  let translatedText = englishText.trim();

  // Step 2: Match and replace multi-word phrases and single words from dictionary
  for (const key of sortedDictKeys) {
    const escaped = escapeRegExp(key);
    // Boundary safe pattern for English phrases
    const startBoundary = /^[a-zA-Z0-9]/.test(key) ? '\\b' : '';
    const endBoundary = /[a-zA-Z0-9]$/.test(key) ? '\\b' : '';
    const pattern = new RegExp(startBoundary + escaped + endBoundary, 'gi');

    translatedText = translatedText.replace(pattern, gujaratiDict[key]);
  }

  // Step 3: Align and transliterate/preserve unique names
  // Tokenize by word-boundaries to find remaining untranslated English words
  const tokens = translatedText.split(/([a-zA-Z]+)/);
  const processedTokens = tokens.map(token => {
    // If it's a completely alphabetical word (meaning it wasn't matched in dictionary)
    if (/^[a-zA-Z]+$/.test(token)) {
      return transliterateWord(token);
    }
    return token;
  });

  return processedTokens.join('');
}

/**
 * Detects if the extracted local language name and address contain errors or scanning corruptions.
 * Returns { needsRepair: boolean, reason: string | null }
 */
export function detectLocalTextErrors(
  fields: { nameEnglish: string; addressEnglish: string; localName: string; localAddress: string; },
  lang: string
): { needsRepair: boolean; reason: string | null } {
  const nameEng = (fields.nameEnglish || '').trim();
  const addrEng = (fields.addressEnglish || '').trim();
  const nameLoc = (fields.localName || '').trim();
  const addrLoc = (fields.localAddress || '').trim();
  const targetLang = (lang || '').toLowerCase();

  // 1. If local fields are completely empty, we MUST translate/generate them using AI
  if (nameEng && !nameLoc) {
    return { needsRepair: true, reason: 'Local name is missing/empty' };
  }
  if (addrEng && !addrLoc) {
    return { needsRepair: true, reason: 'Local address is missing/empty' };
  }

  // 2. OCR errors: check for mixed English characters in the local fields (e.g. "તલાટી Road")
  const englishCharRegex = /[a-zA-Z]/;
  if (englishCharRegex.test(nameLoc)) {
    return { needsRepair: true, reason: 'Local name contains English characters' };
  }
  if (englishCharRegex.test(addrLoc)) {
    return { needsRepair: true, reason: 'Local address contains English characters' };
  }

  // 3. Check for typical encoding corruption or OCR noise
  // - '\uFFFD' is the unicode replacement character (rendered as black diamond with question mark)
  // - mojibake indicators like Ã, Â, æ, œ, etc.
  // - stray mathematical or punctuation noise: #, $, %, ^, *, _, |, [, ], {, }, ~
  const corruptionRegex = /[\uFFFDÃÂæœ\#\$\%\^\*\_\|\{\}\[\]\~]/;
  if (corruptionRegex.test(nameLoc)) {
    return { needsRepair: true, reason: 'Local name contains corruption or special noise characters' };
  }
  if (corruptionRegex.test(addrLoc)) {
    return { needsRepair: true, reason: 'Local address contains corruption or special noise characters' };
  }

  // 4. Consecutive question marks or weird double spaces
  if (nameLoc.includes('??') || nameLoc.includes('  ')) {
    return { needsRepair: true, reason: 'Local name contains invalid punctuation or layout spaces' };
  }
  if (addrLoc.includes('??') || addrLoc.includes('  ')) {
    return { needsRepair: true, reason: 'Local address contains invalid punctuation or layout spaces' };
  }

  // 5. Length discrepancy: if English name is long, but local name is too short (OCR cut off)
  if (nameEng.length > 10 && nameLoc.length < 4) {
    return { needsRepair: true, reason: 'Local name length is suspiciously short compared to English' };
  }
  if (addrEng.length > 30 && addrLoc.length < 10) {
    return { needsRepair: true, reason: 'Local address length is suspiciously short compared to English' };
  }

  // 6. Word count mismatch for names: if English has multiple words (e.g., First Middle Last),
  // but local name has only 1 word or is mismatched.
  const engNameWords = nameEng.split(/\s+/).filter(w => w.length > 1);
  const locNameWords = nameLoc.split(/\s+/).filter(w => w.length > 1);
  if (engNameWords.length >= 3 && locNameWords.length <= 1) {
    return { needsRepair: true, reason: 'Local name has fewer words than English name' };
  }

  // 7. Check for typical malformed regional text sequences or patterns that show broken font rendering.
  // E.g. isolated vowel signs/matras at the start of a word.
  const startingMatraRegex = /^\s*[\u0901-\u0903\u093E-\u094F\u0951-\u0957\u0962-\u0963\u0A81-\u0A83\u0ABE-\u0ACF\u0AD0\u0AE2-\u0AE3\u0B3E-\u0B4F\u0B56\u0B57\u0BBE-\u0BC8\u0BD7\u0C3E-\u0C56\u0CBE-\u0CD6\u0D3E-\u0D57]/;
  
  const locNameWordsRaw = nameLoc.split(/\s+/);
  const locAddrWordsRaw = addrLoc.split(/\s+/);
  
  for (const word of locNameWordsRaw) {
    if (startingMatraRegex.test(word)) {
      return { needsRepair: true, reason: 'Local name word starts with an invalid isolated vowel sign/matra' };
    }
  }
  for (const word of locAddrWordsRaw) {
    if (startingMatraRegex.test(word)) {
      return { needsRepair: true, reason: 'Local address word starts with an invalid isolated vowel sign/matra' };
    }
  }

  // 8. Script validation: Check if local text contains characters from a different language's script
  if (targetLang === 'gujarati') {
    const devanagariRegex = /[\u0900-\u097F]/;
    if (devanagariRegex.test(nameLoc)) {
      return { needsRepair: true, reason: 'Local name contains Devanagari script but target is Gujarati' };
    }
    if (devanagariRegex.test(addrLoc)) {
      return { needsRepair: true, reason: 'Local address contains Devanagari script but target is Gujarati' };
    }
  } else if (targetLang === 'hindi' || targetLang === 'marathi') {
    const gujaratiRegex = /[\u0A80-\u0AFF]/;
    if (gujaratiRegex.test(nameLoc)) {
      return { needsRepair: true, reason: 'Local name contains Gujarati script but target is Devanagari (Hindi/Marathi)' };
    }
    if (gujaratiRegex.test(addrLoc)) {
      return { needsRepair: true, reason: 'Local address contains Gujarati script but target is Devanagari (Hindi/Marathi)' };
    }
  }

  return { needsRepair: false, reason: null };
}

/**
 * High-accuracy translation and repair engine using Gemini 2.5 Flash as a fallback/primary translator.
 * Maps English fields to clean local script, using raw local text as spelling hints.
 */
export async function translateOrRepairWithAI(
  fields: { nameEnglish: string; addressEnglish: string; localName: string; localAddress: string; },
  lang: string,
  geminiApiKey: string | null
): Promise<{ localName: string; localAddress: string; tokensUsed?: { input: number; output: number; total: number; } }> {
  const targetLang = (lang || 'gujarati').toLowerCase();

  if (!geminiApiKey) {
    if (targetLang === 'gujarati') {
      const { repairGujaratiText } = require('./gujaratiRepair');
      return {
        localName: repairGujaratiText(fields.localName || transliterateWord(fields.nameEnglish)),
        localAddress: repairGujaratiText(fields.localAddress || translateOrRepairAddress(fields.addressEnglish, fields.localAddress))
      };
    }
    return {
      localName: fields.localName,
      localAddress: fields.localAddress
    };
  }

  console.log(`[TranslationEngine] Executing Precision Indic Text Repair for ${targetLang}`);

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        topP: 1,
        topK: 1
      }
    });

    const langDisplayNames: Record<string, string> = {
      'gujarati': 'Gujarati (ગુજરાતી)',
      'hindi': 'Hindi (हिंदी)',
      'marathi': 'Marathi (मराठी)',
      'tamil': 'Tamil (தமிழ்)',
      'telugu': 'Telugu (తెలుగు)',
      'kannada': 'Kannada (ಕನ್ನಡ)',
      'malayalam': 'Malayalam (മലയാളം)',
      'bengali': 'Bengali (বাংলা)',
      'punjabi': 'Punjabi (ਪੰਜਾਬੀ)',
      'odia': 'Odia (ଓડ଼ିଆ)',
      'assamese': 'Assamese (অસમીયા)',
      'urdu': 'Urdu (اردو)'
    };
    const langName = langDisplayNames[targetLang] || targetLang;

    const aiPrompt = `You are an expert Indic text repair & transliteration engine for ${langName} script.
Your job is to produce 100% accurate, properly-spaced, correctly-spelled local language text.

INPUT DATA:
- Name (EN): "${fields.nameEnglish}"
- Address (EN): "${fields.addressEnglish}"
- Raw Local Name (extracted from document): "${fields.localName}"
- Raw Local Address (extracted from document): "${fields.localAddress}"

STRICT RULES:
1. WORD SPACING (CRITICAL): PDF text extraction often merges adjacent words together without spaces. You MUST insert proper spaces between words in Raw Local Name and Raw Local Address based on English word boundaries.
   Examples:
   - "અવિનાશનવલ પાટીલ" -> "અવિનાશ નવલ પાટીલ" (insert space between Avinash and Naval)
   - "રામીપાકપાસે" -> "રામી પાર્ક પાસે" (insert spaces between Rami, Park, and Pasa)
   - "સુરતસીટી" -> "સુરત સિટી" (insert space between Surat and City)

2. SPELLING & MATRA CORRECTION (CRITICAL): Document text extraction frequently corrupts Indic spelling, drops matras (short-i િ vs long-i ી, anusvara ં), or breaks conjunct consonants. Cross-reference Name (EN) and Address (EN) with the Raw Local fields to repair dropped matras while ALWAYS PRESERVING the exact authentic spelling from the original PDF.
   Examples:
   - English Name: "Ninave Bhagawati Chandrashekhar" + PDF Local (missing matra): "નનાવે ભગવતી ચંદ્રશેખર" -> Corrected: "નિનાવે ભગવતી ચંદ્રશેખર"
   - English Address: "Dindoli" + PDF Local (missing matra & anusvara): "ડડોલી" -> Corrected: "ડીંડોલી"
   - English Name: "Siddhi Ravsaheb Patil" + PDF Local: "સિધ્ધી રાવસાહેબ પાટીલ" -> Preserve exact PDF spelling: "સિધ્ધી રાવસાહેબ પાટીલ" (DO NOT change "સિધ્ધી" to "સિદ્ધિ")
   - English Name: "Laxmiben" + Corrupted Local: "લમીબેન" -> Corrected: "લક્ષ્મીબેન"
   - "ગોવધનનગર" -> "ગોવર્ધન નગર"
   - "શીવાલક્સક્વેર" -> "શિવાલિક સ્ક્વેર"

3. WORD FIDELITY & LOANWORDS:
   - PRESERVE the exact authentic local words, place names, and character choices from the original PDF document. DO NOT alter valid original spellings (e.g. keep "સિધ્ધી", do not change to "સિદ્ધિ"; keep "સ્ક્વેર", DO NOT change to "ચોક"; keep "રોડ", DO NOT change to "માર્ગ").
   - Fix missing matras and dropped conjuncts so the local text phonetically and visually matches the original PDF name/address.
   - Keep relationship markers like "S/O", "W/O", "D/O", "C/O" or local prefixes ("આત્મજ:", "પત્ની:", "પુત્રી:", "કેર ઓફ:", "द्वारा:") consistent.

4. IF MISSING:
   - If Raw Local Name is completely empty, transliterate Name (EN) phonetically to ${langName}.
   - If Raw Local Address is completely empty, translate Address (EN) to ${langName}.

Return ONLY valid JSON: {"localName": "...", "localAddress": "..."}`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout after 15000ms')), 15000)
    );

    const response = await Promise.race([
      model.generateContent([aiPrompt]),
      timeoutPromise
    ]) as any;

    const text = response.response.text();
    const parsed = JSON.parse(text.trim());
    
    const finalLocalName = parsed.localName || fields.localName;
    const finalLocalAddress = parsed.localAddress || fields.localAddress;

    // Learn offline from this correction
    try {
      learnFromTranslation(targetLang, {
        nameEnglish: fields.nameEnglish,
        addressEnglish: fields.addressEnglish,
        localName: finalLocalName,
        localAddress: finalLocalAddress
      });
    } catch (e) {
      console.error('[TranslationEngine] Failed to learn from Gemini output:', e);
    }

    // Save to shared database cache
    try {
      const supabase = await createClient();
      const insertData = [
        {
          english_text: fields.nameEnglish.trim().toLowerCase(),
          local_text: finalLocalName,
          language: targetLang
        },
        {
          english_text: fields.addressEnglish.trim().toLowerCase(),
          local_text: finalLocalAddress,
          language: targetLang
        }
      ];
      await supabase.from('translation_cache').upsert(insertData, { onConflict: 'english_text,language' });
    } catch (saveCacheErr: any) {
      console.warn('[TranslationEngine] Failed to save translations to shared cache:', saveCacheErr.message);
    }

    // Get token usage metadata from response
    let tokensUsed = undefined;
    if (response.response.usageMetadata) {
      tokensUsed = {
        input: response.response.usageMetadata.promptTokenCount || 0,
        output: response.response.usageMetadata.candidatesTokenCount || 0,
        total: response.response.usageMetadata.totalTokenCount || 0
      };
    }

    return {
      localName: finalLocalName,
      localAddress: finalLocalAddress,
      tokensUsed
    };
  } catch (err: any) {
    console.error(`[TranslationEngine] Gemini translation failed for ${lang}:`, err.message);
    // Fall back to offline dictionary for Gujarati
    if (targetLang === 'gujarati') {
      return {
        localName: translateOrRepairAddress(fields.nameEnglish, fields.localName),
        localAddress: translateOrRepairAddress(fields.addressEnglish, fields.localAddress)
      };
    }
    return {
      localName: fields.localName,
      localAddress: fields.localAddress
    };
  }
}

// Force reload: 2026-07-17
