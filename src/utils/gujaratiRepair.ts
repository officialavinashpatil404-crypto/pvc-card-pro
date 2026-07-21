// Dynamic Supabase import happens inside functions to allow standalone unit testing

// ============================================================================
// INITIAL GUJARATI DICTIONARY (Based on Prompt Requirements)
// ============================================================================

export const COMMON_CONJUNCTS = [
  'ક્ષ', 'ત્ર', 'જ્ઞ', 'શ્ર', 'દ્દ', 'દ્ધ', 'ચ્છ', 'ક્ક', 'ત્ત', 'સ્થ', 'સ્ત', 
  'ન્દ્ર', 'ન્દ્રા', 'પ્ર', 'બ્ર', 'ગ્ર', 'ક્ર', 'ટ્ર', 'દ્ર', 'ਭ્ર', 'શ્વ', 
  'ત્વ', 'ત્વા', 'સ્મ', 'સ્વ', 'હ્ન', 'હ્મ', 'હ્ય'
];

export const COMMON_GOVERNMENT_WORDS = [
  // Districts / Cities
  'ગુજરાત', 'સુરત', 'અમદાવાદ', 'વડોદરા', 'રાજકોટ', 'ભાવનગર', 'જામનગર', 
  'ગાંધીનગર', 'જૂનાગઢ', 'ભરૂચ', 'નવસારી', 'વલસાડ', 'મહેસાણા', 'પાટણ', 
  'બનાસકાંઠા', 'સાબરકાંઠા',
  // Administrative divisions
  'જિલ્લો', 'તાલુકો', 'નગર', 'નગરપાલિકા', 'મහાનગરપาลિકા', 'ગામ', 'ગામડું', 
  'શહેર', 'રાજ્ય', 'દેશ', 'વોર્ડ', 'ગ્રામ', 'પંચાયત', 'તા.', 'જી.', 'મતવિસ્તાર',
  // Residential Types & Status
  'રહે.', 'રહેવાસી', 'रहेठाण', 'કાયમી', 'હાલનું', 'ઘરનું', 'સરનામાનો', 'પુરાવો',
  // Local Area Types
  'મહોલ્લો', 'ફળિયું', 'વાસ', 'પરા', 'પોળ', 'વાડી', 'ખેતર',
  // Property Identifiers
  'સર્વે', 'ખાતા', 'મિલકત', 'ઓફિસ', 'ઓરડા', 'દરવાજા', 'વિંગ', 'લિફ્ટ',
  // Address markers & Common Locations
  'સરનામું', 'નામ', 'મકાન', 'નંબર', 'ફ્લેટ', 'ઇમારત', 'સોસાયટી', 'એપાર્ટમેન્ટ', 
  'ટાવર', 'બ્લોક', 'માળ', 'ઓરડો', 'દુકાન', 'કચેરી', 'ગલી', 'રસ્તો', 'મુખ્ય', 'માર્ગ', 
  'શેરી', 'પાસે', 'સામે', 'પાછળ', 'આગળ', 'ખૂણો', 'ચાર', 'રસ્તા', 'ચોક', 'સર્કલ', 'વર્તુળ', 
  'બજાર', 'રેલવે', 'સ્ટેશન', 'બસ', 'સ્ટેન્ડ', 'હોસ્પિટલ', 'શાળા', 'મંદિર', 'મસ્જિદ', 
  'ટપાલ', 'પોલીસ', 'પિન', 'કોડ', 'ઓળખચિહ્ન', 'પ્લોટ', 'સેક્ટર', 'ફેઝ', 'વિસ્તાર', 
  'કોલોની', 'વિહાર', 'ઉદ્યાน', 'પાર્ક', 'પ્રવેશદ્વાર', 'ગેટ', 'રેસિડેન્સી', 'રેસીડેન્સી',
  'ચોકી', 'ડેપો', 'પોસ્ટ', 'ફાટક', 'કેનાલ', 'કિનારો', 'નદી', 'પુલ', 'બાયપાસ', 'રિંગ',
  'હાઇવે', 'રાજમાર્ગ', 'આંતરિક', 'ફોન', 'મોબાઇલ',
  // Directions and Modifiers
  'જૂનું', 'નવું', 'પૂર્વ', 'પશ્ચિમ', 'ઉત્તર', 'દક્ષિણ', 'રોડ', 'સ્ટ્રીટ',
  'પાછળનો', 'બાજુમાં', 'નજીક', 'નજીકનું', 'ઉપર', 'नीचे', 'ડાબી', 'જમણી',
  // Common address and structural prefixes
  'સમ્રાટ', 'ગ્રીન', 'ન્રા'
];

