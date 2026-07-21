// Dynamic Supabase import happens inside functions to allow standalone unit testing

// ============================================================================
// INITIAL MARATHI DICTIONARY (Based on Prompt Requirements)
// ============================================================================

export const COMMON_GOVERNMENT_WORDS = [
  // Core address terms
  'पत्ता', 'निवासी', 'कायमचा', 'सध्याचा', 'वर्तमान', 'घरचा', 'पत्त्याचा', 'पुरावा', 
  'रहिवासी', 'राहणार', 'घर', 'क्रमांक', 'फ्लॅट', 'खोली', 'इमारत', 'अपार्टमेंट', 
  'सोसायटी', 'कॉलनी', 'नगर', 'विहार', 'कॉम्प्लेक्स', 'टॉवर', 'विंग', 'ब्लॉक', 
  'मजला', 'प्लॉट', 'सर्वे', 'गट', 'मालमत्ता', 'दुकान', 'कार्यालय', 
  // Streets and locations
  'रस्ता', 'मुख्य', 'गल्ली', 'लेन', 'चौक', 'सर्कल', 'क्रॉस', 'रोड', 'महामार्ग', 
  'रिंग', 'बायपास', 'जवळ', 'समोर', 'मागे', 'बाजूला', 'ओळखचिन्ह', 'परिसर', 
  // Geography
  'गाव', 'तालुका', 'तहसील', 'जिल्हा', 'शहर', 'राज्य', 'देश', 
  // Places
  'पोस्ट', 'टपाल', 'पोलीस', 'ठाणे', 'रेल्वे', 'स्थानक', 'बस', 
  // Numbers / Directions
  'पिन', 'कोड', 'प्रभाग', 'सेक्टर', 'फेज', 'पूर्व', 'पश्चिम', 'उत्तर', 'दक्षिण',
  // Hindi Address and General Terms
  'पता', 'स्थायी', 'आवासीय', 'का', 'पते', 'प्रमाण', 'रहने', 'वाला', 'मकान', 'नंबर', 'कमरा', 
  'फ्लैट', 'सोसाइटी', 'कॉलोनी', 'कॉम्प्लेक्स', 'टावर', 'मंजिल', 'दरवाजा', 'संपत्ति', 
  'खसरा', 'खाता', 'वार्ड', 'क्षेत्र', 'इलाका', 'स्थानीय', 'मोहल्ला', 'बस्ती', 'एन्क्लेव', 
  'एक्सटेंशन', 'कैंप', 'गाँव', 'ग्राम', 'पंचायत', 'डाक', 'डाकघर', 'सड़क', 'गली', 'मार्ग', 
  'पथ', 'चौराहा', 'राजमार्ग', 'राष्ट्रीय', 'के', 'पास', 'सामने', 'पीछे', 'बगल', 'में', 
  'ऊपर', 'नीचे', 'बाईं', 'ओर', 'दाईं', 'पहचान', 'चिन्ह', 'निकटतम', 'स्टैंड', 'हवाई', 'अड्डा', 
  'अस्पताल', 'स्कूल', 'कॉलेज', 'मंदिर', 'मस्जिद', 'चर्च', 'गुरुद्वारा', 'बाजार', 'मॉल', 'बैंक', 
  'एटीएम', 'थाना', 'चौकी', 'अग्निशमन', 'केंद्र', 'पेट्रोल', 'पंप', 'बगीचा', 'पार्क', 'झील', 
  'नदी', 'पुल', 'नहर', 'फाटक', 'गेट', 'द्वार', 'की', 'उप-जिला', 'जिला', 'कस्बा'
];

