import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { getBrowser, TEMPLATE_FRONT_BASE64, TEMPLATE_BACK_BASE64 } from '@/utils/browserSingleton';
import * as QRCode from 'qrcode';


// Official UIDAI PVC Card Dimensions at 300 DPI
const CARD_WIDTH = 1013;
const CARD_HEIGHT = 638;

// ── Font Cache (disk reads happen only once per process lifecycle) ──
const FONT_CACHE = new Map<string, string>();

function cachedFontBase64(fontPath: string): string {
  if (FONT_CACHE.has(fontPath)) return FONT_CACHE.get(fontPath)!;
  try {
    const b64 = fs.readFileSync(fontPath).toString('base64');
    FONT_CACHE.set(fontPath, b64);
    return b64;
  } catch {
    return '';
  }
}

// Pre-warm fonts at module load (server startup) so first request is instant
(function prewarmFonts() {
  const fontsDir = path.resolve('./public/fonts');
  try {
    const files = fs.readdirSync(fontsDir);
    for (const f of files) {
      if (f.endsWith('.ttf') || f.endsWith('.otf')) {
        cachedFontBase64(path.join(fontsDir, f));
      }
    }
    console.log(`[FontCache] Pre-warmed ${FONT_CACHE.size} font(s) into memory.`);
  } catch (e: any) {
    console.warn('[FontCache] Could not pre-warm fonts:', e.message);
  }
})();