export const COMMON_NAMES = [
  'લક્ષ્મી', 'લક્ષ્મીબેન', 'રમેશ', 'મહેશ', 'સુરેશ', 'હિતેશ', 'પ્રકાશ', 
  'પ્રજાપતિ', 'ત્રિવેદી', 'શ્રી', 'શ્રીમતી', 'જયેશ', 'મુકેશ', 'હાર્દિક', 
  'કિરણ', 'અક્ષય', 'દીપક', 'જગદીશ', 'કૃષ્ણ', 'કૃપા', 'હર્ષદ', 'નરેન્દ્ર', 
  'ઇન્દ્રજીત'
];

// All correct target words
const CORRECT_TARGET_WORDS = [...new Set([...COMMON_GOVERNMENT_WORDS, ...COMMON_NAMES])];

// ============================================================================
// CORRUPTION GENERATION ALGORITHM
// ============================================================================

export function generateCorruptions(word: string): Set<string> {
  const results = new Set<string>();
  const noHalants = word.replace(/\u0ACD/g, '');
  if (noHalants !== word) {
    results.add(noHalants);
  }

  const conjunctRegex = /([\u0A95-\u0AB9])\u0ACD([\u0A95-\u0AB9])/g;

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
    const fullConj = match[0];
    const c1 = match[1];
    const c2 = match[2];

    recurse(current, start + fullConj.length);

    const opB = current.substring(0, start) + c1 + c2 + current.substring(start + fullConj.length);
    recurse(opB, start + c1.length + c2.length);

    const opC = current.substring(0, start) + c2 + current.substring(start + fullConj.length);
    recurse(opC, start + c2.length);

    const opD = current.substring(0, start) + c1 + current.substring(start + fullConj.length);
    recurse(opD, start + c1.length);

    const opE = current.substring(0, start) + current.substring(start + fullConj.length);
    recurse(opE, start);
  }

  recurse(word, 0);

  const singleConjRegex = /([\u0A95-\u0AB9])\u0ACD/g;

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

    recurseSingle(current, start + 2);

    const opB = current.substring(0, start) + c + current.substring(start + 2);
    recurseSingle(opB, start + 1);

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
    if (
      corruptWord.length >= 2 && 
      !CORRECT_TARGET_WORDS.includes(corruptWord) && 
      !STATIC_REPAIR_MAP.has(corruptWord)
    ) {
      STATIC_REPAIR_MAP.set(corruptWord, correctWord);
    }
  });
});

