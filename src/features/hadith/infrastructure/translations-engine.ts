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

export type TranslationSupportStatus = 'verified' | 'concordance_required' | 'unsupported';

export interface ConcordanceEvidenceItem {
  bookId: string;
  bookNameAr: string;
  localEditionSystem: string;
  remoteApiEdition: string;
  status: TranslationSupportStatus;
  concordanceProof: string;
}

/**
 * دليل مطابقة النسخ والترقيمات (Concordance Evidence Catalog):
 * يوثق التحقق التجريبي من مطابقة أرقام الأحاديث بين النسخة المحلية ومستودع الترجمات (sunnahset / Hadith_API).
 * القاعدة العلمية الصارمة: ما لم تثبت مطابقته التامة 1:1 لا يُصنف verified بل يُصنف concordance_required.
 */
export const CONCORDANCE_EVIDENCE_CATALOG: Record<string, ConcordanceEvidenceItem> = {
  bukhari: {
    bookId: 'bukhari',
    bookNameAr: 'صحيح البخاري',
    localEditionSystem: 'ترقيم فتح الباري / الترقيم العالمي للشاملة (In-Book Reference)',
    remoteApiEdition: 'eng-bukhari',
    status: 'verified',
    concordanceProof:
      'مطابقة تامة 1:1 مؤكدة تجريبياً في مواضع متعددة (حديث 1: الأعمال بالنيات، حديث 100: إن الله لا يقبض العلم، حديث 500: الاستنجاء، حديث 1000: صلاة السفر).',
  },
  nawawi40: {
    bookId: 'nawawi40',
    bookNameAr: 'الأربعون النووية',
    localEditionSystem: 'ترقيم المتن المعياري للأحاديث الـ 42',
    remoteApiEdition: 'eng-nawawi',
    status: 'verified',
    concordanceProof:
      'مطابقة تامة 1:1 مؤكدة لجميع الأحاديث من 1 إلى 42 نصاً وترجمة.',
  },
  qudsi40: {
    bookId: 'qudsi40',
    bookNameAr: 'الأحاديث القدسية الأربعون',
    localEditionSystem: 'ترقيم متن الأحاديث القدسية المعتمد (1 إلى 40)',
    remoteApiEdition: 'eng-qudsi',
    status: 'verified',
    concordanceProof:
      'مطابقة تامة 1:1 مؤكدة لجميع الأحاديث من 1 إلى 40 نصاً وترجمة.',
  },
  shahwaliullah40: {
    bookId: 'shahwaliullah40',
    bookNameAr: 'الأربعون الدهلوية',
    localEditionSystem: 'ترقيم الأربعين المسندة للشاه ولي الله الدهلوي (1 إلى 40)',
    remoteApiEdition: 'eng-dehlawi',
    status: 'verified',
    concordanceProof:
      'مطابقة تامة 1:1 مؤكدة (حديث 1: ليس الخبر كالمعاينة، حديث 2: الحرب خدعة، حديث 3: المسلم مرآة المسلم).',
  },
  muslim: {
    bookId: 'muslim',
    bookNameAr: 'صحيح مسلم',
    localEditionSystem: 'ترقيم محمد فؤاد عبد الباقي (1 إلى 3033)',
    remoteApiEdition: 'eng-muslim',
    status: 'concordance_required',
    concordanceProof:
      'انفصال تام في الترقيم بالرقم المفرد؛ مثال: حديث 100 محلياً في عبد الباقي (لا يدخل الجنة إلا نفس مسلمة)، يقابله في المستودع حديث طلحة في وفد نجد. يتطلب جدول مطابقة نصي ثنائي.',
  },
  abudawud: {
    bookId: 'abudawud',
    bookNameAr: 'سنن أبي داود',
    localEditionSystem: 'ترقيم عزت عبيد الدعاس / دار السلام',
    remoteApiEdition: 'eng-abudawud',
    status: 'concordance_required',
    concordanceProof:
      'تباين في الترقيم؛ مثال: حديث 100 محلياً (التور من الصفر)، يقابله في المستودع حديث مسح الرأس. يتطلب جدول مطابقة ثنائي.',
  },
  tirmidhi: {
    bookId: 'tirmidhi',
    bookNameAr: 'جامع الترمذي',
    localEditionSystem: 'ترقيم أحمد شاكر / كمال الحوت',
    remoteApiEdition: 'eng-tirmidhi',
    status: 'concordance_required',
    concordanceProof:
      'تباين في ترقيم الأبواب والمكررات والأحاديث؛ يتطلب جدول مطابقة ثنائي.',
  },
  nasai: {
    bookId: 'nasai',
    bookNameAr: 'سنن النسائي (المجتبى)',
    localEditionSystem: 'ترقيم عبد الفتاح أبو غدة',
    remoteApiEdition: 'eng-nasai',
    status: 'concordance_required',
    concordanceProof:
      'تباين في الترقيم بين طبعة أبي غدة وترقيم المستودع؛ يتطلب جدول مطابقة ثنائي.',
  },
  ibnmajah: {
    bookId: 'ibnmajah',
    bookNameAr: 'سنن ابن ماجه',
    localEditionSystem: 'ترقيم محمد فؤاد عبد الباقي',
    remoteApiEdition: 'eng-ibnmajah',
    status: 'concordance_required',
    concordanceProof:
      'تباين تدريجي في ترقيم أبواب المقدمة والمكررات؛ يتطلب جدول مطابقة ثنائي.',
  },
  malik: {
    bookId: 'malik',
    bookNameAr: 'موطأ الإمام مالك',
    localEditionSystem: 'ترقيم رواية يحيى الليثي المصححة',
    remoteApiEdition: 'eng-malik',
    status: 'concordance_required',
    concordanceProof:
      'اختلاف ترقيم الروايات (يحيى الليثي مقابل الشيباني وأبي مصعب)؛ يتطلب جدول مطابقة ثنائي.',
  },
};

/**
 * Books where edition numbering is strictly proven and verified 1:1 with remote translation editions.
 * Books not in this list require an explicit concordance table to prevent mismatched text attributions.
 */
export const VERIFIED_CONCORDANT_BOOKS: readonly string[] = [
  'bukhari',
  'nawawi40',
  'qudsi40',
  'shahwaliullah40',
];

export function getBookTranslationSupport(bookId: string): TranslationSupportStatus {
  if (!BOOK_API_CODE_MAP[bookId]) {
    return 'unsupported';
  }
  if (!VERIFIED_CONCORDANT_BOOKS.includes(bookId)) {
    return 'concordance_required';
  }
  return 'verified';
}

/**
 * Checks if translations are available for a given book.
 */
export function isBookTranslationAvailable(bookId: string): boolean {
  return getBookTranslationSupport(bookId) === 'verified';
}

/**
 * Fetches a single hadith translation on-demand with local cache.
 */
export async function fetchHadithTranslation(
  bookId: string,
  hadithNumber: number,
  langCode: string
): Promise<HadithTranslationResult | null> {
  // Prevent unverified translation attribution if book has divergent numbering
  if (getBookTranslationSupport(bookId) !== 'verified') {
    return null;
  }

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

    const cleanText = item.text.trim();

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