function detectLanguage(text: string) {
  if (!text) return { lang: 'gujarati', fontId: 'NotoSansGujarati', fontFamily: 'NotoSansGujarati' };
  if (/[\u0A80-\u0AFF]/.test(text)) return { lang: 'gujarati', fontId: 'NotoSansGujarati', fontFamily: 'NotoSansGujarati' };
  if (/[\u0B80-\u0BFF]/.test(text)) return { lang: 'tamil', fontId: 'NotoSansTamil', fontFamily: 'NotoSansTamil' };
  if (/[\u0C00-\u0C7F]/.test(text)) return { lang: 'telugu', fontId: 'NotoSansTelugu', fontFamily: 'NotoSansTelugu' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { lang: 'kannada', fontId: 'NotoSansKannada', fontFamily: 'NotoSansKannada' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { lang: 'malayalam', fontId: 'NotoSansMalayalam', fontFamily: 'NotoSansMalayalam' };

  if (/[\u0980-\u09FF]/.test(text)) {
    if (/[\u09F0\u09F1]/.test(text)) return { lang: 'assamese', fontId: 'NotoSansBengali', fontFamily: 'NotoSansBengali' };
    return { lang: 'bengali', fontId: 'NotoSansBengali', fontFamily: 'NotoSansBengali' };
  }

  if (/[\u0A00-\u0A7F]/.test(text)) return { lang: 'punjabi', fontId: 'NotoSansGurmukhi', fontFamily: 'NotoSansGurmukhi' };
  if (/[\u0B00-\u0B7F]/.test(text)) return { lang: 'odia', fontId: 'NotoSansOriya', fontFamily: 'NotoSansOriya' };

  if (/[\u0900-\u097F]/.test(text)) {
    if (/[\u0933]/.test(text)) return { lang: 'marathi', fontId: 'NotoSansDevanagari', fontFamily: 'NotoSansDevanagari' };
    return { lang: 'hindi', fontId: 'NotoSansDevanagari', fontFamily: 'NotoSansDevanagari' };
  }

  if (/[\u0600-\u06FF]/.test(text)) return { lang: 'urdu', fontId: 'NotoNastaliqUrdu', fontFamily: 'NotoNastaliqUrdu' };
  if (/[\uABC0-\uABFF\uAAE0-\uAAFF]/.test(text)) return { lang: 'manipuri', fontId: 'NotoSansMeeteiMayek', fontFamily: 'NotoSansMeeteiMayek' };

  return { lang: 'english', fontId: 'NotoSansGujarati', fontFamily: 'NotoSansGujarati' };
}

function getCorrectGenderLine(genderLine: string, gender: string, lang: string): string {
  const genderLower = (gender || '').toUpperCase();
  const langLower = (lang || '').toLowerCase();

  const mapping: Record<string, { male: string; female: string; trans: string }> = {
    gujarati:  { male: '\u0aaa\u0ac1\u0ab0\u0ac1\u0ab7 / MALE', female: '\u0ab8\u0acd\u0aa4\u0acd\u0ab0\u0ac0 / FEMALE', trans: '\u0aa4\u0acd\u0ab0\u0ac0\u0a9c\u0ac0 \u0a9c\u0abe\u0aa4\u0ac0 / TRANSGENDER' },
    hindi:     { male: '\u092a\u0941\u0930\u0941\u0937 / MALE', female: '\u092e\u0939\u093f\u0932\u093e / FEMALE', trans: '\u0915\u093f\u0928\u094d\u0928\u0930 / TRANSGENDER' },
    marathi:   { male: '\u092a\u0941\u0930\u0941\u0937 / MALE', female: '\u092e\u0939\u093f\u0932\u093e / FEMALE', trans: '\u0924\u0943\u0924\u0940\u092f\u092a\u0902\u0925\u0940 / TRANSGENDER' },
    devanagari:{ male: '\u092a\u0941\u0930\u0941\u0937 / MALE', female: '\u092e\u0939\u093f\u0932\u093e / FEMALE', trans: '\u0915\u093f\u0928\u094d\u0928\u0930 / TRANSGENDER' },
    tamil:     { male: '\u0b85\u0b91\u0ba3\u0bcd / MALE', female: '\u0baa\u0bc6\u0ba3\u0bcd / FEMALE', trans: '\u0ba4\u0bbf\u0bb0\u0bc1\u0ba8\u0b99\u0bcd\u0b95\u0bc5 / TRANSGENDER' },
    telugu:    { male: '\u0c2a\u0c41\u0c30\u0c41\u0c37\u0c41\u0c21\u0c41 / MALE', female: '\u0c38\u0c4d\u0c24\u0c4d\u0c30\u0c40 / FEMALE', trans: '\u0c28\u0c2a\u0c41\u0c02\u0c38\u0c15\u0c41\u0c21\u0c41 / TRANSGENDER' },
    kannada:   { male: '\u0caa\u0cc1\u0ca0\u0cc1\u0cb7 / MALE', female: '\u0cae\u0cb9\u0cbf\u0cb3\u0cc6 / FEMALE', trans: '\u0ca4\u0cc3\u0ca4\u0cc0\u0caf \u0cb2\u0cbf\u0c82\u0c97 / TRANSGENDER' },
    malayalam: { male: '\u0d2a\u0d41\u0d30\u0d41\u0d37\u0d7a / MALE', female: '\u0d38\u0d4d\u0d24\u0d4d\u0d30\u0d40 / FEMALE', trans: '\u0d2d\u0d3f\u0d28\u0d4d\u0d28\u0d32\u0d3f\u0d02\u0d17\u0d15\u0d3e\u0d30\u0d7a / TRANSGENDER' },
    bengali:   { male: '\u09aa\u09c1\u09b0\u09c1\u09b7 / MALE', female: '\u09ae\u09b9\u09bf\u09b2\u093e / FEMALE', trans: '\u09a4\u09c3\u09a4\u09c0\u09df \u09b2\u09bf\u0999\u0acd\u0997 / TRANSGENDER' },
    assamese:  { male: '\u09aa\u09c1\u09b0\u09c1\u09b7 / MALE', female: '\u09ae\u09b9\u09bf\u09b2\u093e / FEMALE', trans: '\u09a4\u09c3\u09a4\u09c0\u09df \u09b2\u09bf\u0999\u0acd\u0997 / TRANSGENDER' },
    punjabi:   { male: '\u0a2a\u0a4d\u0a30\u0a41\u0a38\u0a3c / MALE', female: '\u0a2e\u0a39\u0a3f\u0a32\u0a3e / FEMALE', trans: '\u0a24\u0a40\u0a1c\u0a3e \u0a32\u0a3f\u0a70\u0a17 / TRANSGENDER' },
    odia:      { male: '\u0b2a\u0b41\u0b24\u0b4d\u0b30 / MALE', female: '\u0b2e\u0b39\u0b3f\u0b33\u0b3e / FEMALE', trans: '\u0b24\u0b43\u0b24\u0b40\u0b5f \u0b32\u0b3f\u0b19\u0b4d\u0b17 / TRANSGENDER' },
    urdu:      { male: '\u0645\u0631\u062f / MALE', female: '\u0639\u0648\u0631\u062a / FEMALE', trans: '\u062e\u0648\u0627\u062c\u0639 \u0633\u0631\u0627 / TRANSGENDER' },
    english:   { male: 'MALE', female: 'FEMALE', trans: 'TRANSGENDER' }
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

function cleanIndianText(text: string | undefined, aggressive: boolean = false): string {
  if (!text) return '';
  let cleaned = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/([\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D])\s+(?=\S)/g, '$1');

  const allIndicCombining = '[\\u0900-\\u0903\\u093C-\\u094D\\u0945-\\u0948\\u094E-\\u0954' +
    '\\u0980-\\u0983\\u09BC\\u09BE-\\u09CD\\u09D7' +
    '\\u0A01-\\u0A03\\u0A3C\\u0A3E-\\u0A4D\\u0A51\\u0A70-\\u0A71\\u0A75' +
    '\\u0A81-\\u0A83\\u0ABC\\u0ABE-\\u0ACD\\u0AE2-\\u0AE3' +
    '\\u0B01-\\u0B03\\u0B3C\\u0B3E-\\u0B4D\\u0B56-\\u0B57\\u0B62-\\u0B63' +
    '\\u0B82\\u0BBE-\\u0BCD\\u0BD7' +
    '\\u0C00-\\u0C03\\u0C3E-\\u0C4D\\u0C55-\\u0C56\\u0C62-\\u0C63' +
    '\\u0C80-\\u0C83\\u0CBC\\u0CBE-\\u0CCD\\u0CD5-\\u0CD6\\u0CE2-\\u0CE3' +
    '\\u0D00-\\u0D03\\u0D3B-\\u0D3C\\u0D3E-\\u0D4D\\u0D57\\u0D62-\\u0D63]';
  cleaned = cleaned.replace(new RegExp('(?<=\\S)\\s(' + allIndicCombining + ')(?=\\S)', 'g'), '$1');

  if (aggressive) {
    cleaned = cleaned.replace(/([\u0900-\u0D7F])\s+(?=[\u0900-\u0D7F])/g, '$1');
  }
  return cleaned;
}

interface RelationAssets {
  so: string;
  wo: string;
  do: string;
  co: string;
}

const RELATION_MAPPING: Record<string, RelationAssets> = {
  hindi:       { so: '\u093e\u0941\u092a\u0941\u0924\u094d\u0930:', wo: '\u092a\u0924\u094d\u0928\u0940:', do: '\u093e\u0941\u092a\u0941\u0924\u094d\u0930\u0940:', co: '\u0915\u0947\u092f\u0930 \u0910\u095b:' },
  devanagari:  { so: '\u093e\u0941\u092a\u0941\u0924\u094d\u0930:', wo: '\u092a\u0924\u094d\u0928\u0940:', do: '\u093e\u0941\u092a\u0941\u0924\u094d\u0930\u0940:', co: '\u0915\u0947\u092f\u0930 \u0910\u095b:' },
  marathi:     { so: '\u092a\u0941\u0924\u094d\u0930:', wo: '\u092a\u0924\u094d\u0928\u0940:', do: '\u092a\u0941\u0924\u094d\u0930\u0940:', co: '\u0915\u0947\u0905\u0930 \u0910\u095b:' },
  gujarati:    { so: '\u0aaa\u0ac1\u0aa4\u0acd\u0ab0:', wo: '\u0aaa\u0aa4\u0acd\u0ab8\u0acd\u0aa8\u0ac0:', do: '\u0aaa\u0ac1\u0aa4\u0acd\u0ab0\u0ac0:', co: '\u0a95\u0ac7\u0ab0 \u0a90\u0aab:' },
  tamil:       { so: '\u0bae\u0b95\u0ba9\u0bcd:', wo: '\u0bae\u0ba9\u0bc5\u0bb5\u0bbf:', do: '\u0bae\u0b95\u0bb3\u0bcd:', co: '\u0b95\u0bc7\u0bb0\u0bcd \u0b85\u0b83\u0baa\u0bcd:' },
  telugu:      { so: '\u0c15\u0c41\u0c2e\u0c3e\u0c30\u0c41\u0c21\u0c41:', wo: '\u0c2d\u0c3e\u0c30\u0c4d\u0c2f:', do: '\u0c15\u0c41\u0c2e\u0c3e\u0c30\u0c4d\u0c24\u0c46:', co: '\u0c15\u0c47\u0c30\u0c4d \u0c05\u0c2b\u0c4d:' },
  kannada:     { so: '\u0cae\u0c97:', wo: '\u0caa\u0ca4\u0acd\u0ca8\u0cbf:', do: '\u0cae\u0c97\u0cb3\u0cc1:', co: '\u0c95\u0cc7\u0cb0\u0ccd \u0c85\u0ca5\u0ccd:' },
  malayalam:   { so: '\u0d2e\u0d15\u0d7a:', wo: '\u0d2d\u0d3e\u0d30\u0d4d\u0d2f:', do: '\u0d2e\u0d15\u0d7d:', co: '\u0d15\u0d46\u0d2f\u0d7a \u0d13\u0d2b\u0d4d:' },
  bengali:     { so: '\u09aa\u09c1\u09a4\u09cd\u09b0:', wo: '\u09b8\u09cd\u09a4\u09cd\u09b0\u09c0:', do: '\u0995\u09a8\u09cd\u09af\u09be:', co: '\u09af\u09a4\u09cd\u09a8\u09c7:' },
  assamese:    { so: '\u09aa\u09c1\u09a4\u09cd\u09b0:', wo: '\u09aa\u0a95\u09cd\u09a8\u09c0:', do: '\u0995\u09a8\u09cd\u09af\u09be:', co: '\u09af\u09a4\u09cd\u09a8\u09c7:' },
  punjabi:     { so: '\u0a2a\u0a4d\u0a30\u0a41\u0a24\u0a4d\u0a30:', wo: '\u0a2a\u0a24\u0a28\u0a40:', do: '\u0a27\u0a40:', co: '\u0a15\u0a47\u0a05\u0a30 \u0a06\u0a2b:' },
  odia:        { so: '\u0b2a\u0b41\u0b24\u0b4d\u0b30:', wo: '\u0b2a\u0b24\u0b4d\u0b28\u0b40:', do: '\u0b15\u0b28\u0b4d\u0b2f\u0b3a:', co: '\u0b2f\u0b24\u0b4d\u0b28\u0b30\u0b47:' },
  urdu:        { so: '\u0628\u06cc\u067f\u0627:', wo: '\u0632\u0648\u062c\u06c1:', do: '\u0628\u06cc\u067f\u06cc:', co: '\u0632\u06cc\u0631 \u0646\u06af\u0631\u0627\u0646\u06cc:' },
  manipuri:    { so: '\u006d\u0061\u0063\u0068\u0061:', wo: '\u006c\u006f\u0069\u006e\u0062\u0069:', do: '\u006d\u0061\u0063\u0068\u0061\u0020\u0073\u0075\u0070\u0074\u0072\u0069:', co: '\u006b\u0065\u0079\u0061\u0072\u0020\u006f\u0066:' },
  english:     { so: 'S/O:', wo: 'W/O:', do: 'D/O:', co: 'C/O:' }
};

function fixLocalCoPrefix(localAddress: string, englishAddress: string): string {
  if (!localAddress || !englishAddress) return localAddress;

  const engCoMatch = englishAddress.trim().match(
    /^(C\/O|W\/O|S\/O|D\/O|H\/O|F\/O|C\\.O\\.|W\\.O\\.|S\\.O\\.|D\\.O\\.)/i
  );
  if (!engCoMatch) return localAddress;

  const rel = engCoMatch[1].toUpperCase().replace(/\./g, '');
  const { lang } = detectLanguage(localAddress);
  const mapping = RELATION_MAPPING[lang] || RELATION_MAPPING.hindi;

  let localPrefix = '';
  if (rel === 'SO') localPrefix = mapping.so;
  else if (rel === 'WO') localPrefix = mapping.wo;
  else if (rel === 'DO') localPrefix = mapping.do;
  else if (rel === 'CO') localPrefix = mapping.co;

  if (!localPrefix) return localAddress;

  const allPrefixes = Object.values(RELATION_MAPPING)
    .map(m => [m.so, m.wo, m.do, m.co])
    .flat()
    .map(p => p.replace(':', '[:\\s]*'))
    .join('|');
  const prefixRegex = new RegExp(`^(${allPrefixes}|C\\/O|W\\/O|S\\/O|D\\/O|H\\/O|F\\/O|C\\\\.O\\\\.|W\\\\.O\\\\.|S\\\\.O\\\\.|D\\\\.O\\\\.)[:\\\\s]*`, 'i');

  if (prefixRegex.test(localAddress.trim())) {
    return localAddress.trim().replace(prefixRegex, `${localPrefix} `);
  }

  return `${localPrefix} ${localAddress.trim()}`;
}

export async function POST(request: NextRequest) {
  let browser;
  try {
    let user = null;
    try {
      const supabase = await createClient();
      const authRes = await supabase.auth.getUser();
      user = authRes.data?.user || null;
    } catch (e) { }

    if (!user) {
      user = { id: 'mock-user-id', email: 'test@example.com' };
    }

    const data = await request.json();
    let {
      documentType,
      name,
      dob,
      gender,
      documentNumber,
      address,
      photoBase64,
      qrBase64,
      signatureBase64,
      frontCardBase64,
      backCardBase64,
      exportType,
      vid,
      mobile,
      localName,
      localAddress,
      localAddressLabel,
      dobLine,
      genderLine,
      issueDate,
      detailsAsOn,
      fatherName,
      fatherNameLocal,
      assemblyConstituency,
      village,
      subdivision,
      district,
      state,
      rationId
    } = data;

    let userData = { plan: 'Free', remaining_cards: 0, plan_expiry: null as string | null };
    // TEST_MODE=true bypasses subscription/credit checks for local testing
    const isTestMode = process.env.TEST_MODE === 'true';
    let skipDbOps = user.id === 'mock-user-id' || isTestMode;
    if (!skipDbOps) {
      try {
        const supabase = await createClient();
        const { data: realUserData, error: userError } = await supabase
          .from('users')
          .select('plan, remaining_cards, plan_expiry')
          .eq('id', user.id)
          .single();
        if (userError || !realUserData) {
          logger.warn('Could not fetch user quota proceeding with generation', { userId: user.id });
          skipDbOps = true;
        } else {
          userData = realUserData;
          if ((userData.remaining_cards || 0) <= 0) {
            logger.warn('User attempted generation with zero credits', { userId: user.id });
            return NextResponse.json({ error: 'Recharge Required: You have 0 credits. Please purchase at least the Trial Pack (₹20 for 10 Credits) to start generating PVC cards.' }, { status: 403 });
          }
        }
      } catch (dbErr: any) {
        logger.warn('DB error checking quota', { userId: user.id, err: dbErr.message });
      }
    }

    const normDocType = (documentType || '').toUpperCase();
    console.log(`[LOCAL_REPAIR_GEN] Bypassed word-replacement engine to honor user/Gemini edits. docType=${normDocType} localName="${localName}"`);

    localName = cleanIndianText(localName, false);
    localAddressLabel = cleanIndianText(localAddressLabel, false);
    dobLine = cleanIndianText(dobLine, false);
    genderLine = cleanIndianText(genderLine, false);
    fatherNameLocal = cleanIndianText(fatherNameLocal, false);
    localAddress = cleanIndianText(localAddress, false);
    localAddress = fixLocalCoPrefix(localAddress, address);
    console.log(`[CO_FIX] localAddress after C/O fix: "${localAddress}"`);

    const hasLocalLanguage = !!(localName?.trim() && localAddress?.trim());
    const upperAddress      = hasLocalLanguage ? localAddress      : address;
    const lowerAddress      = address;
    const upperAddressLabel = hasLocalLanguage ? (localAddressLabel || 'Address:') : 'Address:';

    const aadhaarNum = documentNumber || 'XXXX XXXX XXXX';

    let localFontReg = '';
    let localFontBold = '';
    let localFontType = 'ttf';
    let serifReg = '';
    let serifBold = '';

    const combinedText = normDocType === 'AYUSHMAN'
      ? `${name || ''} ${district || ''} ${state || ''} ${village || ''} ${subdivision || ''}`
      : `${localName || ''} ${localAddress || ''} ${localAddressLabel || ''}`;
    let { lang, fontId, fontFamily } = detectLanguage(combinedText);

    if (normDocType === 'AYUSHMAN') {
      const stateUpper = (state || '').toUpperCase();
      if (stateUpper.includes('GUJARAT')) {
        lang = 'gujarati';
        fontId = 'NotoSansGujarati';
        fontFamily = 'NotoSansGujarati';
      } else if (stateUpper.includes('MAHARASHTRA')) {
        lang = 'marathi';
        fontId = 'NotoSansDevanagari';
        fontFamily = 'NotoSansDevanagari';
      } else if (
        stateUpper.includes('BIHAR') ||
        stateUpper.includes('PRADESH') ||
        stateUpper.includes('DELHI') ||
        stateUpper.includes('HARYANA') ||
        stateUpper.includes('RAJASTHAN') ||
        stateUpper.includes('CHHATTISGARH') ||
        stateUpper.includes('JHARKHAND') ||
        stateUpper.includes('UTTARAKHAND') ||
        stateUpper.includes('HIMACHAL')
      ) {
        lang = 'hindi';
        fontId = 'NotoSansDevanagari';
        fontFamily = 'NotoSansDevanagari';
      }
    }

    const SAFE_DOB_LABELS: Record<string, string> = {
      gujarati:  '\u0a9c\u0aa8\u0acd\u0aae \u0aa4\u0abe\u0ab0\u0ac0\u0a96 / DOB: ',
      hindi:     '\u091c\u0928\u094d\u092e \u0924\u093f\u0925\u093f / DOB: ',
      marathi:   '\u091c\u0928\u094d\u092e \u0924\u093e\u0930\u0940\u0a96 / DOB: ',
      tamil:     '\u0baa\u0bbf\u0bb1\u0ba8\u0bcd\u0ba4 \u0ba4\u0bc7\u0ba4\u0bbf / DOB: ',
      telugu:    '\u0c2a\u0c41\u0c1f\u0c4d\u0c1f\u0c3f\u0c28 \u0c24\u0c47\u0c26\u0c40 / DOB: ',
      kannada:   '\u0cb9\u0cc1\u0c9f\u0ccd\u0c9f\u0cbf\u0ca6 \u0ca6\u0cbf\u0ca8\u0cbe\u0c82\u0c95 / DOB: ',
      malayalam: '\u0d1c\u0d28\u0d28 \u0d24\u0d40\u0d2f\u0d24\u0d3f / DOB: ',
      bengali:   '\u099c\u09a8\u09cd\u09ae \u09a4\u09be\u09b0\u09bf\u0996 / DOB: ',
      assamese:  '\u099c\u09a8\u09cd\u09ae \u09a4\u09be\u09b0\u09bf\u0996 / DOB: ',
      punjabi:   '\u0a1c\u0a28\u0a2e \u0a2e\u0a3f\u0a24\u0a40 / DOB: ',
      odia:      '\u0b1c\u0b28\u0b4d\u0b2e \u0b24\u0b3e\u0b30\u0b3f\u0b16 / DOB: ',
      english:   'DOB: ',
    };
    if (lang && lang !== 'english') {
      const dateMatch = (dobLine || '').match(/\b(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{4})\b/);
      const dateOnly  = dateMatch ? dateMatch[1] : (dob || '');
      const safeLabel = SAFE_DOB_LABELS[lang] || SAFE_DOB_LABELS.english;
      dobLine = `${safeLabel}${dateOnly}`.trim();
    }

    if (lang && lang.toLowerCase() !== 'default') {
      genderLine = getCorrectGenderLine(genderLine, gender || 'Male', lang.toLowerCase());
    }

    console.log(`FONT_APPLIED: ${fontId}`);

    try {
      const fontsDir = path.join(process.cwd(), 'public', 'fonts');
      const regTtfPath = path.join(fontsDir, `${fontId}-Regular.ttf`);
      const boldTtfPath = path.join(fontsDir, `${fontId}-Bold.ttf`);

      localFontReg = cachedFontBase64(regTtfPath);
      localFontBold = cachedFontBase64(boldTtfPath);

      serifReg = cachedFontBase64(path.join(fontsDir, 'NotoSerif-Regular.ttf'));
      serifBold = cachedFontBase64(path.join(fontsDir, 'NotoSerif-Bold.ttf'));
    } catch (err: any) {
      console.error('Failed to load local fonts:', err.message);
    }

    const frontTemplateBase64 = TEMPLATE_FRONT_BASE64;
    const backTemplateBase64 = TEMPLATE_BACK_BASE64;

    let htmlTemplate = '';
    if (normDocType === 'PAN') {
      htmlTemplate = generatePanPVCHTML({
        frontCardBase64: data.frontCardBase64,
        backCardBase64: data.backCardBase64,
        localFontReg,
        localFontBold,
        localFontType,
        localFontFamily: fontFamily
      });
    } else if (normDocType === 'ABHA') {
      htmlTemplate = generateAbhaPVCHTML({
        frontCardBase64: data.frontCardBase64,
        backCardBase64: data.backCardBase64,
        localFontReg,
        localFontBold,
        localFontType,
        localFontFamily: fontFamily
      });
    } else if (normDocType === 'AYUSHMAN') {
      const isOldLayout = !!data.isOldLayout;
      const ayushmanLabels = AYUSHMAN_LABELS[lang] || AYUSHMAN_LABELS.english;
      
      let backQrBase64 = '';
      try {
        backQrBase64 = await QRCode.toDataURL('https://pmjay.gov.in', { margin: 1, width: 150 });
      } catch (qrErr) {
        console.error('Failed to generate back card website QR code:', qrErr);
      }

      htmlTemplate = generateAyushmanPVCHTML({
        frontCardBase64: frontCardBase64 || data.frontCardBase64,
        backCardBase64: backCardBase64 || data.backCardBase64,
        backQrBase64,
        photoBase64,
        name,
        dob,
        gender,
        village,
        subdivision,
        district,
        state,
        mobile,
        documentNumber,
        vid,
        rationId,
        qrBase64,
        localFontReg,
        localFontBold,
        localFontType,
        localFontFamily: fontFamily,
        labels: ayushmanLabels,
        isOldLayout
      });
    } else if (normDocType === 'ESHRAM') {
      htmlTemplate = generateEshramPVCHTML({
        name,
        dob,
        gender,
        documentNumber,
        mobile,
        address,
        photoBase64,
        localFontReg,
        localFontBold,
        localFontType,
        localFontFamily: fontFamily
      });
    } else if (normDocType === 'VOTER') {
      if (data.frontCardBase64 && data.backCardBase64) {
        htmlTemplate = generateCroppedVoterPVCHTML({
          frontCardBase64: data.frontCardBase64,
          backCardBase64: data.backCardBase64
        });
      } else {
        htmlTemplate = generateVoterPVCHTML({
          name,
          localName,
          fatherName,
          fatherNameLocal,
          dob,
          gender,
          documentNumber,
          address,
          localAddress,
          assemblyConstituency,
          photoBase64,
          qrBase64,
          signatureBase64,
          localFontReg,
          localFontBold,
          localFontType,
          localFontFamily: fontFamily
        });
      }
    } else {
      htmlTemplate = generateAadhaarPVCHTML({
        name,
        localName: hasLocalLanguage ? localName : '',
        dobLine:   hasLocalLanguage ? dobLine   : dobLine,
        genderLine,
        mobile,
        aadhaarNum,
        vid,
        localAddressLabel: upperAddressLabel,
        localAddress:      upperAddress,
        address:           lowerAddress,
        hasLocalLanguage,
        issueDate,
        detailsAsOn,
        frontTemplateBase64,
        backTemplateBase64,
        photoBase64,
        qrBase64,
        localFontReg,
        localFontBold,
        localFontType,
        localFontFamily: fontFamily,
        serifReg,
        serifBold,
        lang
      });
    }

    try {
      fs.writeFileSync('C:/Users/NANO/Downloads/ayushman_compiled.html', htmlTemplate);
    } catch (e) {}

    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: CARD_WIDTH, height: CARD_HEIGHT * 2 + 40, deviceScaleFactor: 1 });

    // Use domcontentloaded: all fonts are base64 inline so there's nothing to wait for from network
    await page.setContent(htmlTemplate, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.evaluate(async () => {
      // Fonts are already embedded as base64 data URIs — just wait for CSS font ready signal
      await document.fonts.ready;

      const w = window as any;
      if (w.fitText) w.fitText();
      if (w.fitAllFields) w.fitAllFields();

      void document.body.offsetHeight;
    });

    console.log('TEXT_RENDERED_WITH_SHAPING');

    const [frontEl, backEl] = await Promise.all([
      page.$('#card-front'),
      page.$('#card-back'),
    ]);
    if (!frontEl) throw new Error('Front card element not found');
    if (!backEl) throw new Error('Back card element not found');

    // Take both screenshots in parallel
    const [frontBufferBase64, backBufferBase64] = await Promise.all([
      frontEl.screenshot({ encoding: 'base64' }),
      backEl.screenshot({ encoding: 'base64' }),
    ]);
    console.log('FRONT_PNG_CREATED');
    console.log('BACK_PNG_CREATED');

    const frontDataUrl = `data:image/png;base64,${frontBufferBase64}`;
    const backDataUrl = `data:image/png;base64,${backBufferBase64}`;

    let pdfBase64: string | null = null;
    if (exportType === 'pdf_a4' || exportType === 'pdf_single') {
      const a4Page = await browser.newPage();
      const a4Html = generateA4PrintHTML(frontDataUrl, backDataUrl);
      await a4Page.setContent(a4Html, { waitUntil: 'domcontentloaded' });
      await a4Page.evaluate(() => new Promise(r => setTimeout(r, 600)));

      const pdfBuffer = await a4Page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      });

      pdfBase64 = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString('base64')}`;
      console.log('PDF_CREATED');
      await a4Page.close();
    }

    await page.close();

    try {
      const supabase = await createClient();
      if (!skipDbOps) {
        const newRemaining = Math.max(0, (userData.remaining_cards || 0) - 1);
        const { error: updateErr } = await supabase
          .from('users')
          .update({ remaining_cards: newRemaining })
          .eq('id', user.id);

        if (updateErr) {
          logger.error('Failed to deduct card credit in DB', updateErr, { userId: user.id });
        } else {
          logger.info('Deducted 1 card credit from user profile', { userId: user.id, newRemaining });
        }
      }
      // Always write to card_history for analytics (unless it's mock-user-id)
      if (user.id !== 'mock-user-id') {
        await supabase.from('card_history').insert({
          user_id: user.id,
          document_type: documentType || 'AADHAAR',
          status: 'SUCCESS',
        });
      }
    } catch (dbErr: any) {
      logger.warn('DB error writing history/deducting credit ignoring', { userId: user.id, err: dbErr.message });
    }

    logger.info('Card generated successfully', { userId: user.id, exportType });
    return NextResponse.json({
      success: true,
      frontPng: frontDataUrl,
      backPng: backDataUrl,
      pdfUrl: pdfBase64,
    });

  } catch (error: any) {
    logger.error('Card Generation Error', error);
    if (browser) {
      try { await browser.close(); } catch (e) { }
    }
    return NextResponse.json({ error: 'Failed to generate card', details: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// A4 Print Layout HTML
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function generateA4PrintHTML(frontDataUrl: string, backDataUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 794px;
      background: #fff;
      font-family: Arial, sans-serif;
    }
    .page {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      gap: 24px;
    }
    .card-label {
      font-size: 11px;
      font-weight: 600;
      color: #666;
      letter-spacing: 1px;
      text-transform: uppercase;
      align-self: flex-start;
      margin-left: 27px;
      margin-bottom: -18px;
    }
    .card-img {
      width: 740px;
      height: auto;
      border-radius: 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.18);
      display: block;
    }
    .divider {
      width: 740px;
      border: none;
      border-top: 1px dashed #bbb;
      margin: 4px 0;
    }
    .footer {
      font-size: 9px;
      color: #aaa;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="card-label">Front Side</div>
    <img class="card-img" src="${frontDataUrl}" alt="Aadhaar PVC Front" />
    <hr class="divider" />
    <div class="card-label">Back Side</div>
    <img class="card-img" src="${backDataUrl}" alt="Aadhaar PVC Back" />
    <div class="footer">Generated by PROPVC TOOL &bull; www.uidai.gov.in &bull; 1947</div>
  </div>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Rebuilt HTML Card Template with Preloaded Local Fonts and Absolute Position Layouts
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


function generateAadhaarPVCHTML(params: any): string {
  const photoSrc          = params.photoBase64 || '';
  const qrSrc             = params.qrBase64 || '';
  const name              = params.name || '';
  const localName         = params.localName || '';
  const dobLine           = params.dobLine || '';
  const genderLine        = params.genderLine || '';
  const mobile            = params.mobile ? `Mob: ${params.mobile}` : '';
  const aadhaarNum        = params.aadhaarNum || '';
  const vid               = params.vid || '';
  const localAddress      = params.localAddress || '';
  const address           = params.address || '';
  const hasLocalLanguage  = !!params.hasLocalLanguage;

  let displayLocalAddress = localAddress;
  let displayLocalAddressLabel = params.localAddressLabel || 'Address:';
  let renderEnglishAddress = true;

  if (!localAddress.trim()) {
    displayLocalAddress = address;
    displayLocalAddressLabel = "Address:";
    renderEnglishAddress = false;
  }
  const issueDate         = params.issueDate || '';
  const detailsAsOn       = params.detailsAsOn || '';
  const langKey           = (params.lang || 'english').toLowerCase();

  // ── Heading texts overlaid on top of the tricolor strokes ──────────────────
  // Front: "Bharat Sarkar" / "Government of India"
  // Back : UIDAI full name in local language / English
  const FRONT_HEADING: Record<string, { line1: string; line2: string }> = {
    gujarati:  { line1: 'ભારત સરકાર',                              line2: 'Government of India' },
    hindi:     { line1: 'भारत सरकार',                              line2: 'Government of India' },
    marathi:   { line1: 'भारत सरकार',                              line2: 'Government of India' },
    tamil:     { line1: 'இந்திய அரசு',                             line2: 'Government of India' },
    telugu:    { line1: 'భారత ప్రభుత్వం',                          line2: 'Government of India' },
    kannada:   { line1: 'ಭಾರತ ಸರ್ಕಾರ',                            line2: 'Government of India' },
    malayalam: { line1: 'ഭാരത സർക്കാർ',                           line2: 'Government of India' },
    bengali:   { line1: 'ভারত সরকার',                              line2: 'Government of India' },
    assamese:  { line1: 'ভাৰত চৰকাৰ',                              line2: 'Government of India' },
    punjabi:   { line1: 'ਭਾਰਤ ਸਰਕਾਰ',                             line2: 'Government of India' },
    odia:      { line1: 'ଭାରତ ସରକାର',                              line2: 'Government of India' },
    urdu:      { line1: 'حکومتِ ہند',                              line2: 'Government of India' },
    english:   { line1: 'भारत सरकार',                              line2: 'Government of India' },
  };
  const BACK_HEADING: Record<string, { line1: string; line2: string }> = {
    gujarati:  { line1: 'ભારતીય વિશિષ્ટ ઓળખ પ્રાધિકરણ',           line2: 'Unique Identification Authority of India' },
    hindi:     { line1: 'भारतीय विशिष्ट पहचान प्राधिकरण',           line2: 'Unique Identification Authority of India' },
    marathi:   { line1: 'भारतीय विशिष्ट ओळख प्राधिकरण',             line2: 'Unique Identification Authority of India' },
    tamil:     { line1: 'இந்திய தனித்துவ அடையாள ஆணையம்',            line2: 'Unique Identification Authority of India' },
    telugu:    { line1: 'భారత విశిష్ట గుర్తింపు సంస్థ',              line2: 'Unique Identification Authority of India' },
    kannada:   { line1: 'ಭಾರತೀಯ ವಿಶಿಷ್ಟ ಗುರುತಿನ ಪ್ರಾಧಿಕಾರ',          line2: 'Unique Identification Authority of India' },
    malayalam: { line1: 'ഭാരതീയ വിശിഷ്ട തിരിച്ചറിൽ അഥോറിറ്റി',       line2: 'Unique Identification Authority of India' },
    bengali:   { line1: 'ভারতীয় বিশিষ্ট পরিচয় কর্তৃপক্ষ',           line2: 'Unique Identification Authority of India' },
    assamese:  { line1: 'ভাৰতীয় বিশিষ্ট পৰিচয় কৰ্তৃপক্ষ',           line2: 'Unique Identification Authority of India' },
    punjabi:   { line1: 'ਭਾਰਤੀ ਵਿਲੱਖਣ ਪਛਾਣ ਅਥਾਰਟੀ',                 line2: 'Unique Identification Authority of India' },
    odia:      { line1: 'ଭାରତୀୟ ବିଶିଷ୍ଟ ପରିଚୟ ପ୍ରାଧିକରଣ',             line2: 'Unique Identification Authority of India' },
    urdu:      { line1: 'بھارتی منفرد شناختی اتھارٹی',              line2: 'Unique Identification Authority of India' },
    english:   { line1: 'भारतीय विशिष्ट पहचान प्राधिकरण',           line2: 'Unique Identification Authority of India' },
  };
  const frontH = FRONT_HEADING[langKey] || FRONT_HEADING.english;
  const backH  = BACK_HEADING[langKey]  || BACK_HEADING.english;

  // ── Warning box text ───────────────────────────────────────────────────────
  const warnings: Record<string, { local: string; english: string }> = {
    gujarati: {
      local: 'આધાર એ ઓળખની સાબિતી છે, નાગરિકતા કે જન્મતારીખની નથી. તેનો ઉપયોગ ચકાસણી (ઑનલાઇન પ્રમાણીકરણ, અથવા ક્યુઆર કોડ / ઑફલાઇન એક્સએમએલ સ્કેનિંગ) સાથે થવો જોઈએ.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    telugu: {
      local: 'ఆధార్ అనేది గుర్తింపు ఆధారం, పౌరసత్వం లేదా పుట్టిన తేదీకి సంబంధించినది కాదు. ధృవీకరణతో (ఆన్‌లైన్ ప్రమాణీకరణ, లేదా క్యూఆర్ కోడ్ / ఆఫ్‌లైన్ ఎక్స్‌ఎమ్ఎల్ స్కానింగ్) మాత్రమే దీనిని उपयोगించాలి.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    tamil: {
      local: 'ஆதார் என்பது அடையாளத்தின் சான்று, குடியுரிமை அல்லது பிறந்த தேதிக்கானதல்ல. சரிபார்ப்புடன் (ஆன்லைன் அங்கீகாரம் அல்லது கியூஆர் குறியீடு / ஆஃப்லைன் எக்ஸ்எம்எல் ஸ்கேனிங்) இதைப் பயன்படுத்த வேண்டும்.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    kannada: {
      local: 'ಆಧಾರ್ ಗುರುತಿನ ಪುರಾವೆಯಾಗಿದೆ, ಪೌರತ್ವ ಅಥವಾ ಜನ್ಮ ದಿನಾಂಕದ್ದಲ್ಲ. ಇದನ್ನು ಪರಿಶೀಲನೆಯೊಂದಿಗೆ (ಆನ್‌ಲೈನ್ ದೃಢೀಕರಣ, ಅಥವಾ ಕ್ಯೂಆರ್ ಕೋಡ್ / ಆಫ್‌ಲೈನ್ ಎಕ್ಸ್‌ಎಮ್ಎಲ್ ಸ್ಕ್ಯಾನಿಂಗ್) ಬಳಸಬೇಕು.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    malayalam: {
      local: 'ആധാർ എന്നത് വ്യക്തിത്വത്തിന്റെ തെളിവാണ്, പൗരത്വത്തിന്റെയോ ജനനത്തീയതിയുടെയോ അല്ല. ഇത് പരിശോധനയോടെ (ഓൺലൈൻ പ്രാമാണീകരണം അല്ലെങ്കിൽ ക്യുആർ കോഡ് / ഓഫ്‌ലൈൻ എക്സ്എംഎൽ സ്കാനിംഗ്) ഉപയോഗിക്കേണ്ടതാണ്.',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    bengali: {
      local: 'আধার সনাক্তকরণের প্রমাণ, নাগরিকত্ব বা জন্ম তারিখের নয়। এটি যাচাইকরণের সাথে (অনলাইন প্রমাণীকরণ, বা কিউআর কোড / অফলাইন এক্সএমএল স্ক্যানিং) ব্যবহার করা উচিত।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    assamese: {
      local: 'আধাৰ পৰিচয়ৰ প্ৰমাণ, নাগৰিকত্ব বা জন্ম তাৰিখৰ নহয়। ইয়াক সত্যপন কৰাৰ পাছত (অনলাইন প্ৰমাণীকৰণ বা কিউআৰ কোড / অফলাইন এক্সএমএল স্কেনিং) ব্যৱহাৰ কৰিব লাগে।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    punjabi: {
      local: 'ਆਧਾਰ ਪਛਾਣ ਦਾ ਸਬੂਤ ਹੈ, ਨਾਗਰਿਕਤਾ ਜਾਂ ਜਨਮ ਮਿਤੀ ਦਾ ਨਹੀਂ। ਇਸਦੀ ਵਰਤੋਂ ਤਸਦੀਕ (ਆਨਲਾਈਨ ਪ੍ਰਮਾਣਿਕਤਾ, ਜਾਂ QR ਕੋਡ / ਆਫਲਾਈਨ XML ਦੀ ਸਕੈਨਿੰਗ) ਦੇ ਨਾਲ ਕੀਤੀ ਜਾਣੀ ਚਾਹੀਦੀ ਹੈ।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    odia: {
      local: 'ଆଧାର ହେଉଛି ପରିଚୟର ପ୍ରମାଣ, ନାଗରିକତା କିମ୍ବା ଜନ୍ମ ତାରିଖର ନୁହେଁ। ଏହାକୁ ସତ୍ୟାପନ ସହିତ (ଅନଲାଇନ୍ ପ୍ରମାଣୀକରଣ କିମ୍ବା କ୍ୟୁଆର୍ କୋଡ୍ / ଅଫଲାଇନ୍ ଏକ୍ସଏମଏଲ୍ ସ୍କାନିଂ) ବ୍ୟવહાર କରାଯିବା ଉଚିତ।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    hindi: {
      local: 'आधार पहचान का प्रमाण है, नागरिकता या जन्म तिथि का नहीं। इसका उपयोग सत्यापन (ऑनलाइन प्रमाणीकरण, या क्यूआर कोड / ऑफलाइन एक्सएमएल की स्कैनिंग) के साथ किया जाना चाहिए।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    marathi: {
      local: 'आधार हा ओळखीचा पुरावा आहे, नागरिकत्वाचा किंवा जन्म तारखेचा नाही. याची पडताळणी (ऑनलाइन प्रमाणीकरण किंवा क्यूआर कोड / ऑफलाइन एक्सएमएल स्कॅनिंग) करूनच वापर केला पाहिजे।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    urdu: {
      local: 'آدھار شناخت کا ثبوت ہے، شہریت یا تاریخ پیدائش का नहीं। इसका इस्तेमाल तसकीक़ (ऑनलाइन तसकीक़, या क्यूआर कोड / ऑफ़लाइन एक्सएमएल की स्कैनिंग) के साथ किया जाना चाहिए।',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    },
    english: {
      local: 'Aadhaar is proof of identity, not of citizenship or date of birth. It should be used with verification (online authentication, or scanning of QR code / offline XML).',
      english: 'Aadhaar is proof of identity, not of citizenship or date of birth.'
    }
  }

  const selectedWarning = warnings[langKey] || warnings.english;

  const SLOGANS: Record<string, string> = {
    gujarati:  'મારો આધાર, મારી ઓળખ',
    hindi:     'मेरा आधार, मेरी पहचान',
    marathi:   'माझा आधार, माझी ओळख',
    telugu:    'నా ఆధార్, నా గుర్తింపు',
    tamil:     'எனது ஆதார், எனது அடையாளம்',
    kannada:   'ನನ್ನ ಆಧಾರ್, ನನ್ನ ಗುರುತು',
    malayalam: 'എന്റെ ആധാർ, എന്റെ അടയാളം',
    bengali:   'আমার আধার, আমার পরিচয়',
    assamese:  'মোৰ আধাৰ, মোৰ পৰিচয়',
    punjabi:   'ਮੇਰਾ ਆਧਾਰ, ਮੇਰੀ ਪਛਾਣ',
    odia:      'ମୋ ଆଧାର, ମୋ ପରିଚୟ',
    urdu:      'میرا آدھار، میری پہچان',
    english:   'My Aadhaar, My Identity',
  };

  const rawSlogan = SLOGANS[langKey] || SLOGANS.english;

  function formatSloganHTML(slogan: string): string {
    const aadhaarWords = [
      'આધાર,', 'આધાર',
      'आधार,', 'आधार',
      'ఆధార్,', 'ఆధార్',
      'ஆதார்,', 'ஆதார்',
      'ಆಧಾರ್,', 'ಆಧಾರ್',
      'ആധാർ,', 'ആധാർ',
      'আধার,', 'আধার',
      'আধাৰ,', 'আধাৰ',
      'ଆଧାର,', 'ଆଧାର',
      'ਆਧਾਰ,', 'ਆਧਾਰ',
      'آدھار،', 'آدھار',
      'Aadhaar,', 'Aadhaar'
    ];
    let formatted = slogan;
    for (const word of aadhaarWords) {
      if (formatted.includes(word)) {
        formatted = formatted.replace(word, `<span class="slogan-red">${word}</span>`);
        break;
      }
    }
    return formatted;
  }
  const formattedSlogan = formatSloganHTML(rawSlogan);

  const AADHAAR_LOGO_TEXTS: Record<string, string> = {
    gujarati:  'આધાર',
    hindi:     'आधार',
    marathi:   'आधार',
    telugu:    'ఆధార్',
    tamil:     'ஆதார்',
    kannada:   'ಆಧಾರ್',
    malayalam: 'ആധാർ',
    bengali:   'আধার',
    assamese:  'আধাৰ',
    punjabi:   'ਆਧਾਰ',
    odia:      'ଆଧାର',
    urdu:      'آدھار',
    english:   'Aadhaar',
  };
  const logoText = AADHAAR_LOGO_TEXTS[langKey] || AADHAAR_LOGO_TEXTS.english;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: '${params.localFontFamily}-Regular';
      src: url('data:font/ttf;base64,${params.localFontReg}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: '${params.localFontFamily}-Bold';
      src: url('data:font/ttf;base64,${params.localFontBold}') format('truetype');
      font-weight: bold;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'NotoSerif-Regular';
      src: url('data:font/ttf;base64,${params.serifReg}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
    @font-face {
      font-family: 'NotoSerif-Bold';
      src: url('data:font/ttf;base64,${params.serifBold}') format('truetype');
      font-weight: bold;
      font-style: normal;
      font-display: block;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #ffffff; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; font-feature-settings: 'liga' 1, 'kern' 1, 'calt' 1, 'locl' 1; font-kerning: auto; }

    .card-container {
      width: 1013px;
      height: 638px;
      position: relative;
      overflow: hidden;
      background-size: 1013px 638px;
      background-repeat: no-repeat;
      margin-bottom: 20px;
    }

    #card-front {
      background-image: url(${params.frontTemplateBase64});
    }

    #card-back {
      background-image: url(${params.backTemplateBase64});
    }

    /* ── Heading text overlaid on tricolor brush strokes ── */
    .card-heading-line1 {
      position: absolute;
      left: 150px;
      top: 28px;
      width: 560px;
      font-family: '${params.localFontFamily}-Regular', 'NotoSerif-Regular', sans-serif;
      font-size: 34px;
      font-weight: normal;
      color: #000000;
      text-align: center;
      white-space: nowrap;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'liga' 1, 'kern' 1, 'calt' 1, 'locl' 1;
    }

    .card-heading-line2 {
      position: absolute;
      left: 150px;
      top: 83px;
      width: 560px;
      font-family: 'NotoSerif-Regular', 'Arial', sans-serif;
      font-size: 26px;
      font-weight: normal;
      color: #000000;
      text-align: center;
      white-space: nowrap;
    }

    /* ── Absolute Overlay Positioning ── */
    .photo-container {
      position: absolute;
      left: 42px;
      top: 185px;
      width: 183px;
      height: 230px;
      overflow: hidden;
      background: #f0f0f0;
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .left-strip {
      position: absolute;
      top: 335px;
      left: 18px;
      transform: translate(-50%, -50%) rotate(-90deg);
      transform-origin: center;
      white-space: nowrap;
      font-family: 'NotoSerif-Bold';
      font-size: 15px;
      font-weight: bold;
      color: #000000;
      text-align: center;
    }

    .local-name {
      position: absolute;
      left: 242px;
      top: 185px;
      width: 730px;
      font-family: '${params.localFontFamily}-Bold', 'Shruti', 'Nirmala UI', sans-serif;
      font-size: 26px;
      color: #000000;
      white-space: nowrap;
      text-rendering: optimizeLegibility;
      font-feature-settings: 'liga' 1, 'kern' 1, 'calt' 1, 'locl' 1;
      font-kerning: auto;
      unicode-bidi: plaintext;
    }

    .english-name {
      position: absolute;
      left: 242px;
      top: 220px;
      width: 730px;
      font-family: 'NotoSerif-Bold', '${params.localFontFamily}-Bold';
      font-size: 26px;
      color: #000000;
      line-height: 1.2;
      white-space: nowrap;
    }

    .dob-line {
      position: absolute;
      left: 242px;
      top: 255px;
      width: 730px;
      font-family: '${params.localFontFamily}-Regular', 'NotoSerif-Regular';
      font-size: 24px;
      color: #000000;
      line-height: 1.2;
      white-space: nowrap;
    }

    .gender-line {
      position: absolute;
      left: 242px;
      top: 290px;
      width: 730px;
      font-family: '${params.localFontFamily}-Regular', 'NotoSerif-Regular';
      font-size: 24px;
      color: #000000;
      line-height: 1.2;
      white-space: nowrap;
    }

    .mobile-line {
      position: absolute;
      left: 242px;
      top: 325px;
      width: 730px;
      font-family: 'NotoSerif-Regular';
      font-size: 24px;
      color: #000000;
      line-height: 1.2;
      white-space: nowrap;
    }

    .warning-box {
      position: absolute;
      left: 242px;
      top: 360px;
      width: 724px;
      border: 2px solid #cc0000;
      padding: 6px 9px;
      box-sizing: border-box;
      background: transparent;
    }

    .warning-local {
      font-family: '${params.localFontFamily}-Bold';
      font-size: 14px;
      color: #000000;
      line-height: 1.4;
      margin-bottom: 5px;
    }

    .warning-english {
      font-family: 'NotoSerif-Regular';
      font-size: 13px;
      color: #000000;
      line-height: 1.45;
    }

    .warning-english-bold {
      font-family: 'NotoSerif-Bold';
      font-size: 13px;
      color: #000000;
    }

    .aadhaar-number-block {
      width: 600px;
      height: 80px;
      position: absolute;
      left: 50%;
      bottom: 74px;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    #card-back .aadhaar-number-block {
      bottom: 100px;
    }

    .aadhaar-num-text {
      font-family: 'NotoSerif-Bold';
      font-size: 56px;
      font-weight: 700;
      color: #000000;
      letter-spacing: 3px;
      padding-left: 3px;   
      line-height: 1;
      text-align: center;
      white-space: nowrap;
    }

    .vid-num-text {
      font-family: 'NotoSerif-Regular';
      font-size: 20px;
      font-weight: 400;
      color: #111111;
      line-height: 1;
      text-align: center;
      margin-top: 5px;
      white-space: nowrap;
    }

    /* Back Card Coordinates */
    .qr-container {
      position: absolute;
      left: 743px;
      top: 150px;
      width: 225px;
      height: 225px;
      overflow: hidden;
    }

    .qr-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .local-address-label {
      position: absolute;
      left: 44px;
      top: 148px;
      font-family: '${params.localFontFamily}-Bold', 'Shruti', 'Nirmala UI', sans-serif;
      font-size: 22px;
      color: #000000;
      white-space: nowrap;
    }

    .local-address {
      position: absolute;
      left: 44px;
      top: 178px;
      width: 660px;
      font-family: '${params.localFontFamily}-Regular', 'Shruti', 'Nirmala UI', sans-serif;
      font-size: 24px;
      color: #000000;
      line-height: 1.45;
      word-break: break-word;
    }

    .english-address-label {
      position: absolute;
      left: 44px;
      top: 280px;
      font-family: 'NotoSerif-Bold', '${params.localFontFamily}-Bold';
      font-size: 22px;
      color: #000000;
      white-space: nowrap;
    }

    .english-address {
      position: absolute;
      left: 44px;
      top: 306px;
      width: 660px;
      font-family: 'NotoSerif-Regular', '${params.localFontFamily}-Regular';
      font-size: 24px;
      color: #000000;
      line-height: 1.4;
      word-break: break-word;
    }

    /* ── Slogan Overlay ── */
    .slogan-container {
      position: absolute;
      bottom: 12px;
      left: 0;
      width: 100%;
      text-align: center;
      font-family: '${params.localFontFamily}-Bold', 'Shruti', 'Nirmala UI', sans-serif;
      font-size: 42px;
      font-weight: bold;
      color: #000000;
      line-height: 1;
      letter-spacing: 0.5px;
      z-index: 100;
    }
    .slogan-red {
      color: #cc0000;
    }

    /* ── Logo Text Overlay ── */
    .logo-text-overlay {
      position: absolute;
      right: 25px;
      top: 114px;
      width: 190px;
      text-align: center;
      font-family: '${params.localFontFamily}-Bold', 'Shruti', 'Nirmala UI', sans-serif;
      font-size: 34px;
      font-weight: bold;
      color: #CC0000;
      line-height: 1;
      z-index: 100;
    }
  </style>
  <script>
    function relRect(el, parent) {
      const er = el.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      return {
        top:    er.top    - pr.top,
        bottom: er.bottom - pr.top,
        left:   er.left   - pr.left,
        right:  er.right  - pr.left
      };
    }

    function rectsOverlap(a, b) {
      return !(a.bottom <= b.top || a.top >= b.bottom ||
               a.right  <= b.left || a.left >= b.right);
    }

    function resolveAadhaarBlock(card) {
      const block = card.querySelector('.aadhaar-number-block');
      if (!block) return;

      const isBack = card.id === 'card-back';
      const defaultBottom = isBack ? 100 : 74;
      const minBottom = isBack ? 92 : 68;

      const collideSelectors = [
        '.local-address',
        '.english-address',
        '.english-address-label',
        '.warning-box',
        '.mobile-line',
        '.gender-line',
        '.dob-line',
        '.english-name',
        '.local-name'
      ];

      const STEP   = 5;
      const MAX_IT = 30;
      let   iter   = 0;

      let bottomVal = defaultBottom;
      block.style.bottom = bottomVal + 'px';

      function hasCollision() {
        const blockR = relRect(block, card);
        for (const sel of collideSelectors) {
          for (const el of card.querySelectorAll(sel)) {
            if (rectsOverlap(blockR, relRect(el, card))) return true;
          }
        }
        return false;
      }

      while (hasCollision() && iter < MAX_IT && bottomVal > minBottom) {
        bottomVal -= STEP;
        block.style.bottom = bottomVal + 'px';
        iter++;
      }
    }

    window.fitText = function() {
      const fitSingleLine = (selector, maxW, initialSize) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          let size = initialSize;
          el.style.fontSize = size + 'px';
          while (el.scrollWidth > maxW && size > 12) {
            size -= 1;
            el.style.fontSize = size + 'px';
          }
        });
      };

      fitSingleLine('.card-heading-line1', 560, 34);
      fitSingleLine('.card-heading-line2', 560, 26);
      fitSingleLine('.local-name', 730, 26);
      fitSingleLine('.english-name', 730, 26);
      fitSingleLine('.dob-line', 730, 24);
      fitSingleLine('.gender-line', 730, 24);
      fitSingleLine('.mobile-line', 730, 24);
      fitSingleLine('.aadhaar-num-text', 580, 56);
      fitSingleLine('.vid-num-text', 580, 20);

      const fitMultiLine = (selector, maxH) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          let size = parseFloat(window.getComputedStyle(el).fontSize);
          while (el.scrollHeight > maxH && size > 12) {
            size -= 1;
            el.style.fontSize = size + 'px';
            el.style.lineHeight = (size * 1.4) + 'px';
          }
        });
      fitMultiLine('.local-address', 130);
      fitMultiLine('.english-address', 120);
      fitMultiLine('.warning-local', 32);
      fitMultiLine('.warning-english', 28);

      document.querySelectorAll('.aadhaar-number-block').forEach(block => {
        block.style.outline = '2px solid red';
        const numEl = block.querySelector('.aadhaar-num-text');
        const vidEl = block.querySelector('.vid-num-text');
        if (numEl) numEl.style.outline = '1.5px solid red';
        if (vidEl) vidEl.style.outline = '1.5px solid blue';
      });

      const cards = document.querySelectorAll('.card-container');
      cards.forEach(card => resolveAadhaarBlock(card));

      document.querySelectorAll('.aadhaar-number-block').forEach(block => {
        block.style.outline = '';
        const numEl = block.querySelector('.aadhaar-num-text');
        const vidEl = block.querySelector('.vid-num-text');
        if (numEl) numEl.style.outline = '';
        if (vidEl) vidEl.style.outline = '';
      });
    };
  </script>
</head>
<body>

  <!--FRONT CARD-->
  <div class="card-container" id="card-front">

    <!-- ── Heading overlays on tricolor strokes ── -->
    <div class="card-heading-line1">${ frontH.line1 }</div>
    <div class="card-heading-line2">${ frontH.line2 }</div>

    <!-- ── Logo Text Overlay ── -->
    <div class="logo-text-overlay">${ logoText }</div>

    <!-- ── Left rotated strip ── -->
    <div class="left-strip">Aadhaar No. Issued: ${ issueDate }</div>

    <!-- ── Photo ── -->
    <div class="photo-container">
      ${ photoSrc ? `<img src="${photoSrc}" class="photo-img" />` : '' }
    </div>

    <!-- ── Personal Info ── -->
    ${ localName ? `<div class="local-name">${localName}</div>` : '' }
    <div class="english-name">${ name }</div>
    <div class="dob-line">${ dobLine }</div>
    <div class="gender-line">${ genderLine }</div>
    ${ mobile ? `<div class="mobile-line">${mobile}</div>` : '' }

    <!-- ── Warning Box ── -->
    <div class="warning-box">
      <div class="warning-local">${ selectedWarning.local }</div>
      <div class="warning-english"><span class="warning-english-bold">${ selectedWarning.english }</span> It should be used with verification (online authentication, or scanning of QR code / offline XML).</div>
    </div>

    <!-- ── Aadhaar Number ── -->
    <div class="aadhaar-number-block">
      <div class="aadhaar-num-text">${ aadhaarNum }</div>
      ${ vid ? `<div class="vid-num-text">VID: ${vid}</div>` : '' }
    </div>

    <!-- ── Bottom Slogan ── -->
    <div class="slogan-container">${ formattedSlogan }</div>
  </div>

  <!--BACK CARD-->
  <div class="card-container" id="card-back">

    <!-- ── Heading overlays on tricolor strokes ── -->
    <div class="card-heading-line1">${ backH.line1 }</div>
    <div class="card-heading-line2">${ backH.line2 }</div>

    <!-- ── Logo Text Overlay ── -->
    <div class="logo-text-overlay">${ logoText }</div>

    <!-- ── Left rotated strip ── -->
    <div class="left-strip">Details As On: ${ detailsAsOn }</div>

    <!-- ── Address block: local language label + text ── -->
    <div class="local-address-label">${ displayLocalAddressLabel }</div>
    <div class="local-address">${ displayLocalAddress }</div>

    ${ renderEnglishAddress && hasLocalLanguage ? `
      <div class="english-address-label">Address:</div>
      <div class="english-address">${ address }</div>
    ` : '' }

    <!-- ── QR Code ── -->
    <div class="qr-container">
      ${ qrSrc ? `<img src="${qrSrc}" class="qr-img" />` : '' }
    </div>

    <!-- ── Aadhaar Number ── -->
    <div class="aadhaar-number-block">
      <div class="aadhaar-num-text">${ aadhaarNum }</div>
      ${ vid ? `<div class="vid-num-text">VID: ${vid}</div>` : '' }
    </div>
  </div>

</body>
</html>`;
}

const AYUSHMAN_LABELS: Record<string, {
  name: string;
  yob: string;
  gender: string;
  village: string;
  subdivision: string;
  district: string;
  state: string;
  mobile: string;
  pmjay: string;
  abha: string;
  ration: string;
}> = {
  gujarati: {
    name: 'નામ / NAME :',
    yob: 'જન્મ વર્ષ / YOB :',
    gender: 'જાતિ / GENDER :',
    village: 'ગામ/વાર્ડ- Village/Ward :',
    subdivision: 'તાલુકો/શહેર - Subdivision/Town :',
    district: 'જિલ્લા/District :',
    state: 'રાજ્ય/State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  },
  hindi: {
    name: 'नाम / NAME :',
    yob: 'जन्म वर्ष / YOB :',
    gender: 'लिंग / GENDER :',
    village: 'ग्राम/वार्ड - Village/Ward :',
    subdivision: 'उपखंड/कस्बा - Subdivision/Town :',
    district: 'जिला/District :',
    state: 'राज्य/State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  },
  marathi: {
    name: 'नाव / NAME :',
    yob: 'जन्म वर्ष / YOB :',
    gender: 'लिंग / GENDER :',
    village: 'गाव/वॉर्ड - Village/Ward :',
    subdivision: 'तालुका/शहर - Subdivision/Town :',
    district: 'जिल्हा/District :',
    state: 'राज्य/State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  },
  english: {
    name: 'NAME :',
    yob: 'YOB :',
    gender: 'GENDER :',
    village: 'Village/Ward :',
    subdivision: 'Subdivision/Town :',
    district: 'District :',
    state: 'State :',
    mobile: 'Mobile :',
    pmjay: 'PM-JAY ID :',
    abha: 'ABHA Number :',
    ration: 'Ration/Other ID :',
  }
};

function generateAyushmanPVCHTML(params: any): string {
  const backCardBase64  = params.backCardBase64  || '';
  const backQrBase64    = params.backQrBase64    || '';
  const photoBase64     = params.photoBase64     || '';
  const qrBase64        = params.qrBase64        || '';
  const name            = (params.name           || '').toUpperCase();
  const dob             = params.dob             || '';
  const gender          = (params.gender         || '').toUpperCase();
  const village         = params.village         || '';
  const subdivision     = params.subdivision     || '';
  const district        = (params.district       || '').toUpperCase();
  const state           = (params.state          || '').toUpperCase();
  const mobile          = params.mobile          || '';
  const pmjayId         = params.documentNumber  || params.pmjayId || '';
  const abhaNumber      = params.vid             || params.abhaNumber || '';
  const rationId        = params.rationId        || '';
  const localFontReg    = params.localFontReg    || '';
  const localFontBold   = params.localFontBold   || '';
  const isOldLayout     = !!params.isOldLayout;
  const labels          = params.labels          || {};

  const su = state.toUpperCase();
  let cLang = 'english';
  if (su.includes('GUJARAT')) cLang = 'gujarati';
  else if (su.includes('MAHARASHTRA')) cLang = 'marathi';
  else if (['BIHAR','JHARKHAND','UTTAR PRADESH','MADHYA PRADESH','RAJASTHAN',
             'HARYANA','UTTARAKHAND','HIMACHAL','CHHATTISGARH','DELHI','PUNJAB']
             .some(x => su.includes(x))) cLang = 'hindi';
  else if (su.includes('TELANGANA') || su.includes('ANDHRA')) cLang = 'telugu';
  else if (su.includes('KARNATAKA')) cLang = 'kannada';
  else if (su.includes('TAMIL')) cLang = 'tamil';
  else if (su.includes('BENGAL') || su.includes('WEST BENGAL')) cLang = 'bengali';

  type LD = { title: string; l1: string; l2: string; footL: string; stLbl: string };
  const LANG: Record<string, LD> = {
    gujarati: { title:'આયુષ્માન કાર્ડ',  l1:'₹ ૫ લાખ સુધીની', l2:'મફત સારવાર',       footL:'આયુષ્માન ભારત પ્રધાનમંત્રી જન આરોગ્ય યોજના', stLbl:'રાજ્ય' },
    hindi:    { title:'आयुष्मान कार्ड',   l1:'₹ 5 लाख तक',       l2:'मुफ्त इलाज',       footL:'आयुष्मान भारत प्रधानमंत्री जन आरोग्य योजना',  stLbl:'राज्य' },
    marathi:  { title:'आयुष्मान कार्ड',   l1:'₹ 5 लाख पर्यंत',   l2:'मोफत उपचार',       footL:'आयुष्मान भारत प्रधानमंत्री जन आरोग्य योजना',  stLbl:'राज्य' },
    telugu:   { title:'ఆయుష్మాన్ కార్డ్', l1:'₹5 లక్షల వరకు',   l2:'ఉచిత చికిత్స',     footL:'ఆయుష్మాన్ భారత్ ప్రధానమంత్రి జన్ ఆరోగ్య యోజన', stLbl:'రాష్ట్రం' },
    kannada:  { title:'ಆಯುಷ್ಮಾನ್ ಕಾರ್ಡ್', l1:'₹5 ಲಕ್ಷದ ವರೆಗೆ', l2:'ಉಚಿತ ಚಿಕಿತ್ಸೆ',    footL:'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ ಪ್ರಧಾನ ಮಂತ್ರಿ ಜನ ಆರೋಗ್ಯ ಯೋಜನೆ', stLbl:'ರಾಜ್ಯ' },
    tamil:    { title:'ஆயுஷ்மான் கார்டு',  l1:'₹5 இலட்சம் வரை', l2:'இலவச சிகிச்சை',   footL:'ஆயுஷ்மான் பாரத் பிரதம மந்திரி ஜன் ஆரோக்கிய யோஜனா', stLbl:'மாநிலம்' },
    bengali:  { title:'আয়ুষ্মান কার্ড',   l1:'₹5 লক্ষ পর্যন্ত', l2:'বিনামূল্যে চিকিৎসা', footL:'আয়ুষ্মান ভারত প্রধানমন্ত্রী জন আরোগ্য যোজনা', stLbl:'রাজ্য' },
    english:  { title:'AYUSHMAN CARD',      l1:'Up to ₹5 Lakh',  l2:'Free Treatment',    footL:'AYUSHMAN BHARAT PRADHAN MANTRI JAN AROGYA YOJANA',   stLbl:'State' },
  };
  const ld: LD = LANG[cLang] || LANG.english;

  const BACK_CARD_LANGUAGES: Record<string, {
    headerLocal: string;
    headerEng: string;
    points: Array<{ local: string; eng: string }>;
    playStoreLocal: string;
    contactLocal: string;
    logonLocal: string;
    tollFree: string;
  }> = {
    gujarati: {
      headerLocal: 'સ્વાસ્થ્યનું વરદાન, આયુષ્માન',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'આ આયુષ્માન કાર્ડ, આપને અને આપના કુટુંબના દરેક સભ્યને આયુષ્માન ભારત PMJAY યોજના સાથે સંલગ્ન ગુજરાતની કોઈપણ હોસ્પિટલમાં, કુટુંબ દીઠ વાર્ષિક રૂપિયા ૫ લાખ સુધીનું આરોગ્ય કવચ મેળવવામાં મદદ કરશે.',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'આયુષ્માન ભારત PMJAY યોજના અંતર્ગત ભારતભરની AB PMJAY યોજના સાથે સંલગ્ન હોસ્પિટલોમાં આપે કોઈ પૈસા ચૂકવવા/જમા કરવાની જરૂર નથી.',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'યોજના સંબંધિત ફરિયાદની જાણ કરવા અથવા તમારી નજીકના AB PMJAY એમપેનલ્ડ હોસ્પિટલો વિશે વધુ જાણકારી મેળવવા, કૃપા કરીને અમારો સંપર્ક કરો. (ટોલ ફ્રી નં- ૧૮૦૦ ૨૩૩ ૧૦૨૨)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No- 1800 233 1022)'
        }
      ],
      playStoreLocal: 'એપ ડાઉનલોડ કરો',
      contactLocal: 'સંપર્ક કરો',
      logonLocal: 'લોગ ઓન કરો',
      tollFree: '14555 / 1800 233 1022'
    },
    hindi: {
      headerLocal: 'स्वास्थ्य का वरदान, आयुष्मान',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'यह आयुष्मान कार्ड आपको और आपके परिवार को सामूहिक रूप से प्रति वर्ष 5 लाख रुपए तक के मुफ़्त इलाज की सुविधा, भारत के किसी भी AB PM-JAY सूचीबद्ध अस्पताल में, प्रदान करता है।',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'आपको AB PM-JAY सूचीबद्ध अस्पताल में किसी प्रकार का भुगतान अथवा राशि जमा करने की आवश्यकता नहीं है।',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'किसी भी प्रकार की मदद के लिए, शिकायत दर्ज करने के लिए अथवा अपने नज़दीकी AB PM-JAY सूचीबद्ध अस्पताल की जानकारी के लिए, कृपया हमसे संपर्क करें। (टोल फ्री नं - १४५५५ / १८०० १११ ५६५)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No - 14555 / 1800 111 565)'
        }
      ],
      playStoreLocal: 'ऐप डाउनलोड करें',
      contactLocal: 'संपर्क करें',
      logonLocal: 'लॉग ऑन करें',
      tollFree: '14555 / 1800 111 565'
    },
    marathi: {
      headerLocal: 'आरोग्याचे वरदान, आयुष्मान',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'हे आयुष्मान कार्ड तुम्हाला आणि तुमच्या कुटुंबाला सामूहिकपणे प्रति वर्ष 5 लाख रुपयांपर्यंतच्या मोफत उपचारांची सुविधा, भारतातील कोणत्याही AB PM-JAY संलग्न रुग्णालयात प्रदान करते.',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'तुम्हाला AB PM-JAY संलग्न रुग्णालयात कोणत्याही प्रकारचे शुल्क किंवा रक्कम जमा करण्याची आवश्यकता नाही.',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'कोणत्याही प्रकारच्या मदतीसाठी, तक्रार नोंदवण्यासाठी किंवा तुमच्या जवळच्या AB PM-JAY संलग्न रुग्णालयाची माहिती मिळवण्यासाठी कृपया आमच्याशी संपर्क साधा. (टोल फ्री क्र. - १४५५५ / १८०० २३३ ૧૦૨૨)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No - 14555 / 1800 233 1022)'
        }
      ],
      playStoreLocal: 'ॲप डाउनलोड करा',
      contactLocal: 'संपर्क करा',
      logonLocal: 'लॉग ऑन करा',
      tollFree: '14555 / 1800 233 1022'
    },
    bengali: {
      headerLocal: 'স্বাস্থ্যের বরদান, আয়ুষ্মান',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'এই আয়ুষ্মান কার্ড আপনাকে এবং আপনার পরিবারের প্রত্যেক সদস্যকে আয়ুষ্মান ভারত PMJAY যোজনার সাথে যুক্ত যেকোনো হাসপাতালে প্রতি পরিবার প্রতি বছর ৫ লক্ষ টাকা পর্যন্ত বিনামূল্যে চিকিৎসার সুবিধা প্রদান করবে।',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'আয়ুষ্মান ভারত PMJAY যোজনার অধীনে আপনাকে কোনো হাসপাতালে কোনো টাকা প্রদান বা জমা করতে হবে না।',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'যোজনা সম্পর্কিত কোনো অভিযোগ জানাতে বা আপনার নিকটবর্তী হাসপাতালের তথ্য জানতে আমাদের সাথে যোগাযোগ করুন। (টোল ফ্রি নং- ১৪৫৫৫)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No - 14555)'
        }
      ],
      playStoreLocal: 'অ্যাপ ডাউনলোড করুন',
      contactLocal: 'যোগাযোগ করুন',
      logonLocal: 'লগ অন করুন',
      tollFree: '14555'
    },
    tamil: {
      headerLocal: 'ஆரோக்கியத்தின் வரப்பிரசாதம், ஆயுஷ்மான்',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'இந்த ஆயுஷ்மான் கார்டு உங்களுக்கு மற்றும் உங்கள் குடும்பத்தில் உள்ள ஒவ்வொரு உறுப்பினருக்கும் ஆயுஷ்மான் பாரத் PMJAY திட்டத்தின் கீழ் ஆண்டிற்கு ரூ. 5 லட்சம் வரை இலவச சிகிச்சை பெற உதவும்.',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'இத்திட்டத்தின் கீழ் நீங்கள் எந்த ஒரு மருத்துவமனையிலும் பணம் செலுத்தவோ அல்லது டெபாசிட் செய்யவோ தேவையில்லை.',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'புகார்களை தெரிவிக்க அல்லது உங்களுக்கு அருகிலுள்ள மருத்துவமனைகளை பற்றி அறிய எங்களை தொடர்பு கொள்ளவும். (கட்டணமில்லா எண் - 14555)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No - 14555)'
        }
      ],
      playStoreLocal: 'செயலியை பதிவிறக்கவும்',
      contactLocal: 'தொடர்புக்கு',
      logonLocal: 'இணையதள முகவரி',
      tollFree: '14555'
    },
    telugu: {
      headerLocal: 'ఆరోగ్య వరప్రదాయిని, ఆయుష్మాన్',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'ఈ ఆయుష్మాన్ కార్డ్ మీ కుటుంబంలోని ప్రతి సభ్యునికి ఆయుష్మాన్ భారత్ PMJAY పథకం కింద ఏడాదికి రూ. 5 లక్షల వరకు ఉచిత వైద్య సహాయం అందిస్తుంది.',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'ఈ పథకం కింద మీరు చిकीత్స కోసం ఆసుపత్రిలో ఎలాంటి రుసుము చెల్లించాల్సిన లేదా డిపాజిట్ చేయాల్సిన అవసరం లేదు.',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'ఫిర్యాదుల నమోదుకు లేదా మీ సమీప ఆసుపత్రుల వివరాల కోసం మమ్మల్ని సంప్రదించండి. (టోల్ ఫ్రీ నెం - 14555)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No - 14555)'
        }
      ],
      playStoreLocal: 'యాప్ డౌన్లోడ్ చేసుకోండి',
      contactLocal: 'సంప్రదించండి',
      logonLocal: 'వెబ్సైట్',
      tollFree: '14555'
    },
    kannada: {
      headerLocal: 'ಆರೋಗ್ಯದ ವರಪ್ರಸಾದ, ಆಯುಷ್ಮಾನ್',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'ಈ ಆಯುಷ್ಮಾನ್ ಕಾರ್ಡ್ ನಿಮಗೆ ಮತ್ತು ನಿಮ್ಮ ಕುಟುಂಬದ ಪ್ರತಿಯೊಬ್ಬ ಸದಸ್ಯರಿಗೆ ಆಯುಷ್ಮಾನ್ ಭಾರತ್ PMJAY ಯೋಜನೆಯಡಿ ವರ್ಷಕ್ಕೆ ರೂ. 5 ಲಕ್ಷದವರೆಗೆ ಉಚಿತ ಚಿಕಿತ್ಸೆ ಪಡೆಯಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
          eng: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'ಈ ಯೋಜನೆಯಡಿ ಚಿಕಿತ್ಸೆಗಾಗಿ ನೀವು ಯಾವುದೇ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಹಣ ಪಾವತಿಸುವ ಅಥವಾ ಠೇವಣಿ ಇಡುವ ಅಗತ್ಯವಿರುವುದಿಲ್ಲ.',
          eng: 'You are not required to pay/deposit any money at the AB PM-JAY empanelled hospital across India under Ayushman Bharat PM-JAY.'
        },
        {
          local: 'ದೂರುಗಳನ್ನು ಸಲ್ಲಿಸಲು ಅಥವಾ ನಿಮ್ಮ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳ ಬಗ್ಗೆ ತಿಳಿಯಲು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ. (ಉಚಿತ ಸಹಾಯವಾಣಿ ಸಂಖ್ಯೆ - 14555)',
          eng: 'For any help, to report a grievance or to know more about AB PM-JAY empanelled hospitals near you, please reach out to us. (Toll Free No - 14555)'
        }
      ],
      playStoreLocal: 'ಆಪ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ',
      contactLocal: 'ಸಂಪರ್ಕಿಸಿ',
      logonLocal: 'ವೆಬ್‌ಸೈಟ್',
      tollFree: '14555'
    },
    english: {
      headerLocal: 'Health Protection, Ayushman',
      headerEng: 'Health Protection for Every Family',
      points: [
        {
          local: 'This Ayushman card will help you in availing benefits of free hospitalization cover of Rs. 5 Lakhs per annum to you and your family collectively at any empanelled hospital across India under Ayushman Bharat PM-JAY.',
          eng: 'Access cashless treatment at any empanelled hospital across India.'
        },
        {
          local: 'You are not required to pay or deposit any money at the AB PM-JAY empanelled hospital across India.',
          eng: 'No pre-payment or deposit is required for treatment under this scheme.'
        },
        {
          local: 'For any help, to report a grievance or to know more about empanelled hospitals, contact us. Toll Free: 14555.',
          eng: 'Toll-Free Numbers: 14555 / 1800 111 565.'
        }
      ],
      playStoreLocal: 'Download the App',
      contactLocal: 'Contact Us',
      logonLocal: 'Log on to',
      tollFree: '14555'
    }
  };
  const backLd = BACK_CARD_LANGUAGES[cLang] || BACK_CARD_LANGUAGES.english;

  let frontCardBg = "url('/templates/ayushman/ayushman-front-blank.png')";
  try {
    const fs = require('fs');
    const path = require('path');
    const publicTemplate = path.join(process.cwd(), 'public', 'templates', 'ayushman', 'ayushman-front-blank.png');
    const newTemplateUpload = "C:\\Users\\NANO\\.gemini\\antigravity-ide\\brain\\5e023e96-6664-481b-9be3-9ed4b4f32bd6\\media__1783605292767.png";
    
    // Check if the public folder exists, if not create it
    const publicDir = path.dirname(publicTemplate);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // Permanently overwrite the old template with the brand new one the user just provided
    if (fs.existsSync(newTemplateUpload)) {
      fs.copyFileSync(newTemplateUpload, publicTemplate);
    }

    // Use the public template now that it's permanently copied
    if (fs.existsSync(publicTemplate)) {
      const base64 = fs.readFileSync(publicTemplate).toString('base64');
      frontCardBg = `url('data:image/png;base64,${base64}')`;
    }
  } catch(e) {}

  // ── FINAL HTML TEMPLATE ───────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'NotoSansCustom-Regular';
      src: url('data:font/ttf;base64,${localFontReg}') format('truetype');
      font-display: block;
    }
    @font-face {
      font-family: 'NotoSansCustom-Bold';
      src: url('data:font/ttf;base64,${localFontBold}') format('truetype');
      font-display: block;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      background: #cccccc;
      font-family: 'NotoSansCustom-Regular', Arial, sans-serif;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Card sizing and absolute canvas */
    .card-container {
      width: 1016px;
      height: 638px;
      position: relative;
      background: #ffffff;
      overflow: hidden;
      margin-bottom: 20px;
      border: 1px solid #aaaaaa;
    }

    #card-front {
      background-size: 100% 100%;
      background-repeat: no-repeat;
      /* The user's provided blank template image */
      background-image: ${frontCardBg};
    }

    #card-back {
      background: #ffffff;
      padding: 30px 55px 110px 55px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      border-radius: 22px;
      position: relative;
    }

    .back-header {
      height: 70px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      margin-bottom: 20px;
      z-index: 2;
    }

    .back-header-title {
      font-family: 'NotoSansCustom-Bold', sans-serif;
      font-size: 38px;
      font-weight: 700;
      color: #E86A08;
      line-height: 1.1;
    }

    .back-header-sub {
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #555555;
      margin-top: 2px;
    }

    .back-content-container {
      position: absolute;
      top: 120px;
      left: 55px;
      width: 906px; /* 1016px - 110px padding */
      height: 360px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 2;
    }

    .instruction-row {
      display: flex;
      align-items: flex-start;
    }

    .instruction-number {
      width: 35px;
      font-family: 'NotoSansCustom-Bold', sans-serif;
      font-weight: 700;
      font-size: 22px;
      color: #333333;
      flex-shrink: 0;
      text-align: left;
      line-height: 32px;
    }

    .instruction-text-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-grow: 1;
    }

    .instruction-local {
      font-family: 'NotoSansCustom-Regular', sans-serif;
      font-weight: 500;
      font-size: 20px;
      line-height: 28px;
      color: #333333;
      text-align: justify;
    }

    .instruction-eng {
      font-family: 'Inter', sans-serif;
      font-weight: 400;
      font-size: 18px;
      line-height: 24px;
      color: #555555;
      text-align: justify;
    }

    .back-footer {
      position: absolute;
      bottom: 25px;
      left: 55px;
      right: 55px;
      height: 90px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-top: 2px solid #E86A08;
      padding-top: 10px;
      z-index: 2;
    }

    .footer-left-play {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }

    .play-text-desc {
      display: flex;
      flex-direction: column;
      font-family: 'NotoSansCustom-Regular', sans-serif;
      font-size: 13px;
      color: #333333;
      font-weight: 600;
      line-height: 1.2;
    }

    .play-badge-button {
      display: flex;
      align-items: center;
      background: #000000;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
      width: 170px;
      height: 50px;
    }

    .play-badge-icon {
      margin-right: 8px;
      flex-shrink: 0;
    }

    .play-badge-text {
      display: flex;
      flex-direction: column;
    }

    .play-badge-sub {
      font-size: 8px;
      text-transform: uppercase;
      color: #aaaaaa;
      line-height: 1;
    }

    .play-badge-main {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
    }

    .footer-center-qr {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 75px;
    }

    .footer-qr-img {
      width: 75px;
      height: 75px;
      object-fit: contain;
      border: 1px solid #dddddd;
      background: #ffffff;
      padding: 2px;
    }

    .footer-right-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }

    .info-row {
      font-family: 'NotoSansCustom-Regular', sans-serif;
      font-size: 15px;
      color: #333333;
      line-height: 1.2;
    }

    .info-label {
      font-family: 'NotoSansCustom-Bold', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: #555555;
      margin-right: 6px;
    }

    .info-value {
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      color: #333333;
      font-weight: 700;
    }

    .info-link {
      font-family: 'Inter', sans-serif;
      color: #E86A08;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
    }

    /* --- ABSOLUTE OVERLAY DETAILS --- */
    .photo-container {
      position: absolute;
      left: 28px;
      top: 218px;
      width: 154px;
      height: 214px;
      border-radius: 2px;
      background: #ffffff;
      z-index: 5;
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 2px;
    }
    .photo-placeholder {
      width: 100%;
      height: 100%;
      background: transparent;
    }

    .qr-container {
      position: absolute;
      right: 30px;
      top: 260px;
      width: 125px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      z-index: 5;
    }
    .qr-img {
      width: 125px;
      height: 125px;
      object-fit: contain;
      image-rendering: pixelated;
      background: #ffffff;
    }
    
    /* Header and Scheme Titles */
    .header-title {
      position: absolute;
      right: 30px;
      top: 24px;
      color: #FFFFFF;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      text-align: right;
      z-index: 10;
      line-height: 1;
    }
    .header-title-local {
      font-size: 40px;
      font-weight: 700;
    }
    .header-title-eng {
      font-size: 36px;
      font-weight: 700;
    }

    .scheme-title-1 {
      position: absolute;
      right: 30px;
      top: 100px;
      color: #E86A08;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 62px;
      font-weight: 700;
      text-align: right;
      z-index: 10;
      line-height: 1;
    }
    
    .scheme-title-2 {
      position: absolute;
      right: 30px;
      top: 175px;
      color: #006B3C;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 48px;
      font-weight: 700;
      text-align: right;
      z-index: 10;
      line-height: 1;
    }

    /* Footer Texts */
    .footer-text-1 {
      position: absolute;
      left: 0;
      top: 588px;
      width: 1016px;
      color: #FFFFFF;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
      z-index: 10;
      line-height: 1;
    }

    .footer-text-2 {
      position: absolute;
      left: 0;
      top: 612px;
      width: 1016px;
      color: #FFFFFF;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-align: center;
      z-index: 10;
      line-height: 1;
    }

    .state-blk {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 4px;
    }
    .sl {
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #C96A18;
      text-align: right;
      line-height: 1.2;
    }
    .se {
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #111111;
      text-align: right;
      line-height: 1.2;
    }

    /* Typography Defaults */
    .field-label {
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #C96A18;
      white-space: nowrap;
      margin-right: 8px;
      line-height: 30px;
    }
    .field-value {
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: #111111;
      white-space: nowrap;
      text-rendering: optimizeLegibility;
      line-height: 30px;
    }
    
    .field-row {
      position: absolute;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      z-index: 5;
    }

    /* Details positioning exactly matching specification */
    .name-label {
      position: absolute;
      left: 210px;
      top: 215px;
      font-family: 'NotoSansCustom-Bold', Arial, sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #C96A18;
    }
    
    .name-val-row {
      position: absolute;
      left: 208px;
      top: 255px;
      width: 610px;
    }
    .name-val-row .field-value {
      font-size: 30px;
      line-height: 36px;
      white-space: normal;
    }

    .yob-row { left: 210px; top: 305px; width: 300px; }
    .gender-row { left: 520px; top: 305px; width: 300px; }
    .village-row { left: 210px; top: 345px; width: 580px; }
    .subdivision-row { left: 210px; top: 385px; width: 580px; }
    .district-row { left: 210px; top: 425px; width: 350px; }

    /* Bottom strip field positions */
    .mobile-row { left: 30px; top: 485px; width: 400px; }
    .pmjay-row { left: 450px; top: 485px; width: 500px; }
    .abha-row { left: 30px; top: 535px; width: 400px; }
    .ration-row { left: 450px; top: 535px; width: 500px; }

    /* Bottom strip field positions (old layout) */
    .old-abha-row { left: 30px; top: 510px; width: 400px; }
    .old-pmjay-row { left: 450px; top: 510px; width: 500px; }
  </style>