// Add direct manual exceptions / rules for safety
STATIC_REPAIR_MAP.set('લમી', 'લક્ષ્મી');
STATIC_REPAIR_MAP.set('લમીબેન', 'લક્ષ્મીબેન');
STATIC_REPAIR_MAP.set('જિો', 'જિલ્લો');
STATIC_REPAIR_MAP.set('અય', 'અક્ષય');
STATIC_REPAIR_MAP.set('હાદિક', 'હાર્દિક');
STATIC_REPAIR_MAP.set('ડબુ', 'ડબલ્યુ');
STATIC_REPAIR_MAP.set('ડબુ/ઓ', 'ડબલ્યુ/ઓ');
STATIC_REPAIR_MAP.set('સવર', 'સિલ્વર');
STATIC_REPAIR_MAP.set('રેસીડો', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસીડોં', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસીડૉ', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસીડ', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસિડે-ન્સીી', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસિડેન્સીી', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસીડે-ન્સીી', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('રેસીડેન્સીી', 'રેસિડેન્સી');
STATIC_REPAIR_MAP.set('ડડોલી', 'ડીંડોલી');
STATIC_REPAIR_MAP.set('સટી', 'સિટી');

// Explicit name, prefix and Care Of corrections
STATIC_REPAIR_MAP.set('નારા', 'ન્રા');
STATIC_REPAIR_MAP.set('નરા', 'ન્રા');
STATIC_REPAIR_MAP.set('નાારા', 'ન્રા');
STATIC_REPAIR_MAP.set('ના  ારા', 'ન્રા');
STATIC_REPAIR_MAP.set('કેવન', 'કેવિન');
STATIC_REPAIR_MAP.set('કે વન', 'કેવિન');
STATIC_REPAIR_MAP.set('લલેશ', 'લિલેશ');
STATIC_REPAIR_MAP.set('લીલેષકમાર', 'લીલેષકુમાર');
STATIC_REPAIR_MAP.set('લીલેશકમાર', 'લીલેષકુમાર');

// Address-specific common OCR errors (User reported & similar)
STATIC_REPAIR_MAP.set('ગોવધન', 'ગોવર્ધન');   // Missing repha
STATIC_REPAIR_MAP.set('શીવાલક', 'શિવાલિક');  // Matra corrections for Shivalik
STATIC_REPAIR_MAP.set('સ્કવેર', 'સ્ક્વેર');   // Conjunct correction for Square
STATIC_REPAIR_MAP.set('પાક', 'પાર્ક');       // Missing repha for Park
STATIC_REPAIR_MAP.set('માગ', 'માર્ગ');       // Missing repha for Marg
STATIC_REPAIR_MAP.set('સકલ', 'સર્કલ');     // Missing repha for Circle
STATIC_REPAIR_MAP.set('કોપલેક્ષ', 'કોમ્પ્લેક્સ'); // Complex word correction
STATIC_REPAIR_MAP.set('કોપલેસ', 'કોમ્પ્લેક્સ');
STATIC_REPAIR_MAP.set('એપાર્ટમેટ', 'એપાર્ટમેન્ટ'); // Missing anusvara/conjunct
STATIC_REPAIR_MAP.set('બલોક', 'બ્લોક');     // Block
STATIC_REPAIR_MAP.set('ફલેટ', 'ફ્લેટ');     // Flat
STATIC_REPAIR_MAP.set('ગરાઉન્ડ', 'ગ્રાઉન્ડ'); // Ground
STATIC_REPAIR_MAP.set('ગ્રાઉન્ડ', 'ગ્રાઉન્ડ'); // Ground (already correct)

// ── Address words commonly corrupted by pdfjs Gujarati font mismap ──────────
// "wing" → pdfjs reads through Gujarati font → drops i-matra + anusvara → "વ" + "ગ"
STATIC_REPAIR_MAP.set('વગ', 'વિંગ');             // wing (i-matra + anusvara dropped)
// "Shivam" → pdfjs: "શ" + "વ" + "મ" (i-matra after શ dropped)
STATIC_REPAIR_MAP.set('શવ', 'શિવ');             // Shiv/Shivam prefix (i-matra dropped)
STATIC_REPAIR_MAP.set('શવમ', 'શિવમ');           // Shivam full word
// "pramukh" → halant+ra conjunct breaks → "પ ્ ર" + space + "મ ુ ખ"
STATIC_REPAIR_MAP.set('પ ્ ર મ ુ ખ', 'પ્રમ ુ ખ'.replace(/\s/g, ''));
STATIC_REPAIR_MAP.set('પ ્ ર  મ ુ ખ', 'પ્ર\u0AAE\u0AC1\u0A96');
STATIC_REPAIR_MAP.set('પ ્ ર મ ખ', 'પ્ર\u0AAE\u0AC1\u0A96');
STATIC_REPAIR_MAP.set('પ ્ ર મ', 'પ્રમ');      // pra conjunct broken
STATIC_REPAIR_MAP.set('પ ્ ર', 'પ્ર');         // pra standalone
// Tower → ટ ા'વ'ર with aa-matra dropped becomes ટ'વ'ર
STATIC_REPAIR_MAP.set('ટાવ', 'ટાવ\u0AB0');      // Tower (ra at end dropped)
// Park → repha dropped → "પ ા'ક" 
STATIC_REPAIR_MAP.set('પ ા ર ક', 'પ\u0ABE\u0AB0\u0ACD\u0A95'); // Park
// Society → misread
STATIC_REPAIR_MAP.set('સ ો'+ 'સ ા'+ 'ઇ'+ 'ટ ી', 'સ\u0ACB\u0AB8\u0ABE\u0A87\u0A9F\u0AC0'); // Society
// Repha loss for names in local text
STATIC_REPAIR_MAP.set('હષ', 'હ\u0AB0\u0ACD\u0AB7');  // Harsh -> હ'ર ્'ષ
STATIC_REPAIR_MAP.set('ભઈ', 'ભ\u0ABE\u0A88');         // Bhai -> ભ'ા'ઈ
STATIC_REPAIR_MAP.set('પટળ', 'પ\u0A9F\u0AC7\u0AB3'); // Patel -> પ'ટ ે'ળ


// ============================================================================
// DYNAMIC DATABASE QUERY (With Graceful Fallback)
// ============================================================================

export async function getDynamicRepairs(language: string = 'gujarati'): Promise<Map<string, string>> {
  const dynamicMap = new Map<string, string>();
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('gujarati_repairs')
      .select('original_word, corrected_word')
      .eq('language', language);

    if (error) {
      console.warn(`[RegionalRepair] Failed to fetch dynamic repairs for ${language} from database:`, error.message);
      return dynamicMap;
    }

    if (data) {
      data.forEach((row: any) => {
        dynamicMap.set(row.original_word.trim(), row.corrected_word.trim());
      });
    }
  } catch (err: any) {
    console.warn(`[RegionalRepair] Supabase client error loading ${language} repairs:`, err.message);
  }
  return dynamicMap;
}

