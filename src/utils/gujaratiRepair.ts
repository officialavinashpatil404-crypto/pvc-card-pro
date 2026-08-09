export const COMMON_GUJARATI_WORDS: string[] = [];
export const STATIC_REPAIR_MAP = new Map<string, string>();

export async function getDynamicRepairs(): Promise<Map<string, string>> {
  return new Map<string, string>();
}

export function repairGujaratiText(
  text: string | null | undefined,
  _dynamicMappings?: any
): string {
  if (!text) return '';

  // 1. Remove hidden control characters
  let cleaned = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // 2. Safe space-healing: join orphaned matras caused by PDF text rendering (e.g. "શ િ વ" -> "શિવ")
  const combiningPattern = "[\\u0A81-\\u0A83\\u0ABC-\\u0ACD\\u0AE2-\\u0AE3]";
  cleaned = cleaned.replace(new RegExp('(?<=\\S)\\s(' + combiningPattern + ')(?=\\S)', 'g'), '$1');

  // 3. Normalize multiple spaces
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

export async function alignAndLogRepairs(..._args: any[]): Promise<void> {}

