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
  localFile: string;
  localEditionSystem: string;
  localTotalRecords: number;
  remoteApiEdition: string;
  remoteTotalRecords?: number;
  status: TranslationSupportStatus;
  verifiedLanguages: readonly string[];
  verifiedScope: string;
  concordanceProof: string;
}

/**
 * دليل مطابقة النسخ والترقيمات (Concordance Evidence Catalog):
 * يوثق التحقق التجريبي الدقيق من مطابقة أرقام الأحاديث بين النسخة المحلية ومستودع الترجمات (Hadith_API).
 * القاعدة العلمية الصارمة: ما لم تثبت مطابقته التامة 1:1 لا يُصنف verified بل يُصنف concordance_required.
 * لا يُعمم فحص عينات جزئية على كامل الكتاب، ولا تُجاز لغات لم يتم فحص سجلاتها فعلياً.
 */
export const CONCORDANCE_EVIDENCE_CATALOG: Record<string, ConcordanceEvidenceItem> = {
  nawawi40: {
    bookId: 'nawawi40',
    bookNameAr: 'الأربعون النووية',
    localFile: 'public/data/hadith/nawawi40.json',
    localEditionSystem: 'ترقيم المتن المعياري للأحاديث الـ 42',
    localTotalRecords: 42,
    remoteApiEdition: 'eng-nawawi',
    remoteTotalRecords: 42,
    status: 'verified',
    verifiedLanguages: ['eng'],
    verifiedScope: 'الأحاديث من 1 إلى 42 كاملة بنسبة 100% (حصراً باللغة الإنجليزية)',
    concordanceProof:
      'فحص ومقارنة شملت جميع الأحاديث الـ 42 سجلاً بسجل من 1 إلى 42 بين nawawi40.json ومستودع eng-nawawi، وثبت التطابق التام 1:1 في كافة السجلات (حديث 1: الأعمال بالنيات، حديث 42: يا ابن آدم إنك ما دعوتني ورجوتني). التحقق محصور في اللغة الإنجليزية eng-nawawi ولا يُعمم على لغات أخرى غير مفحوصة أو مفقودة.',
  },
  qudsi40: {
    bookId: 'qudsi40',
    bookNameAr: 'الأحاديث القدسية الأربعون',
    localFile: 'public/data/hadith/qudsi40.json',
    localEditionSystem: 'ترقيم متن الأحاديث القدسية المعتمد (1 إلى 40)',
    localTotalRecords: 40,
    remoteApiEdition: 'eng-qudsi',
    remoteTotalRecords: 40,
    status: 'verified',
    verifiedLanguages: ['eng'],
    verifiedScope: 'الأحاديث من 1 إلى 40 كاملة بنسبة 100% (حصراً باللغة الإنجليزية)',
    concordanceProof:
      'فحص ومقارنة شملت جميع الأحاديث الأربعين كاملة سجلاً بسجل بين qudsi40.json ومستودع eng-qudsi، وثبت التطابق التام 1:1 في كافة السجلات. التحقق محصور في الإنجليزية eng-qudsi.',
  },
  shahwaliullah40: {
    bookId: 'shahwaliullah40',
    bookNameAr: 'الأربعون الدهلوية',
    localFile: 'public/data/hadith/shahwaliullah40.json',
    localEditionSystem: 'ترقيم الأربعين المسندة للشاه ولي الله الدهلوي (1 إلى 40)',
    localTotalRecords: 40,
    remoteApiEdition: 'eng-dehlawi',
    remoteTotalRecords: 40,
    status: 'verified',
    verifiedLanguages: ['eng'],
    verifiedScope: 'الأحاديث من 1 إلى 40 كاملة بنسبة 100% (حصراً باللغة الإنجليزية)',
    concordanceProof:
      'فحص ومقارنة شملت جميع الأحاديث الأربعين كاملة سجلاً بسجل بين shahwaliullah40.json ومستودع eng-dehlawi، وثبت التطابق التام 1:1 في كافة السجلات. التحقق محصور في الإنجليزية eng-dehlawi.',
  },
  bukhari: {
    bookId: 'bukhari',
    bookNameAr: 'صحيح البخاري',
    localFile: 'public/data/hadith/bukhari.json',
    localEditionSystem: 'ترقيم فتح الباري للشاملة (ينتهي عند 7277)',
    localTotalRecords: 7277,
    remoteApiEdition: 'eng-bukhari',
    remoteTotalRecords: 7563,
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل؛ لا يجوز تعميم فحص عينات البداية على كامل الكتاب ولا على لغات لم تُفحص',
    concordanceProof:
      'فحص السجلات الفعلية يثبت فارقاً قدره 286 حديثاً بين النسختين (7277 محلياً مقابل 7563 في المستودع)؛ فالحديث الأخير في النسخة المحلية (رقم 7277) هو حديث: «كلمتان حبيبتان إلى الرحمن...»، بينما في المستودع البعيد الحديث 7277 هو: «Narrated Abdullah: The best talk is Allah Book»، وحديث «كلمتان» يقع في الرقم 7563. التطابق في عينة البداية لا يصح تعميمه على كامل الكتاب، وعليه عُلّق الربط مؤقتاً لحين اعتماد جدول مطابقة ثنائي.',
  },
  muslim: {
    bookId: 'muslim',
    bookNameAr: 'صحيح مسلم',
    localFile: 'public/data/hadith/muslim.json',
    localEditionSystem: 'ترقيم الشاملة المسلسل لكافة الأسانيد والمتابعات (ينتهي عند 7459)',
    localTotalRecords: 7459,
    remoteApiEdition: 'eng-muslim',
    remoteTotalRecords: 3033,
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل؛ تباين جذري في دلالة المعرف المفرد',
    concordanceProof:
      'فحص السجلات الفعلية يثبت تبايناً جذرياً في دلالة المعرف المفرد؛ فالحديث رقم 100 في muslim.json متنه: «غلظ القلوب والجفاء في المشرق والإيمان في أهل الحجاز» (كتاب الإيمان، حديث جابر)، بينما الحديث 100 في المستودع eng-muslim هو حديث طلحة بن عبيد الله في الأعرابي السائل عن شرائع الإسلام. الربط بالرقم المفرد يؤدي إلى نسبة ترجمة متن لمتن مغاير وعُلّق بالكامل.',
  },
  abudawud: {
    bookId: 'abudawud',
    bookNameAr: 'سنن أبي داود',
    localFile: 'public/data/hadith/abudawud.json',
    localEditionSystem: 'ترقيم سنن أبي داود للشاملة',
    localTotalRecords: 5276,
    remoteApiEdition: 'eng-abudawud',
    remoteTotalRecords: 5274,
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل',
    concordanceProof:
      'فحص السجلات الفعلية يثبت فارقاً في الإجمالي (5276 محلياً مقابل 5274 في المستودع). ورغم تطابق الحديث 100 في الوضوء من التور، فإن تباين ترقيم المراسيل وأبواب السنن عبر الأجزاء يمنع تعميم الفحص، وعُلّق الربط مؤقتاً.',
  },
  tirmidhi: {
    bookId: 'tirmidhi',
    bookNameAr: 'جامع الترمذي',
    localFile: 'public/data/hadith/tirmidhi.json',
    localEditionSystem: 'ترقيم جامع الترمذي للشاملة',
    localTotalRecords: 3956,
    remoteApiEdition: 'eng-tirmidhi',
    remoteTotalRecords: 3956,
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل',
    concordanceProof:
      'فحص تباين الطبعات (طبعة أحمد شاكر مقابل تحفة الأشراف وطبعة دار الغرب)؛ يتطلب جدول مطابقة معتمداً قبل إتاحة الترجمة.',
  },
  nasai: {
    bookId: 'nasai',
    bookNameAr: 'سنن النسائي (المجتبى)',
    localFile: 'public/data/hadith/nasai.json',
    localEditionSystem: 'ترقيم سنن النسائي (المجتبى)',
    localTotalRecords: 5758,
    remoteApiEdition: 'eng-nasai',
    remoteTotalRecords: 5758,
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل',
    concordanceProof:
      'تباين في دمج وفصل طرق الأحاديث وأرقام زوائد السنن؛ عُلّق الربط مؤقتاً.',
  },
  ibnmajah: {
    bookId: 'ibnmajah',
    bookNameAr: 'سنن ابن ماجه',
    localFile: 'public/data/hadith/ibnmajah.json',
    localEditionSystem: 'ترقيم سنن ابن ماجه للشاملة',
    localTotalRecords: 4341,
    remoteApiEdition: 'eng-ibnmajah',
    remoteTotalRecords: 4341,
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل',
    concordanceProof:
      'تباين ترقيم أحاديث المقدمة وأبواب الزهد والجنائز بين الطبعات؛ عُلّق الربط مؤقتاً.',
  },
  malik: {
    bookId: 'malik',
    bookNameAr: 'موطأ الإمام مالك',
    localFile: 'public/data/hadith/malik.json',
    localEditionSystem: 'ترقيم موطأ مالك (رواية يحيى الليثي)',
    localTotalRecords: 1858,
    remoteApiEdition: 'eng-malik',
    status: 'concordance_required',
    verifiedLanguages: [],
    verifiedScope: 'معلق بالكامل',
    concordanceProof:
      'اختلاف روايات الموطأ (رواية يحيى الليثي مقابل الشيباني وأبي مصعب الزهري)؛ عُلّق الربط مؤقتاً.',
  },
};