// ============================================================================
// TEXT REPAIR ENGINE
// ============================================================================

export function repairGujaratiText(
  text: string, 
  dynamicMappings?: Record<string, string>
): string {
  if (!text) return '';

  // 1. Initial cleanup of ZWJs and null bytes
  let cleaned = text.replace(/[\u200B\u200C\u200D\FEFF\u0000]/g, '');

  // Shivam Tower corrections
  cleaned = cleaned.replace(/શવમ\s*ટાવર/g, 'શિવમ ટાવર');
  cleaned = cleaned.replace(/શવમટાવર/g, 'શિવમ ટાવર');
  cleaned = cleaned.replace(/શિવમટાવર/g, 'શિવમ ટાવર');

  // Pandesra corrections
  cleaned = cleaned.replace(/પડિહરા/g, 'પાંડેસરા');
  cleaned = cleaned.replace(/પાડેસરા/g, 'પાંડેસરા');

  // 2. Map C/O labels directly to "દ્વારા:"
  cleaned = cleaned.replace(/ના\s+ારા\s*:/g, 'દ્વારા:');
  cleaned = cleaned.replace(/નાારા\s*:/g, 'દ્વારા:');
  cleaned = cleaned.replace(/નરા\s*:/g, 'દ્વારા:');
  cleaned = cleaned.replace(/ન્રા\s*:/g, 'દ્વારા:');

  // 3. Stubborn compound corrections
  cleaned = cleaned.replace(new RegExp('ડબ ુ\\s*[\\/|\\\\|ઓ]+\\s*ઓ', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબ ુ\\s*[\\/|\\\\|ઓ]+', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબ ુ\\/ઓ', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબ ુ', 'g'), 'ડબલ્યુ');
  cleaned = cleaned.replace(new RegExp('ડબુ\\s*[\\/|\\\\|ઓ]+\\s*ઓ', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબુ\\s*[\\/|\\\\|ઓ]+', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબુ\\/ઓ', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબુ', 'g'), 'ડબલ્યુ');
  cleaned = cleaned.replace(new RegExp('ડબु\\s*[\\/|\\\\|ઓ]+\\s*ઓ', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબु\\s*[\\/|\\\\|ઓ]+', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબु\\/ઓ', 'g'), 'ડબલ્યુ/ઓ');
  cleaned = cleaned.replace(new RegExp('ડબु', 'g'), 'ડબલ્યુ');

  // Silver (સિલ્વર) corrections
  cleaned = cleaned.replace(/સ\s+વર/g, 'સિલ્વર');
  cleaned = cleaned.replace(/સવર/g, 'સિલ્વર');

  // Residency (રેસિડેન્સી) corrections
  cleaned = cleaned.replace(/રે[સસિી]+[\s\-]*ડે[\s\-]*[ીન્સી]+/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસીડોં/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસીડૉ/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસીડો/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસીડ/g, 'રેસિડેન્સી');

  // Circle (સર્કલ) corrections and Circle -> Chok translation
  cleaned = cleaned.replace(/સક\s+લ/g, 'ચોક');
  cleaned = cleaned.replace(/સકલ/g, 'ચોક');
  cleaned = cleaned.replace(/સર્કલ/g, 'ચોક');

  // Road -> Marg translation
  cleaned = cleaned.replace(/રોડ/g, 'માર્ગ');

  // Vision OCR and font-mismap specific word corruptions
  cleaned = cleaned.replace(/સુરતસર/g, 'સુરત શહેર');
  cleaned = cleaned.replace(/સુરતસટી/g, 'સુરત શહેર');
  cleaned = cleaned.replace(/સુરતસિટી/g, 'સુરત શહેર');
  cleaned = cleaned.replace(/સુરતસ\s+ી/g, 'સુરત શહેર');
  cleaned = cleaned.replace(/અધણા/g, 'ઉધના');
  cleaned = cleaned.replace(/ફલપ્યા\/આ/g, 'ડબલ્યુ/ઓ');

  // OCR hyphen insertion fixes
  cleaned = cleaned.replace(/રેસિડે-ન્સીી/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસીડે-ન્सीી/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસિડેન્સીી/g, 'રેસિડેન્સી');
  cleaned = cleaned.replace(/રેસીડેન્સીી/g, 'રેસિડેન્સી');

  // Word splitting for merged address suffixes
  cleaned = cleaned.replace(/([^\s]+)રોડ/g, '$1 રોડ');
  cleaned = cleaned.replace(/([^\s]+)માર્ગ/g, '$1 માર્ગ');
  cleaned = cleaned.replace(/([^\s]+)સિટી/g, '$1 સિટી');
  cleaned = cleaned.replace(/([^\s]+)શહેર/g, '$1 શહેર');
  cleaned = cleaned.replace(/([^\s]+)સર્કલ/g, '$1 સર્કલ');
  cleaned = cleaned.replace(/([^\s]+)ચોક/g, '$1 ચોક');
  cleaned = cleaned.replace(/([^\s]+)રેસિડેન્સી/g, '$1 રેસિડેન્સી');
  cleaned = cleaned.replace(/([^\s]+)એપાર્ટમેન્ટ/g, '$1 એપાર્ટમેન્ટ');
  cleaned = cleaned.replace(/([^\s]+)સોસાયટી/g, '$1 સોસાયટી');
  cleaned = cleaned.replace(/([^\s]+)નગર/g, '$1 નગર');
  cleaned = cleaned.replace(/([^\s]+)હાઇવે/g, '$1 હાઇવે');
  cleaned = cleaned.replace(/([^\s]+)સ્ટેશન/g, '$1 સ્ટેશન');
  cleaned = cleaned.replace(/([^\s]+)બિલ્ડિંગ/g, '$1 બિલ્ડિંગ');
  cleaned = cleaned.replace(/([^\s]+)બ્લોક/g, '$1 બ્લોક');
  cleaned = cleaned.replace(/([^\s]+)પ્લોટ/g, '$1 પ્લોટ');
  cleaned = cleaned.replace(/([^\s]+)નીસામે/g, '$1 ની સામે');
  cleaned = cleaned.replace(/([^\s]+)સામે/g, '$1 સામે');
  cleaned = cleaned.replace(/([^\s]+)સ્ક્વેર/g, '$1 સ્ક્વેર');
  cleaned = cleaned.replace(/([^\s]+)સ્કવેર/g, '$1 સ્ક્વેર');
  cleaned = cleaned.replace(/([^\s]+)પાસે/g, '$1 પાસે');
  cleaned = cleaned.replace(/([^\s]+)પાક/g, '$1 પાર્ક');
  cleaned = cleaned.replace(/([^\s]+)પાર્ક/g, '$1 પાર્ક');

  // Surname & Name components splitting inside address blocks
  cleaned = cleaned.replace(/([^\s]+)(પાટીલ|પટેલ|ચૌહાણ|પરમાર|રાઠોડ|સોલંકી|શાહ|ભાઈ|બેન|કુમાર|લાલ|દેવી|સિંહ)/g, '$1 $2');

  // Specific splits and corrections
  cleaned = cleaned.replace(/સાટીનસટી/g, 'સમ્રાટ ગ્રીન સિટી');
  cleaned = cleaned.replace(/સાટીન\s*સટી/g, 'સમ્રાટ ગ્રીન સિટી');
  cleaned = cleaned.replace(/સોનારભીખા/g, 'સોનાર ભીખા');
  cleaned = cleaned.replace(/ડબલ્યુ\/ઓ([^\s])/g, 'ડબલ્યુ/ઓ $1');

  // Ensure space after commas in address blocks
  cleaned = cleaned.replace(/,([^\s])/g, ', $1');

  // 4. Tokenize by whitespace to prevent cross-word merging during dictionary repair
  const tokens = cleaned.split(/(\s+)/);

  const repairedTokens = tokens.map(token => {
    // If it is just whitespace, preserve it
    if (/^\s+$/.test(token)) return token;

    const trimmed = token.trim();
    // Strip trailing/leading punctuation/delimiters for dictionary check
    const puncMatch = trimmed.match(/^([^\u0A80-\u0AFF]*)([\u0A80-\u0AFF\u0ACD]+)([^\u0A80-\u0AFF]*)$/);
    if (!puncMatch) return token;

    const prefix = puncMatch[1];
    const word = puncMatch[2];
    const suffix = puncMatch[3];

    // Check dynamic and static dictionaries
    let repaired = word;
    if (dynamicMappings && dynamicMappings[word]) {
      repaired = dynamicMappings[word];
    } else if (STATIC_REPAIR_MAP.has(word)) {
      repaired = STATIC_REPAIR_MAP.get(word)!;
    }
    
    return prefix + repaired + suffix;
  });

  let repairedText = repairedTokens.join('');

  // 5. Run SAFE space healing on the repaired string at the end
  const combiningPattern = "[\\u0A81-\\u0A83\\u0ABC\\u0ABE-\\u0ACD\\u0AE2-\\u0AE3]";
  repairedText = repairedText.replace(new RegExp('(?<=\\S)\\s(' + combiningPattern + ')(?=\\S)', 'g'), '$1');
  repairedText = repairedText.replace(/([\u0ACD])\s+(?=\S)/g, '$1');

  return repairedText;
}

// ============================================================================
// FAILURES LOGGING & TEXT ALIGNMENT
// ============================================================================

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

export async function alignAndLogRepairs(originalText: string, correctedText: string, language: string = 'gujarati'): Promise<void> {
  if (!originalText || !correctedText) return;

  const isIndic = (word: string) => /[\u0900-\u0D7F]/.test(word);

  const tokenize = (text: string) => {
    return text
      .split(/[\s,\.\/\-\(\):;\\'"!@#\$%\^\&\*\+\=\{\}\[\]\|<>`\?]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
  };

  const origWords = tokenize(originalText);
  const corrWords = tokenize(correctedText);

  let i = 0;
  let j = 0;
  const repairs: { original: string; corrected: string }[] = [];

  while (i < origWords.length && j < corrWords.length) {
    const wOrig = origWords[i];
    const wCorr = corrWords[j];

    if (wOrig === wCorr) {
      i++;
      j++;
    } else {
      if (isIndic(wOrig) && isIndic(wCorr)) {
        const dist = levenshteinDistance(wOrig, wCorr);
        if (dist > 0 && dist <= 5) {
          repairs.push({ original: wOrig, corrected: wCorr });
        }
      }
      i++;
      j++;
    }
  }

  if (repairs.length > 0) {
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      for (const repair of repairs) {
        if (repair.original.trim() === repair.corrected.trim()) continue;

        console.log(`[RegionalRepair] Align failure logged for ${language}: "${repair.original}" -> "${repair.corrected}"`);

        const { data: existing, error: selectErr } = await supabase
          .from('gujarati_repairs')
          .select('id, frequency')
          .eq('language', language)
          .eq('original_word', repair.original)
          .maybeSingle();

        if (selectErr) {
          throw selectErr;
        }

        if (existing) {
          await supabase
            .from('gujarati_repairs')
            .update({
              corrected_word: repair.corrected,
              frequency: existing.frequency + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('gujarati_repairs')
            .insert({
              language: language,
              original_word: repair.original,
              corrected_word: repair.corrected,
              frequency: 1
            });
        }
      }
    } catch (err: any) {
      console.warn(`[RegionalRepair] Failed to save aligned repairs for ${language} to database:`, err.message);
    }
  }
}