export const COMMON_NAMES = [
  // General Prefixes/Titles
  'श्री', 'श्रीमती', 'कुमार', 'कुमारी', 'पाटील', 'देशमुख', 'कांबळे', 'कदम',
  'शिंदे', 'पवार', 'जाधव', 'गायकवाड', 'काळे', 'जोशी', 'कुलकर्णी',
  // Common Name Components (Roots/Suffixes)
  'आनंद', 'दीप', 'किरण', 'प्रेम', 'जय', 'विजय', 'शिव', 'राज', 'चंद्र', 'देव', 
  'लक्ष्मी', 'सुमन', 'रत्न', 'रूप', 'आशा', 'स्नेह', 'शुभ', 'यश', 'तेज', 'मन',
  'लाल', 'राम', 'नाथ', 'दास', 'प्रसाद', 'शंकर', 'मोहन', 'कृष्ण', 'वीर', 'पाल',
  'सिंह', 'प्रताप', 'जीत', 'मणि', 'करण', 'शील', 'प्रकाश', 'भूषण', 'नंदन', 'वर्धन',
  'वंत', 'ईश्वर', 'नारायण', 'दत्त', 'शरण', 'रंजन', 'लोचन', 'वल्लभ', 'शेखर', 'धीर',
  'मित्र', 'हरी', 'धर', 'धरन', 'ऋषि', 'नील', 'कांत', 'मान', 'वान', 'मय', 'मीत',
  'अंश', 'आयुष', 'धर्म', 'सत्य', 'हरि', 'सूर्य', 'चंद', 'देवी', 'बाई', 'रानी',
  'श्री', 'प्रिया', 'लता', 'माला', 'ज्योति', 'रेखा', 'माया', 'कला', 'लीला', 'वती',
  'वंती', 'सुंदरी', 'तारा', 'कांति', 'मंजरी', 'नंदा', 'अंजली', 'वाणी', 'सुता',
  'कली', 'कौर', 'बेगम', 'जान', 'बानो', 'खातून', 'आरा', 'निशा', 'सखी', 'मोहिनी',
  'राधा', 'मीना', 'उषा', 'बाला', 'अंजना', 'शिला', 'मती', 'धारा', 'गंगा', 'सरिता',
  'रश्मि', 'नूर', 'परी', 'इशा', 'अदा', 'महक', 'खुशबू', 'सना', 'फातिमा', 'ज़ारा',
  // Male Names
  'शिवानंद', 'प्रदीप', 'रविकिरण', 'प्रेमनाथ', 'जयदेव', 'विजयकुमार', 'शिवनाथ', 
  'राजेंद्र', 'चंद्रकांत', 'देवेंद्र', 'लक्ष्मण', 'सुमंत', 'रत्नाकर', 'रूपेश', 
  'आशुतोष', 'स्नेहल', 'शुभम', 'यशवंत', 'तेजस', 'मनोहर', 'राजकुमार', 'अजयकुमार',
  'मोहनलाल', 'गोपाललाल', 'राधेलाल', 'रामकुमार', 'रामप्रसाद', 'रामेश्वर', 'राजेश',
  'शिवराज', 'महादेव', 'देवकुमार', 'सोमनाथ', 'जगन्नाथ', 'रघुनाथ', 'रामदास', 'हरिदास',
  'गोविंददास', 'शिवप्रसाद', 'दुर्गाप्रसाद', 'रामचंद्र', 'राजचंद्र', 'शशिचंद्र',
  'शिवशंकर', 'उमाशंकर', 'रामशंकर', 'मनमोहन', 'घनश्याममोहन', 'रामकृष्ण', 'देवकृष्ण',
  'घनकृष्ण', 'रणवीर', 'महावीर', 'बलवीर', 'गोपाल', 'जयपाल', 'धर्मपाल', 'रणसिंह',
  'वीरसिंह', 'प्रतापसिंह', 'वीरप्रताप', 'रामप्रताप', 'सूर्यप्रताप', 'रणजीत', 'मनजीत',
  'हरजीत', 'रत्नमणि', 'शिवमणि', 'प्रेममणि', 'राजकरण', 'देवकरण', 'सूर्यकरण', 'सुशील',
  'विनयशील', 'धर्मशील', 'जयप्रकाश', 'रामप्रकाश', 'सूर्यप्रकाश', 'कुलभूषण', 'विभूषण',
  'राजभूषण', 'चंदनंदन', 'शिवनंदन', 'रामनंदन', 'परमानंद', 'प्रेमानंद', 'जयवर्धन',
  'धनवर्धन', 'यशवर्धन', 'गुणवंत', 'बलवंत', 'महेश्वर', 'परमेश्वर', 'जगदीश्वर',
  'लक्ष्मीनारायण', 'सत्यनारायण', 'बद्रीनारायण', 'श्रीदत्त', 'देवदत्त', 'हरिदत्त',
  'रामशरण', 'हरिशरण', 'शिवशरण', 'शरणकुमार', 'शरणजीत', 'मनोरंजन', 'निरंजन', 'रसरंजन',
  'राजलोचन', 'कमललोचन', 'चंद्रलोचन', 'कृष्णवल्लभ', 'देववल्लभ', 'चंद्रशेखर', 'राजशेखर',
  'हिमशेखर', 'तेजपाल', 'तेजप्रताप', 'तेजवीर', 'रणधीर', 'बलधीर', 'धर्मधीर', 'देवमित्र',
  'लोकमित्र', 'बिहारी', 'गिरधारी', 'बनवारी', 'धनधर', 'गंगाधर', 'शशिधर', 'विश्वधरण',
  'भूधरन', 'महर्षि', 'देवर्षि', 'राजर्षि', 'सुनील', 'अनिल', 'नीलकंठ', 'शशिकांत',
  'रविकांत', 'जयकांत', 'सुरेश', 'महेश', 'नरेंद्र', 'हनुमान', 'बलवान', 'धनवान',
  'गुणवान', 'आनंदमय', 'चिन्मय', 'प्रेममय', 'मनमीत', 'हरमीत', 'रणमीत', 'कुलदीप',
  'रणदीप', 'देवांश', 'युवांश', 'शिवांश', 'आयुष्मान', 'देवायुष', 'यशपाल', 'यशराज',
  'धर्मेंद्र', 'धर्मवीर', 'सत्यपाल', 'सत्येंद्र', 'सत्यवीर', 'प्रेमचंद', 'प्रेमपाल',
  'शिवकुमार', 'हरिनाथ', 'सूर्यकांत', 'सूर्यपाल', 'सूर्यदेव', 'हरिचंद', 'रामचंद',
  // Female Names
  'प्रियानंदा', 'संदीपा', 'स्नेहकिरण', 'प्रेमलता', 'जयश्री', 'विजयलक्ष्मी', 'शिवानी',
  'राजश्री', 'चंद्रकला', 'देवयानी', 'लक्ष्मीबाई', 'सुमनताई', 'रत्नमाला', 'रूपाली',
  'स्नेहप्रिया', 'शुभांगी', 'यशश्री', 'तेजस्विनी', 'मनिषा', 'लक्ष्मीदेवी', 'सरस्वतीदेवी',
  'दुर्गादेवी', 'राधाबाई', 'पार्वतीबाई', 'राजकुमारी', 'देवकुमारी', 'चंद्रकुमारी',
  'लक्ष्मीरानी', 'सोनारानी', 'राजरानी', 'राजलक्ष्मी', 'धनलक्ष्मी', 'लक्ष्मीश्री',
  'जयप्रिया', 'देवप्रिया', 'सुनीलता', 'आशालता', 'पुष्पमाला', 'प्रेममाला', 'दीपज्योति',
  'आशाज्योति', 'शुभज्योति', 'शुभरेखा', 'चित्ररेखा', 'प्रेमरेखा', 'प्रेममाया', 'स्नेहमाया',
  'राधामाया', 'रूपकला', 'श्यामकला', 'राधालीला', 'प्रेमलीला', 'मधुलीला', 'गुणवती',
  'भाग्यवती', 'यशवती', 'जयवंती', 'रत्नवंती', 'गुणवंती', 'राजसुंदरी', 'रूपसुंदरी',
  'मनसुंदरी', 'चंद्रतारा', 'शुभतारा', 'राजतारा', 'जयकांति', 'रूपकांति', 'शशिकांति',
  'पुष्पमंजरी', 'रसमंजरी', 'कलामंजरी', 'आनंदनंदा', 'यशनंदा', 'शिवनंदा', 'पुष्पांजलि',
  'श्रद्धांजलि', 'प्रेमांजलि', 'मधुवाणी', 'रसवाणी', 'देववाणी', 'रूपरानी', 'देवसुता',
  'राजसुता', 'धर्मसुता', 'चमेली', 'गुलाबकली', 'चाँदरानी', 'फूलरानी', 'हरप्रीत',
  'मनप्रीत', 'नूरबेगम', 'शाहीबेगम', 'नूरजान', 'गुलजान', 'नसीमबानो', 'शबनमबानो',
  'नूरखातून', 'जरीनखातून', 'नाज़आरा', 'गुलआरा', 'रजनीशा', 'प्रेमनिशा', 'मधुआशा',
  'प्रेमआशा', 'प्रियसखी', 'प्रेमसखी', 'मनमोहिनी', 'रूपमोहिनी', 'कृष्णराधा', 'श्यामराधा',
  'नवरमीना', 'चंद्रमीना', 'अरुणउषा', 'प्रेमउषा', 'फूलकली', 'गुलकली', 'राजबाला',
  'रूपबाला', 'चंद्रबाला', 'शुभांजना', 'देवांजना', 'सुशीला', 'कमला', 'धनवती', 'रूपवती',
  'सुमति', 'शुभमति', 'प्रेममति', 'प्रेमधारा', 'सुधाधारा', 'ज्ञानधारा', 'देवगंगा',
  'शुभगंगा', 'प्रेमसरिता', 'ज्ञानसरिता', 'सूर्यरश्मि', 'चंद्ररश्मि', 'सूर्यकिरण',
  'आशाकिरण', 'चांदनूर', 'शबनमनूर', 'सोनपरी', 'रूपपरी', 'चांदपरी', 'देवइशा', 'प्रेमइशा',
  'नूरअदा', 'गुलअदा', 'फूलमहक', 'गुलमहक', 'फूलखुशबू', 'गुलखुशबू', 'नूरसना', 'गुलसना',
  'नूरफातिमा', 'गुलफातिमा', 'नूरज़ारा', 'गुलज़ारा'
];

