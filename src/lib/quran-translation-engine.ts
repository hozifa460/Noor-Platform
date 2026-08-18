import { QURAN_TRANSLATIONS, type QuranTranslationMeta } from './quran-data';

interface RawAyahTranslation {
  id?: string;
  sura: string;
  aya: string;
  arabic_text?: string;
  translation: string;
  footnotes?: string;
}

interface RawTranslationFile {
  metadata?: any;
  suras: Record<string, RawAyahTranslation[]>;
}

// In-memory cache for parsed translations by code
const translationCache = new Map<string, RawTranslationFile>();

/**
 * Loads a full translation file (e.g. 'fr-montada', 'ur-junagarhi', etc.)
 */
export async function loadTranslationFile(code: string): Promise<RawTranslationFile | null> {
  if (translationCache.has(code)) {
    return translationCache.get(code)!;
  }

  // Check Node environment
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'data', 'quran', 'translations', `${code}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as RawTranslationFile;
        translationCache.set(code, parsed);
        return parsed;
      }
    } catch {
      /* proceed to fetch */
    }
  }

  try {
    const res = await fetch(`/data/quran/translations/${code}.json`);
    if (res.ok) {
      const data = (await res.json()) as RawTranslationFile;
      translationCache.set(code, data);
      return data;
    }
  } catch {
    /* fallback to huggingface if local is missing */
  }

  const meta = QURAN_TRANSLATIONS.find((t) => t.code === code);
  if (meta) {
    try {
      const res = await fetch(
        `https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/quran_tafsir_multilingual/${meta.fileKey}`
      );
      if (res.ok) {
        const data = (await res.json()) as RawTranslationFile;
        translationCache.set(code, data);
        return data;
      }
    } catch (err) {
      console.warn(`Failed to fetch translation ${code}:`, err);
    }
  }

  return null;
}

/**
 * Gets the translation for a specific Ayah in any language
 */
export async function getAyahTranslation(
  code: string,
  surahNo: number,
  ayahNo: number
): Promise<{ text: string; footnotes?: string; author: string; direction: 'ltr' | 'rtl' }> {
  const meta = QURAN_TRANSLATIONS.find((t) => t.code === code) || QURAN_TRANSLATIONS[0];
  const file = await loadTranslationFile(meta.code);

  if (file && file.suras && file.suras[String(surahNo)]) {
    const surahAyahs = file.suras[String(surahNo)];
    const item = surahAyahs.find((a) => Number(a.aya) === ayahNo);
    if (item && item.translation) {
      // Remove leading ayah numbers if present e.g. "1. Au nom d’Allah..." -> "Au nom d’Allah..."
      const cleanText = item.translation.replace(/^\d+\.\s*/, '').trim();
      return {
        text: cleanText,
        footnotes: item.footnotes || undefined,
        author: meta.author,
        direction: meta.direction,
      };
    }
  }

  return {
    text: 'Translation unavailable for this verse.',
    author: meta.author,
    direction: meta.direction,
  };
}

/**
 * Gets the full Surah translation map (ayahNo -> translation text)
 */
export async function getSurahTranslationsMap(
  code: string,
  surahNo: number
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const file = await loadTranslationFile(code);

  if (file && file.suras && file.suras[String(surahNo)]) {
    const list = file.suras[String(surahNo)];
    for (const item of list) {
      const aNo = Number(item.aya);
      if (aNo && item.translation) {
        map.set(aNo, item.translation.replace(/^\d+\.\s*/, '').trim());
      }
    }
  }

  return map;
}