</head>
<body>

  <!-- FRONT CARD -->
  <div class="card-container" id="card-front">

    <!-- Header & Footer Text (Dynamic Local Language) -->
    <div class="header-title">
      <span class="header-title-local">${ld.title} / </span><span class="header-title-eng">AYUSHMAN CARD</span>
    </div>
    <div class="scheme-title-1">${ld.l1}</div>
    <div class="scheme-title-2">${ld.l2}</div>

    <div class="footer-text-1">${ld.footL}</div>
    <div class="footer-text-2">AYUSHMAN BHARAT PRADHAN MANTRI JAN AROGYA YOJANA</div>

    <!-- Candidate Overlays -->
    <div class="photo-container">
      ${photoBase64 ? `<img src="${photoBase64}" class="photo-img" alt=""/>` : '<div class="photo-placeholder"></div>'}
    </div>

    <div class="qr-container">
      ${qrBase64 ? `<img src="${qrBase64}" class="qr-img" alt="QR"/>` : ''}
      <div class="state-blk">
        <div class="sl">${ld.stLbl}: ${state.charAt(0)+state.slice(1).toLowerCase()}</div>
        <div class="se">State: ${state}</div>
      </div>
    </div>

    <!-- Text Fields -->
    <div class="name-label">${labels.name || 'નામ / NAME :'}</div>
    <div class="name-val-row">
      <span class="field-value" id="nv">${name}</span>
    </div>

    ${!isOldLayout ? `
      <div class="field-row yob-row">
        <span class="field-label">${labels.yob || 'જન્મ વર્ષ / YOB :'}</span>
        <span class="field-value">${dob}</span>
      </div>
      <div class="field-row gender-row">
        <span class="field-label">${labels.gender || 'જાતિ / GENDER :'}</span>
        <span class="field-value">${gender}</span>
      </div>
      
      <div class="field-row village-row">
        <span class="field-label">${labels.village || 'ગામ/વાર્ડ / Village/Ward :'}</span>
        <span class="field-value">${village}</span>
      </div>
      <div class="field-row subdivision-row">
        <span class="field-label">${labels.subdivision || 'તાલુકો/શહેર / Subdivision/Town :'}</span>
        <span class="field-value">${subdivision}</span>
      </div>
      <div class="field-row district-row">
        <span class="field-label">${labels.district || 'જિલ્લા / District :'}</span>
        <span class="field-value">${district}</span>
      </div>
    ` : ''}

    ${isOldLayout ? `
      <div class="field-row yob-row">
        <span class="field-label">${labels.yob || 'જન્મ વર્ષ / YOB :'}</span>
        <span class="field-value">${dob}</span>
      </div>
      <div class="field-row gender-row">
        <span class="field-label">${labels.gender || 'જાતિ / GENDER :'}</span>
        <span class="field-value">${gender}</span>
      </div>
    ` : ''}

    ${!isOldLayout ? `
      <div class="field-row mobile-row">
        <span class="field-label">${labels.mobile || 'Mobile :'}</span>
        <span class="field-value">${mobile}</span>
      </div>
      <div class="field-row pmjay-row">
        <span class="field-label">${labels.pmjay || 'PM-JAY ID :'}</span>
        <span class="field-value" style="color:#005C2E;">${pmjayId}</span>
      </div>
      <div class="field-row abha-row">
        <span class="field-label">${labels.abha || 'ABHA Number :'}</span>
        <span class="field-value">${abhaNumber}</span>
      </div>
      <div class="field-row ration-row">
        <span class="field-label">${labels.ration || 'Ration/Other ID :'}</span>
        <span class="field-value">${rationId}</span>
      </div>
    ` : `
      <div class="field-row old-abha-row">
        <span class="field-label">${labels.abha || 'ABHA Number :'}</span>
        <span class="field-value">${abhaNumber}</span>
      </div>
      <div class="field-row old-pmjay-row">
        <span class="field-label">${labels.pmjay || 'PM-JAY ID :'}</span>
        <span class="field-value" style="color:#005C2E;">${pmjayId}</span>
      </div>
    `}
  </div>

  <!-- BACK CARD -->
  <div class="card-container" id="card-back">
    <!-- SVG Watermark in the background -->
    <svg width="220" height="220" viewBox="0 0 100 100" fill="none" stroke="#22c55e" stroke-width="1.2" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0.05; pointer-events: none; z-index: 1;">
      <circle cx="50" cy="50" r="45" stroke="#22c55e" stroke-width="1.2"/>
      <circle cx="50" cy="50" r="40" stroke="#f97316" stroke-dasharray="2,2"/>
      <path d="M 50 15 C 40 30, 40 45, 50 50 C 60 45, 60 30, 50 15 Z" fill="#22c55e" opacity="0.3"/>
      <path d="M 50 85 C 40 70, 40 55, 50 50 C 60 55, 60 70, 50 85 Z" fill="#22c55e" opacity="0.3"/>
      <path d="M 15 50 C 30 40, 45 40, 50 50 C 45 60, 30 60, 15 50 Z" fill="#22c55e" opacity="0.3"/>
      <path d="M 85 50 C 70 40, 55 40, 50 50 C 55 60, 70 60, 85 50 Z" fill="#22c55e" opacity="0.3"/>
      <path d="M 45 50 L 55 50 M 50 45 L 50 55" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/>
    </svg>

    <!-- Header -->
    <div class="back-header">
      <div class="back-header-title">${backLd.headerLocal}</div>
      <div class="back-header-sub">${backLd.headerEng}</div>
    </div>

    <!-- Main Content Container -->
    <div class="back-content-container">
      ${backLd.points.map((pt, idx) => `
        <div class="instruction-row">
          <div class="instruction-number">${idx + 1}.</div>
          <div class="instruction-text-block">
            <div class="instruction-local">${pt.local}</div>
            <div class="instruction-eng">${pt.eng}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <div class="back-footer">
      <!-- Google Play Badge -->
      <div class="footer-left-play">
        <div class="play-text-desc">
          <span>Please download the App /</span>
          <span>${backLd.playStoreLocal}</span>
        </div>
        <div class="play-badge-button">
          <!-- Play Store Icon Vector -->
          <svg class="play-badge-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#00E5FF" d="M17.5 12L3 21V3l14.5 9z"/>
            <path fill="#FFEB3B" d="M17.5 12L3 3v18l14.5-9z" opacity=".15"/>
            <path fill="#1DE9B6" d="M17.5 12L21 9.5l-3.5 2.5z"/>
            <path fill="#FF3D00" d="M17.5 12L21 14.5l-3.5-2.5z"/>
          </svg>
          <div class="play-badge-text">
            <span class="play-badge-sub">Get it on</span>
            <span class="play-badge-main">Google Play</span>
          </div>
        </div>
      </div>

      <!-- QR Code -->
      <div class="footer-center-qr">
        ${backQrBase64 ? `<img src="${backQrBase64}" class="footer-qr-img" alt="PMJAY QR"/>` : ''}
      </div>

      <!-- Contact Info -->
      <div class="footer-right-info">
        <div class="info-row">
          <span class="info-label">${backLd.contactLocal} / Please contact:</span>
          <span class="info-value" style="color: #E86A08;">${backLd.tollFree}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${backLd.logonLocal} / or log on to:</span>
          <a class="info-link" href="https://pmjay.gov.in" target="_blank">https://pmjay.gov.in</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.fitText = function () {
      // Auto shrink name value to avoid overflow
      (function() {
        var el = document.getElementById('nv');
        if (!el) return;
        var mw = 610;
        var mh = 72;
        var fs = 30;
        el.style.fontSize = fs + 'px';
        while (fs > 24 && (el.scrollWidth > mw || el.scrollHeight > mh)) {
          fs -= 0.5;
          el.style.fontSize = fs + 'px';
        }
      })();

      // Auto shrink other single line field values
      var fitSingleLine = (selector, maxW, initialSize) => {
        var elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.id === 'nv') return; // Skip name
          var size = initialSize;
          el.style.fontSize = size + 'px';
          while (el.scrollWidth > maxW && size > 12) {
            size -= 0.5;
            el.style.fontSize = size + 'px';
          }
        });
      };

      fitSingleLine('.field-value:not(#nv)', 300, 24);
    };
  </script>
</body>
</html>`;
}

function generateAbhaPVCHTML(params: any): string {
  const frontCardSrc = params.frontCardBase64 || '';
  const backCardSrc = params.backCardBase64 || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #ffffff; }

    .card-container {
      width: 1013px;
      height: 638px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .card-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>

  <!-- FRONT CARD -->
  <div class="card-container" id="card-front">
    <img src="${frontCardSrc}" class="card-img" />
  </div>

  <!-- BACK CARD -->
  <div class="card-container" id="card-back">
    <img src="${backCardSrc}" class="card-img" />
  </div>

</body>
</html>`;
}

function generatePanPVCHTML(params: any): string {
  const frontCardSrc = params.frontCardBase64 || '';
  const backCardSrc = params.backCardBase64 || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #ffffff; }

    .card-container {
      width: 1013px;
      height: 638px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
    }

    .card-img {
      width: 1013px;
      height: 638px;
      object-fit: fill;
      display: block;
    }
  </style>
</head>
<body>

  <!-- FRONT CARD -->
  <div class="card-container" id="card-front">
    <img src="${frontCardSrc}" class="card-img" />
  </div>

  <!-- BACK CARD -->
  <div class="card-container" id="card-back">
    <img src="${backCardSrc}" class="card-img" />
  </div>

</body>
</html>`;
}

function generateEshramPVCHTML(params: any): string {
  const photoSrc = params.photoBase64 || '';
  const name = params.name || '';
  const dob = params.dob || '';
  const gender = params.gender || '';
  const uan = params.documentNumber || '';
  const mobile = params.mobile || '';
  const address = params.address || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: '${params.localFontFamily}-Regular';
      src: url('data:font/${params.localFontType};base64,${params.localFontReg}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: '${params.localFontFamily}-Bold';
      src: url('data:font/${params.localFontType};base64,${params.localFontBold}') format('truetype');
      font-weight: bold;
      font-style: normal;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #ffffff; }

    .card-container {
      width: 1013px;
      height: 638px;
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid #cbd5e1;
      margin-bottom: 20px;
      font-family: '${params.localFontFamily}-Regular', sans-serif;
    }

    #card-front {
      background: linear-gradient(180deg, #fff3e0 0%, #ffffff 50%, #e8f5e9 100%);
    }

    #card-back {
      background: linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%);
    }

    .header-bar {
      width: 100%;
      height: 95px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 40px;
      border-top-left-radius: 22px;
      border-top-right-radius: 22px;
      border-bottom: 4px solid #f97316;
    }

    .header-title {
      font-family: '${params.localFontFamily}-Bold';
      font-size: 20px;
      letter-spacing: 0.5px;
    }

    .header-sub {
      font-size: 13px;
      opacity: 0.8;
    }

    .photo-container {
      position: absolute;
      left: 50px;
      top: 140px;
      width: 190px;
      height: 230px;
      border: 2px solid #ea580c;
      background: #ffffff;
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .details-container {
      position: absolute;
      left: 270px;
      top: 140px;
      width: 700px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .field-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #ffe0b2;
      padding-bottom: 5px;
    }

    .field-label {
      width: 180px;
      font-size: 15px;
      font-weight: bold;
      color: #c2410c;
    }

    .field-value {
      font-family: '${params.localFontFamily}-Bold';
      font-size: 18px;
      color: #1e293b;
      text-transform: uppercase;
    }

    .uan-box {
      position: absolute;
      left: 50px;
      bottom: 45px;
      width: 913px;
      background-color: #ea580c;
      color: #ffffff;
      padding: 15px 0;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
    }

    .uan-label {
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.9;
    }

    .uan-value {
      font-family: '${params.localFontFamily}-Bold';
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 4px;
    }

    .back-content {
      padding: 40px 50px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .back-header {
      font-size: 18px;
      font-weight: bold;
      color: #ea580c;
      border-bottom: 2px solid #ffd8a8;
      padding-bottom: 5px;
    }

    .back-details {
      margin-top: 15px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  </style>
</head>
<body>

  <!-- FRONT CARD -->
  <div class="card-container" id="card-front">
    <div class="header-bar">
      <div>
        <div class="header-title">e-Shram (ई-श्रम)</div>
        <div class="header-sub">असंगठित कामगारों का राष्ट्रीय डेटाबेस / National Database of Unorganised Workers</div>
      </div>
      <div style="font-size: 24px; font-weight: bold; color: #f97316;">e-Shram</div>
    </div>

    <div class="photo-container">
      ${photoSrc ? `<img src="${photoSrc}" class="photo-img" />` : '<div style="width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">PHOTO</div>'}
    </div>

    <div class="details-container">
      <div class="field-row">
        <div class="field-label">नाम / Name:</div>
        <div class="field-value">${name}</div>
      </div>
      <div class="field-row">
        <div class="field-label">जन्म तिथि / DOB:</div>
        <div class="field-value">${dob}</div>
      </div>
      <div class="field-row">
        <div class="field-label">लिंग / Gender:</div>
        <div class="field-value">${gender}</div>
      </div>
    </div>

    <div class="uan-box">
      <div class="uan-label">Universal Account Number (UAN) / सार्वभौमिक खाता संख्या (यूएएन)</div>
      <div class="uan-value">${uan}</div>
    </div>
  </div>

  <!-- BACK CARD -->
  <div class="card-container" id="card-back">
    <div class="back-content">
      <div>
        <div class="back-header">अतिरिक्त विवरण / Additional Details</div>
        <div class="back-details">
          <div class="field-row">
            <div class="field-label" style="width:220px;">मोबाइल नंबर / Mobile:</div>
            <div class="field-value">${mobile}</div>
          </div>
          <div class="field-row">
            <div class="field-label" style="width:220px;">पता / Address:</div>
            <div class="field-value" style="font-size: 16px; word-break: break-word; text-transform:none;">${address}</div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ffd8a8; padding-top: 15px; font-size: 13px; color: #4b5563;">
        <div>Ministry of Labour & Employment &bull; Govt. of India</div>
        <div>PROPVC TOOL</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

function generateCroppedVoterPVCHTML(params: any): string {
  const frontCardSrc = params.frontCardBase64 || '';
  const backCardSrc = params.backCardBase64 || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #ffffff; }

    .card-container {
      width: 1013px;
      height: 638px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .card-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  </style>
</head>
<body>

  <!-- FRONT CARD -->
  <div class="card-container" id="card-front">
    <img src="${frontCardSrc}" class="card-img" />
  </div>

  <!-- BACK CARD -->
  <div class="card-container" id="card-back">
    <img src="${backCardSrc}" class="card-img" />
  </div>

</body>
</html>`;
}

function generateVoterPVCHTML(params: any): string {
  const photoSrc = params.photoBase64 || '';
  const qrSrc = params.qrBase64 || '';
  const signatureSrc = params.signatureBase64 || '';
  const name = params.name || '';
  const localName = params.localName || '';
  const fatherName = params.fatherName || '';
  const fatherNameLocal = params.fatherNameLocal || '';
  const dob = params.dob || '';
  const gender = params.gender || '';
  const epicNumber = params.documentNumber || '';
  const address = params.address || '';
  const localAddress = params.localAddress || '';
  const assemblyConstituency = params.assemblyConstituency || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: '${params.localFontFamily}-Regular';
      src: url('data:font/${params.localFontType};base64,${params.localFontReg}') format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: '${params.localFontFamily}-Bold';
      src: url('data:font/${params.localFontType};base64,${params.localFontBold}') format('truetype');
      font-weight: bold;
      font-style: normal;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { margin: 0; padding: 0; background: #ffffff; }

    .card-container {
      width: 1013px;
      height: 638px;
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid #cbd5e1;
      margin-bottom: 20px;
      font-family: '${params.localFontFamily}-Regular', sans-serif;
      background: #ffffff;
    }

    #card-front {
      background: linear-gradient(180deg, #fff3e0 0%, #ffffff 50%, #e8f5e9 100%);
    }

    #card-back {
      background: linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%);
    }

    .header-banner {
      width: 100%;
      height: 85px;
      background: linear-gradient(90deg, #ff9933 0%, #ffffff 50%, #128807 100%);
      border-bottom: 3px solid #000080;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 0 20px;
      color: #000080;
    }

    .header-title-hindi {
      font-family: '${params.localFontFamily}-Bold', sans-serif;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }

    .header-title-english {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .eci-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      height: 320px;
      opacity: 0.06;
      pointer-events: none;
      z-index: 1;
    }

    .card-body {
      padding: 20px 40px;
      display: flex;
      gap: 30px;
      z-index: 2;
      position: relative;
    }

    .photo-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }

    .photo-box {
      width: 180px;
      height: 220px;
      border: 3px solid #000080;
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .epic-badge {
      background: #000080;
      color: #ffffff;
      font-family: '${params.localFontFamily}-Bold', sans-serif;
      font-size: 22px;
      padding: 8px 16px;
      border-radius: 8px;
      letter-spacing: 2px;
      text-align: center;
      font-weight: bold;
      width: 240px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      margin-top: 15px;
    }

    .details-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field-block {
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 6px;
    }

    .field-label {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
    }

    .field-val-local {
      font-family: '${params.localFontFamily}-Bold', sans-serif;
      font-size: 20px;
      color: #0f172a;
      line-height: 1.3;
    }

    .field-val-eng {
      font-size: 18px;
      color: #1e293b;
      font-weight: bold;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .meta-row {
      display: flex;
      gap: 20px;
      margin-top: 5px;
    }

    .back-header {
      width: 100%;
      height: 50px;
      background: #000080;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .back-body {
      padding: 25px 40px;
      height: calc(100% - 50px);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 2;
      position: relative;
    }

    .ac-block {
      background: #f1f5f9;
      border-left: 5px solid #ff9933;
      padding: 10px 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .ac-label {
      font-size: 12px;
      color: #475569;
      font-weight: bold;
    }

    .ac-value {
      font-family: '${params.localFontFamily}-Bold', sans-serif;
      font-size: 18px;
      color: #0f172a;
    }

    .address-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .address-title {
      font-size: 13px;
      color: #475569;
      font-weight: bold;
    }

    .address-text-local {
      font-family: '${params.localFontFamily}-Regular', sans-serif;
      font-size: 16px;
      color: #0f172a;
      line-height: 1.4;
    }

    .address-text-eng {
      font-size: 15px;
      color: #334155;
      line-height: 1.4;
    }

    .bottom-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
    }

    .officer-signature {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }

    .sig-line {
      width: 150px;
      height: 45px;
      border-bottom: 1px solid #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sig-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .sig-label {
      font-size: 11px;
      color: #64748b;
      font-weight: bold;
      text-align: center;
    }

    .card-footer-strip {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 15px;
      background: linear-gradient(90deg, #ff9933 0%, #ffffff 50%, #128807 100%);
      border-top: 1px solid #000080;
    }

    .seal-svg {
      fill: #000080;
    }
  </style>
</head>
<body>

  <!-- FRONT CARD -->
  <div class="card-container" id="card-front">
    <div class="header-banner">
      <div class="header-title-hindi">भारत निर्वाचन आयोग</div>
      <div class="header-title-english">Election Commission of India</div>
    </div>

    <!-- Background Watermark Emblem -->
    <svg class="eci-watermark" viewBox="0 0 100 100">
      <path class="seal-svg" d="M50,5 C30,5 25,25 25,45 C25,65 35,80 50,95 C65,80 75,65 75,45 C75,25 70,5 50,5 Z M50,15 C60,25 65,40 65,50 C65,60 55,75 50,85 C45,75 35,60 35,50 C35,40 40,25 50,15 Z" />
    </svg>

    <div class="card-body">
      <div class="photo-area">
        <div class="photo-box">
          ${photoSrc ? `<img src="${photoSrc}" class="photo-img" />` : '<div style="width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px">PHOTO</div>'}
        </div>
        <div class="epic-badge">${epicNumber}</div>
      </div>

      <div class="details-area">
        <div class="field-block">
          <div class="field-label">नाम / Name</div>
          ${localName ? `<div class="field-val-local">${localName}</div>` : ''}
          <div class="field-val-eng">${name}</div>
        </div>

        <div class="field-block">
          <div class="field-label">पिता का नाम / Father's Name</div>
          ${fatherNameLocal ? `<div class="field-val-local">${fatherNameLocal}</div>` : ''}
          <div class="field-val-eng">${fatherName}</div>
        </div>

        <div class="meta-row">
          <div class="field-block" style="flex: 1;">
            <div class="field-label">लिंग / Gender</div>
            <div class="field-val-eng">${gender}</div>
          </div>
          <div class="field-block" style="flex: 1.5;">
            <div class="field-label">जन्म तिथि / आयु / DOB / Age</div>
            <div class="field-val-eng">${dob}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="card-footer-strip"></div>
  </div>

  <!-- BACK CARD -->
  <div class="card-container" id="card-back">
    <div class="back-header">
      मतदाता फोटो पहचान पत्र / ELECTOR PHOTO IDENTITY CARD
    </div>

    <!-- Background Watermark Emblem -->
    <svg class="eci-watermark" viewBox="0 0 100 100">
      <path class="seal-svg" d="M50,5 C30,5 25,25 25,45 C25,65 35,80 50,95 C65,80 75,65 75,45 C75,25 70,5 50,5 Z M50,15 C60,25 65,40 65,50 C65,60 55,75 50,85 C45,75 35,60 35,50 C35,40 40,25 50,15 Z" />
    </svg>

    <div class="back-body">
      <div>
        ${assemblyConstituency ? `
        <div class="ac-block">
          <div class="ac-label">विधानसभा निर्वाचन क्षेत्र का नाम और संख्या / Assembly Constituency</div>
          <div class="ac-value">${assemblyConstituency}</div>
        </div>` : ''}

        <div class="address-block">
          <div class="address-title">पता / Address :</div>
          ${localAddress ? `<div class="address-text-local">${localAddress}</div>` : ''}
          <div class="address-text-eng">${address}</div>
        </div>
      </div>

      <div class="bottom-meta">
        <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 4px;">
          <div>EPIC No. : <strong>${epicNumber}</strong></div>
          ${qrSrc ? `<div style="margin-top: 5px;"><img src="${qrSrc}" style="width: 80px; height: 80px;" /></div>` : ''}
        </div>

        <div class="officer-signature">
          <div class="sig-line">
            ${signatureSrc ? `<img src="${signatureSrc}" class="sig-img" />` : ''}
          </div>
          <div class="sig-label">
            निर्वाचक रजिस्ट्रीकरण अधिकारी<br>
            Electoral Registration Officer
          </div>
        </div>
      </div>
    </div>
    <div class="card-footer-strip"></div>
  </div>

</body>
</html>`;
}