// All correct target words
const CORRECT_TARGET_WORDS = [...new Set([...COMMON_GOVERNMENT_WORDS, ...COMMON_NAMES])];

// ============================================================================
// CORRUPTION GENERATION ALGORITHM
// ============================================================================

/**
 * Generates all likely corrupted variations of a correct word
 * by dropping halants, dropping consonants from conjuncts, or dropping entire conjuncts.
 */
export function generateCorruptions(word: string): Set<string> {
  const results = new Set<string>();

  // Rule 1: Remove all halants (\u094D)
  const noHalants = word.replace(/\u094D/g, '');
  if (noHalants !== word) {
    results.add(noHalants);
  }

  // Rule 2: Recursively apply conjunct drop rules
  const conjunctRegex = /([\u0915-\u0939\u0958-\u095F])\u094D([\u0915-\u0939\u0958-\u095F])/g;

  function recurse(current: string, index: number) {
    conjunctRegex.lastIndex = index;
    const match = conjunctRegex.exec(current);
    if (!match) {
      if (current !== word) {
        results.add(current);
      }
      return;
    }

    const start = match.index;
    const fullConj = match[0]; // C1 + halant + C2
    const c1 = match[1];
    const c2 = match[2];

    // Option A: Keep as is
    recurse(current, start + fullConj.length);

    // Option B: Remove halant -> C1 + C2
    const opB = current.substring(0, start) + c1 + c2 + current.substring(start + fullConj.length);
    recurse(opB, start + c1.length + c2.length);

    // Option C: Remove C1 + halant -> C2 (drop first half)
    const opC = current.substring(0, start) + c2 + current.substring(start + fullConj.length);
    recurse(opC, start + c2.length);

    // Option D: Remove halant + C2 -> C1 (drop second half)
    const opD = current.substring(0, start) + c1 + current.substring(start + fullConj.length);
    recurse(opD, start + c1.length);

    // Option E: Remove entire conjunct cluster C1 + halant + C2 -> ""
    const opE = current.substring(0, start) + current.substring(start + fullConj.length);
    recurse(opE, start);
  }

  recurse(word, 0);

  // Rule 3: Recursively apply single C + halant drop rules
  const singleConjRegex = /([\u0915-\u0939\u0958-\u095F])\u094D/g;

  function recurseSingle(current: string, index: number) {
    singleConjRegex.lastIndex = index;
    const match = singleConjRegex.exec(current);
    if (!match) {
      if (current !== word) {
        results.add(current);
      }
      return;
    }

    const start = match.index;
    const c = match[1];

    // Option A: Keep as is
    recurseSingle(current, start + 2);

    // Option B: Drop halant -> c
    const opB = current.substring(0, start) + c + current.substring(start + 2);
    recurseSingle(opB, start + 1);

    // Option C: Drop C + halant -> ""
    const opC = current.substring(0, start) + current.substring(start + 2);
    recurseSingle(opC, start);
  }

  recurseSingle(word, 0);

  return results;
}