/**
 * خريطة الكتب واللغات المفحوصة والمثبتة بنسبة 1:1 بدقة كاملة.
 * لا يجوز فتح الترجمة لكتاب كامل اعتماداً على عينة جزئية، ولا للغات لم يتم التحقق منها.
 */
export const VERIFIED_CONCORDANCE_MAP: Record<string, readonly string[]> = {
  nawawi40: ['eng'],
  qudsi40: ['eng'],
  shahwaliullah40: ['eng'],
};

export const VERIFIED_CONCORDANT_BOOKS: readonly string[] = Object.keys(VERIFIED_CONCORDANCE_MAP);

export function getBookTranslationSupport(bookId: string, langCode?: string): TranslationSupportStatus {
  if (!BOOK_API_CODE_MAP[bookId]) {
    return 'unsupported';
  }
  const supportedLangs = VERIFIED_CONCORDANCE_MAP[bookId];
  if (!supportedLangs) {
    return 'concordance_required';
  }
  if (langCode && !supportedLangs.includes(langCode)) {
    return 'concordance_required';
  }
  return 'verified';
}

/**
 * Checks if translations are available for a given book.
 */
export function isBookTranslationAvailable(bookId: string, langCode?: string): boolean {
  return getBookTranslationSupport(bookId, langCode) === 'verified';
}

/**
 * Fetches a single hadith translation on-demand with local cache.
 */
export async function fetchHadithTranslation(
  bookId: string,
  hadithNumber: number,
  langCode: string
): Promise<HadithTranslationResult | null> {
  // Prevent unverified translation attribution if book or requested language has divergent/unverified numbering
  if (getBookTranslationSupport(bookId, langCode) !== 'verified') {
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
