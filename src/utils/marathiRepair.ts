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

  // Clean up any spaces after halants inside words (e.g. "क ् र" -> "क्र")
  cleaned = cleaned.replace(/([\u094D])\s+(?=\S)/g, '$1');

  // 3. Normalize multiple spaces
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}