// Precompile static mapping from corrupt variations to correct target words
export const STATIC_REPAIR_MAP = new Map<string, string>();

CORRECT_TARGET_WORDS.forEach(correctWord => {
  const corruptions = generateCorruptions(correctWord);
  corruptions.forEach(corruptWord => {
    // Only map if the corrupt word is at least 2 characters to prevent false positives on single characters
    if (corruptWord.length >= 2 && !STATIC_REPAIR_MAP.has(corruptWord)) {
      STATIC_REPAIR_MAP.set(corruptWord, correctWord);
    }
  });
});

// Add direct manual exceptions / rules for safety
STATIC_REPAIR_MAP.set('अपारटमेंट', 'अपार्टमेंट');
STATIC_REPAIR_MAP.set('कमपलकस', 'कॉम्प्लेक्स');
STATIC_REPAIR_MAP.set('बलांक', 'ब्लॉक');
STATIC_REPAIR_MAP.set('फलट', 'फ्लॅट');

// ============================================================================
// DYNAMIC DATABASE QUERY (With Graceful Fallback)
// ============================================================================

export async function getDynamicRepairs(): Promise<Map<string, string>> {
  const dynamicMap = new Map<string, string>();
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('marathi_repairs')
      .select('original_word, corrected_word')
      .eq('language', 'marathi');

    if (error) {
      // Table might not exist yet, log warning and fail gracefully
      console.warn('[MarathiRepair] Failed to fetch dynamic repairs from database:', error.message);
      return dynamicMap;
    }

    if (data) {
      data.forEach((row: any) => {
        dynamicMap.set(row.original_word.trim(), row.corrected_word.trim());
      });
    }
  } catch (err: any) {
    console.warn('[MarathiRepair] Supabase client error loading repairs:', err.message);
  }
  return dynamicMap;
}

