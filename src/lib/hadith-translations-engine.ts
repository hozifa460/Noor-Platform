/**
 * Hadith Multi-Language Translation Engine.
 * Fetches verified translations on demand from the Hugging Face Sunnah repository.
 */

export interface SupportedTranslationLanguage {
  code: string;
  nameEn: string;
  nameAr: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_TRANSLATION_LANGUAGES: SupportedTranslationLanguage[] = [
  { code: 'eng', nameEn: 'English', nameAr: 'الإنجليزية', flag: '🇬🇧', direction: 'ltr' },
  { code: 'urd', nameEn: 'اردو', nameAr: 'الأردية', flag: '🇵🇰', direction: 'rtl' },
  { code: 'fra', nameEn: 'Français', nameAr: 'الفرنسية', flag: '🇫🇷', direction: 'ltr' },
  { code: 'ind', nameEn: 'Bahasa Indonesia', nameAr: 'الإندونيسية', flag: '🇮🇩', direction: 'ltr' },
  { code: 'tur', nameEn: 'Türkçe', nameAr: 'التركية', flag: '🇹🇷', direction: 'ltr' },
  { code: 'rus', nameEn: 'Русский', nameAr: 'الروسية', flag: '🇷🇺', direction: 'ltr' },
  { code: 'ben', nameEn: 'বাংলা', nameAr: 'البنغالية', flag: '🇧🇩', direction: 'ltr' },
];

export interface HadithTranslationResult {
  langCode: string;
  langMeta: SupportedTranslationLanguage;
  bookId: string;
  hadithNumber: number;
  text: string;
  grades?: { name: string; grade: string }[];
}

const BOOK_API_CODE_MAP: Record<string, string> = {
  bukhari: 'bukhari',
  muslim: 'muslim',
  abudawud: 'abudawud',
  tirmidhi: 'tirmidhi',
  nasai: 'nasai',
  ibnmajah: 'ibnmajah',
  malik: 'malik',
  nawawi40: 'nawawi',
  qudsi40: 'qudsi',
  shahwaliullah40: 'dehlawi',
};

const translationCache = new Map<string, HadithTranslationResult>();

/**
 * Checks if translations are available for a given book.
 */
export function isBookTranslationAvailable(bookId: string): boolean {
  return Boolean(BOOK_API_CODE_MAP[bookId]);
}

/**
 * Fetches a single hadith translation on-demand with local cache.
 */
export async function fetchHadithTranslation(
  bookId: string,
  hadithNumber: number,
  langCode: string
): Promise<HadithTranslationResult | null> {
  const apiBook = BOOK_API_CODE_MAP[bookId];
  if (!apiBook) return null;

  const langMeta = SUPPORTED_TRANSLATION_LANGUAGES.find((l) => l.code === langCode);
  if (!langMeta) return null;

  const cacheKey = `${langCode}:${bookId}:${hadithNumber}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const chunkFolder = Math.floor(hadithNumber / 1000);
  const edition = `${langCode}-${apiBook}`;
  const url = `https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/Hadith_API/editions/${edition}/${chunkFolder}/${hadithNumber}.min.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      hadiths?: { hadithnumber: number; text: string; grades?: { name: string; grade: string }[] }[];
    };
    const item = data?.hadiths?.[0];
    if (!item || !item.text) return null;

    // Clean html tags if present in translation text
    const cleanText = item.text.replace(/<[^>]*>/g, '').trim();

    const result: HadithTranslationResult = {
      langCode,
      langMeta,
      bookId,
      hadithNumber,
      text: cleanText,
      grades: item.grades,
    };

    if (translationCache.size < 500) {
      translationCache.set(cacheKey, result);
    }

    return result;
  } catch {
    return null;
  }
}
