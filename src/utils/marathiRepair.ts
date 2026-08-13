export const COMMON_GOVERNMENT_WORDS: string[] = [];
export const COMMON_NAMES: string[] = [];
export const STATIC_REPAIR_MAP = new Map<string, string>();

export async function getDynamicRepairs(): Promise<Map<string, string>> {
  return new Map<string, string>();
}

export function repairMarathiText(
  text: string | null | undefined,
  _dynamicMappings?: any
): string {
  if (!text) return '';

  // 1. Remove hidden control characters
  let cleaned = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 2. Safe space-healing for Devanagari combining characters
  const combiningPattern = "[\\u0900-\\u0903\\u093C-\\u094D\\u0962-\\u0963]";
  cleaned = cleaned.replace(new RegExp('(?<=\\S)\\s(' + combiningPattern + ')(?=\\S)', 'g'), '$1');

  // Clean up any spaces after halants inside words (e.g. "क ् र" -> "क्र", "त् त" -> "त्त")
  cleaned = cleaned.replace(/([\u094D])\s+(?=\S)/g, '$1');

  // 3. Heal common Devanagari broken word spaces caused by PDF font encoding (handles pre/post halant cleaning)
  cleaned = cleaned
    .replace(/उत्\s*त\s*र/g, 'उत्तर')
    .replace(/उत्त\s*र/g, 'उत्तर')
    .replace(/प्र\s*दे\s*श/g, 'प्रदेश')
    .replace(/प्र\s*देश/g, 'प्रदेश')
    .replace(/उत्तर\s*प्रदेश/g, 'उत्तर प्रदेश')
    .replace(/उत्तर\s*प्र\s*देश/g, 'उत्तर प्रदेश')
    .replace(/उत्त\s*र\s*प्र\s*दे\s*श/g, 'उत्तर प्रदेश')
    .replace(/उत्त\s*र\s*प्र\s*देश/g, 'उत्तर प्रदेश')
    .replace(/म\s*ध्य\s*प्र\s*दे\s*श/g, 'मध्य प्रदेश')
    .replace(/मध्य\s*प्रदेश/g, 'मध्य प्रदेश')
    .replace(/हि\s*मा\s*च\s*ल/g, 'हिमाचल')
    .replace(/हिमाचल\s*प्रदेश/g, 'हिमाचल प्रदेश')
    .replace(/रा\s*ज\s*स्\s*था\s*न/g, 'राजस्थान')
    .replace(/राज\s*स्थान/g, 'राजस्थान')
    .replace(/छ\s*त्\s*ती\s*स\s*ग\s*ढ़/g, 'छत्तीसगढ़')
    .replace(/झा\s*र\s*खं\s*ड/g, 'झारखंड')
    .replace(/उत्\s*त\s*रा\s*खं\s*ड/g, 'उत्तराखंड')
    .replace(/बौ\s*ध\s*न्\s*सा\s*पु\s*र/g, 'बुढ़न्सापुर')
    .replace(/बु\s*ढ़\s*न्\s*सा\s*पु\s*र/g, 'बुढ़न्सापुर')
    .replace(/बू\s*ढ़\s*न्\s*सा\s*पु\s*र/g, 'बूढ़न्सापुर')
    .replace(/बू\s*ढ़\s*न्सापुर/g, 'बूढ़न्सापुर')
    .replace(/बु\s*र्\s*हं\s*स\s*पु\s*र/g, 'बुर्हंसपुर')
    .replace(/बु\s*र्हंसपुर/g, 'बुर्हंसपुर')
    .replace(/नी\s*भा\s*पु\s*र/g, 'नीभापुर')
    .replace(/नी\s*भापुर/g, 'नीभापुर')
    .replace(/जौ\s*न\s*पु\s*र/g, 'जौनपुर')
    .replace(/जौ\s*नपुर/g, 'जौनपुर')
    .replace(/ब\s*हा\s*दु\s*र/g, 'बहादुर')
    .replace(/बहादु\s*र/g, 'बहादुर')
    .replace(/बहा\s*दुर/g, 'बहादुर')
    .replace(/रं\s*ग/g, 'रंग')
    .replace(/रंग\s*ब\s*हा\s*दु\s*र/g, 'रंग बहादुर')
    .replace(/रंग\s*बहादु\s*र/g, 'रंग बहादुर')
    .replace(/आ\s*त्\s*म\s*ज/g, 'आत्मज')
    .replace(/आत्म\s*ज/g, 'आत्मज');

  // 4. Clean punctuation spaces (e.g. "रंग बहादुर ," -> "रंग बहादुर,")
  cleaned = cleaned.replace(/\s+([,.:;!?])/g, '$1');

  // 5. Normalize multiple spaces
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}