// ============================================================================
// TEXT REPAIR ENGINE
// ============================================================================

export function repairMarathiText(
  text: string | null | undefined, 
  dynamicMappings?: Record<string, string>
): string {
  if (!text) return '';

  let cleaned = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 1. Refined space-healing: only heal single spaces preceding a combining character (matra)
  // to avoid merging separate words across boundaries.
  const combiningPattern = "[\\u0900-\\u0903\\u093E-\\u094D\\u0955-\\u0957\\u0962-\\u0963]";
  cleaned = cleaned.replace(new RegExp('(?<=\\S)\\s(' + combiningPattern + ')(?=\\S)', 'g'), '$1');

  // Also clean up any spaces after halants if they are inside a word
  cleaned = cleaned.replace(/([\u094D])\s+(?=\S)/g, '$1');

  // Common Devanagari/Hindi/Marathi word-split corrections
  cleaned = cleaned.replace(/उत्त\s+र/g, 'उत्तर');
  cleaned = cleaned.replace(/प्र\s+देश/g, 'प्रदेश');
  cleaned = cleaned.replace(/प्\s+र\s+देश/g, 'प्रदेश');

  // Word translation and corruption repairs based on user specifications
  cleaned = cleaned.replace(/सर्कल/g, 'चौक');
  cleaned = cleaned.replace(/सक\s+ल/g, 'चौक');
  cleaned = cleaned.replace(/रोड/g, 'मार्ग');
  cleaned = cleaned.replace(/सिटी/g, 'शहर');
  cleaned = cleaned.replace(/अधणा/g, 'उधना');
  cleaned = cleaned.replace(/फलाप्या\/आ/g, 'डब्ल्यू/ओ');
  cleaned = cleaned.replace(/डब[ुू]\s*\/ઓ/g, 'डब्ल्यू/ओ');
  cleaned = cleaned.replace(/डब[ुू]\s*\/ओ/g, 'डब्ल्यू/ओ');

  // Word splitting for merged address suffixes and surnames
  cleaned = cleaned.replace(/([^\s]+)(रोड|मार्ग|सोसायटी|कॉलोनी|नगर|विहार|टॉवर|विंग|ब्लॉक|खोली|इमारत|अपार्टमेंट|प्रभाग|सेक्टर|फेस|सामने|पास|पीछे|शहर|चौक)/g, '$1 $2');
  cleaned = cleaned.replace(/([^\s]+)(पाटील|पटेल|चौहान|परमार|राठौड़|सोलंकी|शाह|भाई|बहिन|कुमार|लाल|देवी|सिंह)/g, '$1 $2');

  // Tokenize while preserving non-Devanagari word structures
  const tokens = cleaned.split(/([^\u0900-\u097F]+)/);

  const repairedTokens = tokens.map(token => {
    if (/[\u0900-\u097F]+/.test(token)) {
      const trimmed = token.trim();
      
      // 1. Check dynamic mappings
      if (dynamicMappings && dynamicMappings[trimmed]) {
        return dynamicMappings[trimmed];
      }
      
      // 2. Check static map
      if (STATIC_REPAIR_MAP.has(trimmed)) {
        return STATIC_REPAIR_MAP.get(trimmed)!;
      }
    }
    return token;
  });

  return repairedTokens.join('');
}
