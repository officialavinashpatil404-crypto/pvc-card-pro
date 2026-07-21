import * as fs from 'fs';
import * as path from 'path';

interface LearnedLanguageData {
  names: Record<string, string>;
  addresses: Record<string, string>;
}

type LearnedMappings = Record<string, LearnedLanguageData>;

const DICT_DIR = path.resolve('./src/data/dictionaries');
const FILE_PATH = path.join(DICT_DIR, 'learned_mappings.json');

let mappingsCache: LearnedMappings | null = null;

/**
 * Loads the learned mappings from disk or returns the cached version.
 */
export function loadLearnedMappings(): LearnedMappings {
  if (mappingsCache) return mappingsCache;

  try {
    if (!fs.existsSync(DICT_DIR)) {
      fs.mkdirSync(DICT_DIR, { recursive: true });
    }

    if (fs.existsSync(FILE_PATH)) {
      const data = fs.readFileSync(FILE_PATH, 'utf8');
      mappingsCache = JSON.parse(data);
    } else {
      mappingsCache = {};
    }
  } catch (e) {
    console.error('[SelfLearningEngine] Failed to load learned mappings:', e);
    mappingsCache = {};
  }

  return mappingsCache || {};
}

/**
 * Saves the learned mappings to disk.
 */
export function saveLearnedMappings(mappings: LearnedMappings) {
  try {
    mappingsCache = mappings;
    fs.writeFileSync(FILE_PATH, JSON.stringify(mappings, null, 2), 'utf8');
  } catch (e) {
    console.error('[SelfLearningEngine] Failed to save learned mappings:', e);
  }
}

/**
 * Learns name and address mappings from a successful translation.
 * Learns full strings to prevent word-boundary or segment-alignment contamination.
 */
export function learnFromTranslation(
  lang: string,
  fields: { nameEnglish: string; addressEnglish: string; localName: string; localAddress: string; }
) {
  const targetLang = (lang || '').toLowerCase();
  if (!targetLang) return;

  const mappings = loadLearnedMappings();

  if (!mappings[targetLang]) {
    mappings[targetLang] = { names: {}, addresses: {} };
  }

  const langData = mappings[targetLang];
  let changed = false;

  const cleanEngName = (fields.nameEnglish || '').trim().toLowerCase();
  const cleanLocName = (fields.localName || '').trim();

  if (cleanEngName && cleanLocName) {
    if (langData.names[cleanEngName] !== cleanLocName) {
      langData.names[cleanEngName] = cleanLocName;
      changed = true;
      console.log(`[SelfLearningEngine] [${targetLang}] Learned name: "${cleanEngName}" -> "${cleanLocName}"`);
    }
  }

  const cleanEngAddr = (fields.addressEnglish || '').trim().toLowerCase();
  const cleanLocAddr = (fields.localAddress || '').trim();

  if (cleanEngAddr && cleanLocAddr) {
    if (langData.addresses[cleanEngAddr] !== cleanLocAddr) {
      langData.addresses[cleanEngAddr] = cleanLocAddr;
      changed = true;
      console.log(`[SelfLearningEngine] [${targetLang}] Learned address: "${cleanEngAddr}" -> "${cleanLocAddr}"`);
    }
  }

  if (changed) {
    saveLearnedMappings(mappings);
  }
}

/**
 * Attempts to translate English name and address offline using learned mappings.
 * Returns the translated texts if fully successful, otherwise null.
 */
export function translateOfflineWithLearning(
  lang: string,
  nameEnglish: string,
  addressEnglish: string
): { localName: string | null; localAddress: string | null } {
  const targetLang = (lang || '').toLowerCase();
  const mappings = loadLearnedMappings();
  const langData = mappings[targetLang];

  if (!langData) {
    return { localName: null, localAddress: null };
  }

  const cleanEngName = (nameEnglish || '').trim().toLowerCase();
  const cleanEngAddr = (addressEnglish || '').trim().toLowerCase();

  const localName = langData.names[cleanEngName] || null;
  const localAddress = langData.addresses[cleanEngAddr] || null;

  return { localName, localAddress };
}
