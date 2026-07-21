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

  // If no key is provided, try offline dictionary fallback for Gujarati, else return raw fields
  if (!geminiApiKey) {
    if (targetLang === 'gujarati') {
      return {
        localName: translateOrRepairAddress(fields.nameEnglish, fields.localName),
        localAddress: translateOrRepairAddress(fields.addressEnglish, fields.localAddress)
      };
    }
    // Return raw fields so route.ts can run other local engines
    return {
      localName: fields.localName,
      localAddress: fields.localAddress
    };
  }

  // 1. Try to translate/repair offline using our Self-Learning database first
  try {
    const offlineResult = translateOfflineWithLearning(targetLang, fields.nameEnglish, fields.addressEnglish);
    if (offlineResult.localName && offlineResult.localAddress) {
      console.log(`[TranslationEngine] Bypass AI: Successfully resolved name and address offline using learned mappings. Cost: ₹0.`);
      return {
        localName: offlineResult.localName,
        localAddress: offlineResult.localAddress
      };
    }
  } catch (e) {
    console.error('[TranslationEngine] Self-Learning Engine offline translation failed:', e);
  }

  // 1.5 Try to translate/repair using the shared translation_cache database table
  let cachedName: string | null = null;
  let cachedAddress: string | null = null;
  try {
    const supabase = await createClient();
    const cleanNameKey = fields.nameEnglish.trim().toLowerCase();
    const cleanAddrKey = fields.addressEnglish.trim().toLowerCase();

    // ─── Self-Healing: Purge contaminated cache entries if queried ───
    const contaminatedKeys = ['sonar bhikha raghunath', 'laxmiben', 'avinash naval patil', 'shahin parvin sayyad vasim ali'];
    if (contaminatedKeys.includes(cleanNameKey)) {
      console.log(`[TranslationEngine] Self-Healing: Purging contaminated key "${cleanNameKey}" from Supabase...`);
      await supabase.from('translation_cache').delete().eq('english_text', cleanNameKey);
    }
    if (contaminatedKeys.includes(cleanAddrKey)) {
      console.log(`[TranslationEngine] Self-Healing: Purging contaminated key "${cleanAddrKey}" from Supabase...`);
      await supabase.from('translation_cache').delete().eq('english_text', cleanAddrKey);
    }

    const { data: cacheData, error: cacheErr } = await supabase
      .from('translation_cache')
      .select('english_text, local_text')
      .in('english_text', [cleanNameKey, cleanAddrKey])
      .eq('language', targetLang);

    if (!cacheErr && cacheData) {
      cachedName = cacheData.find(d => d.english_text === cleanNameKey)?.local_text || null;
      cachedAddress = cacheData.find(d => d.english_text === cleanAddrKey)?.local_text || null;

      // ─── Self-Healing: Purge contaminated cache entries if they have word count mismatch or address subset match ───
      if (cachedName) {
        const engWords = cleanNameKey.split(/\s+/).filter(w => w.length > 0);
        const locWords = cachedName.split(/\s+/).filter(w => w.length > 0);
        const cleanLocAddr = (fields.localAddress || '').toLowerCase();
        const cleanEngAddr = (fields.addressEnglish || '').toLowerCase();
        const isWordInAddress = cleanLocAddr.includes(cachedName.toLowerCase()) || cleanEngAddr.includes(cleanNameKey);
        
        if (locWords.length < engWords.length && (isWordInAddress || engWords.length >= 3)) {
          console.log(`[TranslationEngine] Self-Healing: Detected suspicious cached name "${cachedName}" for English "${cleanNameKey}" (possible mix-up with address name). Purging from cache.`);
          await supabase.from('translation_cache').delete().eq('english_text', cleanNameKey);
          cachedName = null;
        }
      }

      if (cachedName && cachedAddress) {
        console.log(`[TranslationEngine] Bypass AI: Found exact translation matches in shared Supabase cache. Cost: ₹0.`);
        return {
          localName: cachedName,
          localAddress: cachedAddress
        };
      }
    }
  } catch (dbCacheErr: any) {
    console.warn('[TranslationEngine] Supabase cache lookup failed (table may not be created yet):', dbCacheErr.message);
  }

  // 2. If not fully resolved, call Gemini AI with compressed prompt
  const errorCheck = detectLocalTextErrors(fields, targetLang);

  // We are removing the aggressive bypass because PDF extraction frequently drops vowel signs (matras, short-i, repha),
  // which regex heuristics cannot easily detect. Since the token cost is now very low (~300 tokens), 
  // we can safely rely on Gemini to perfectly restore the text every time if it's not cached.
  /*
  if (!errorCheck.needsRepair && fields.localName && fields.localAddress) {
    console.log(`[TranslationEngine] Bypass AI: Local text is clean and needs no repair for ${targetLang}. Cost: ₹0.`);
    return {
      localName: fields.localName,
      localAddress: fields.localAddress
    };
  }
  */

  console.log(`[TranslationEngine] Triggering Gemini AI Repair for ${targetLang}. Status check: ${errorCheck.reason || 'Aggressive bypass removed'}`);

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // Resolve target language display name
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
      'odia': 'Odia (ଓଡ଼િଆ)',
      'assamese': 'Assamese (অસમીયા)',
      'urdu': 'Urdu (اردو)'
    };
    const langName = langDisplayNames[targetLang] || targetLang;

    // Optimized compressed prompt saves ~250 input tokens per call
    const aiPrompt = `Translate to ${langName} script. Return ONLY JSON: {"localName": "...", "localAddress": "..."}
Name (EN): "${fields.nameEnglish}"
Address (EN): "${fields.addressEnglish}"
Hint Name: "${fields.localName}"
Hint Address: "${fields.localAddress}"
Rules:
1. Translate address terms (Road/Near/Opp).
2. Transliterate unique names phonetically.
3. Fix matras/spacing in hints. Keep numbers/pin codes.
4. CRITICAL: The "localName" MUST be the translation of "Name (EN)" ONLY. Do NOT substitute it or mix it with any names mentioned in "Address (EN)" or "Hint Address" (such as Care of / S/O / W/O / D/O parent or spouse names).
5. Vowel Sign (Matra, Ukar, Vilanti) Restoration: Original PDF text extraction often drops vowel signs (short-i, e-matras, ukar, vilanti). You MUST cross-reference the English phonetics of "Name (EN)" and "Address (EN)" to detect and restore these missing vowel signs in your final JSON output (e.g. Avinash -> "અવિનાશ" / "अविनाश", Ketan -> "કેતન" / "केतन", Nilesh -> "નિલેશ" / "निलेश").`;

    const response = await model.generateContent([aiPrompt]);
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
      const insertData = [];
      if (!cachedName) {
        insertData.push({
          english_text: fields.nameEnglish.trim().toLowerCase(),
          local_text: finalLocalName,
          language: targetLang
        });
      }
      if (!cachedAddress) {
        insertData.push({
          english_text: fields.addressEnglish.trim().toLowerCase(),
          local_text: finalLocalAddress,
          language: targetLang
        });
      }
      if (insertData.length > 0) {
        await supabase.from('translation_cache').upsert(insertData, { onConflict: 'english_text,language' });
      }
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
