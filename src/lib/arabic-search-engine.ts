'use client';

import { normalizeArabic, tokenizeArabic } from '@/lib/arabic-normalizer';

/**
 * Arabic Stop Words that should have reduced weight or be ignored during token matching.
 */
const ARABIC_STOP_WORDS = new Set([
  'ما', 'هل', 'من', 'عن', 'في', 'الي', 'الى', 'علي', 'على', 'حكم', 'ماحكم',
  'هو', 'هي', 'هم', 'هن', 'ان', 'انما', 'او', 'ثم', 'مع', 'هذا', 'هذه', 'ذلك',
  'تلك', 'التي', 'الذي', 'الذين', 'اللاتي', 'سؤال', 'جواب', 'فتوى', 'شيخ', 'قال',
  'قيل', 'كيف', 'متى', 'اين', 'ماذا', 'لماذا', 'يا', 'ايها', 'لو', 'اذا', 'اريد',
  'معرفة', 'مسالة', 'بيان', 'توضيح', 'شرح', 'يصلح', 'يجوز', 'حلال', 'حرام'
]);

/**
 * Extensive Fiqh Morphological Stem & Synonym Map.
 */
const FIQH_SYNONYM_MAP: Record<string, string[]> = {
  // الصلاة وتصريفاتها
  'اصلي': ['صلاة', 'صلاه', 'صلي'],
  'يصلي': ['صلاة', 'صلاه', 'صلي'],
  'تصلي': ['صلاة', 'صلاه', 'صلي'],
  'نصلي': ['صلاة', 'صلاه', 'صلي'],
  'صليت': ['صلاة', 'صلاه', 'صلي'],
  'صلاتي': ['صلاة', 'صلاه', 'صلي'],
  'صلوات': ['صلاة', 'صلاه', 'صلي'],
  'مصلي': ['صلاة', 'صلاه', 'صلي'],
  'طياره': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'طيارة': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'الطياره': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'الطيارة': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'طائره': ['طائرة', 'طائره', 'طيارة', 'سفر', 'طيران'],
  'طائرة': ['طائرة', 'طائره', 'طيارة', 'سفر', 'طيران'],
  'قطار': ['قطار', 'سفر', 'صلاة'],

  // الصيام وتصريفاته
  'اصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'يصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'تصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'نصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'صمت': ['صيام', 'صوم', 'رمضان'],
  'صائم': ['صيام', 'صوم', 'رمضان'],
  'صيامي': ['صيام', 'صوم', 'رمضان'],
  'صومي': ['صيام', 'صوم', 'رمضان'],
  'فطرت': ['فطر', 'مفطرات', 'صيام', 'قضاء'],
  'افطرت': ['فطر', 'مفطرات', 'صيام', 'قضاء'],
  'بخاخ': ['بخاخ', 'ربو', 'مفطرات', 'صيام'],
  'قطرة': ['قطرة', 'قطره', 'عين', 'اذن', 'مفطرات', 'صيام'],
  'قطره': ['قطرة', 'قطره', 'عين', 'اذن', 'مفطرات', 'صيام'],

  // الطهارة والوضوء وتصريفاتها
  'توضات': ['وضوء', 'طهارة', 'طاهره', 'غسل'],
  'اتوضا': ['وضوء', 'طهارة', 'طاهره'],
  'يتوضا': ['وضوء', 'طهارة', 'طاهره'],
  'وضوئي': ['وضوء', 'طهارة'],
  'اغتسلت': ['غسل', 'جنابة', 'جنابه', 'طهارة'],
  'اغتسل': ['غسل', 'جنابة', 'جنابه', 'طهارة'],
  'يغتسل': ['غسل', 'جنابة', 'جنابه', 'طهارة'],
  'شراب': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'الشراب': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'شرابات': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'جرابات': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'جوارب': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'خفين': ['خف', 'خفين', 'جورب', 'جوارب', 'مسح'],

  // الزكاة والذهب والمال
  'فلوس': ['مال', 'اموال', 'نقود', 'زكاة', 'زكاه'],
  'الفلوس': ['مال', 'اموال', 'نقود', 'زكاة', 'زكاه'],
  'مصاري': ['مال', 'اموال', 'نقود', 'زكاة', 'زكاه'],
  'ذهب': ['ذهب', 'حلي', 'مجوهرات', 'زكاة', 'نساء'],
  'الذهب': ['ذهب', 'حلي', 'مجوهرات', 'زكاة', 'نساء'],
  'حلي': ['ذهب', 'حلي', 'زكاة', 'زينة'],
  'مجوهرات': ['ذهب', 'حلي', 'زكاة', 'زينة'],
  'اسهم': ['اسهم', 'تجارة', 'زكاة', 'بورصة', 'تداول'],
  'عملات': ['عملات', 'رقمية', 'بيتكوين', 'تجارة', 'صرف'],
  'بيتكوين': ['عملات', 'رقمية', 'بيتكوين', 'مشفرة', 'تداول'],

  // المعاملات والبيوع
  'تقسيط': ['تقسيط', 'بيع', 'اجل', 'زيادة', 'معاملات'],
  'قرض': ['قرض', 'ربا', 'فوائد', 'بنك', 'بنوك'],
  'سلفة': ['قرض', 'سلف', 'ربا', 'دين'],
  'سلف': ['قرض', 'سلف', 'ربا', 'دين'],
  'بنك': ['بنك', 'بنوك', 'فوائد', 'ربا', 'ودائع'],
  'بنوك': ['بنك', 'بنوك', 'فوائد', 'ربا', 'ودائع'],
  'فائدة': ['فوائد', 'ربا', 'بنك', 'حساب'],
  'فوائد': ['فوائد', 'ربا', 'بنك', 'حساب'],
  'شقة': ['عقار', 'تمويل', 'شراء', 'بيوع', 'ايجار'],
  'عمارة': ['عقار', 'تمويل', 'شراء', 'بيوع', 'ايجار'],
  'سيارة': ['سيارة', 'سياره', 'تقسيط', 'مرابحة', 'تمويل'],

  // الأسرة والزواج والطلاق
  'تزوجت': ['نكاح', 'زواج', 'عقد', 'مهر', 'زوجة'],
  'اتزوج': ['نكاح', 'زواج', 'عقد', 'مهر', 'زوجة'],
  'يتزوج': ['نكاح', 'زواج', 'عقد', 'مهر', 'زوجة'],
  'زواجي': ['نكاح', 'زواج', 'عقد', 'مهر', 'زوجة'],
  'طلقت': ['طلاق', 'غضب', 'عدة', 'خلع', 'فراق'],
  'اطلق': ['طلاق', 'غضب', 'عدة', 'خلع', 'فراق'],
  'يطلق': ['طلاق', 'غضب', 'عدة', 'خلع', 'فراق'],
  'مطلقة': ['طلاق', 'عدة', 'رجعة', 'نفقة'],
  'حجاب': ['حجاب', 'ستر', 'نقاب', 'لباس', 'نساء'],
  'النقاب': ['حجاب', 'نقاب', 'ستر', 'نساء'],
  'خمار': ['حجاب', 'نقاب', 'ستر', 'نساء'],
  'ميراث': ['ميراث', 'تركة', 'ورثة', 'تركه', 'وصية', 'وصيه'],
  'ورث': ['ميراث', 'تركة', 'ورثة', 'وصية'],
  'مات': ['موت', 'وفاة', 'ميراث', 'جنازة', 'تركة'],
  'توفي': ['موت', 'وفاة', 'ميراث', 'جنازة', 'تركة'],
  'متوفي': ['موت', 'وفاة', 'ميراث', 'جنازة', 'تركة'],

  // قضايا معاصرة
  'دخان': ['تدخين', 'سجائر', 'شيشة', 'محرمات'],
  'شيشة': ['تدخين', 'شيشة', 'شيشه', 'سجائر'],
  'فيب': ['تدخين', 'الكترونية', 'سجائر', 'فيب'],
  'موسيقى': ['موسيقى', 'معازف', 'اغاني', 'طرب'],
  'اغاني': ['موسيقى', 'معازف', 'اغاني', 'غناء'],
  'معازف': ['موسيقى', 'معازف', 'اغاني'],
  'ابراج': ['ابراج', 'تنجيم', 'كهانة', 'عرافة', 'سحر'],
  'تنجيم': ['ابراج', 'تنجيم', 'كهانة', 'شرك'],
  'سحر': ['سحر', 'عين', 'حسد', 'رقية', 'شعوذة'],
  'عين': ['عين', 'حسد', 'رقية', 'اذكار', 'شفاء'],
  'حسد': ['عين', 'حسد', 'رقية', 'اذكار'],

  // ─── توسعة دلالية: صلات شائعة بالمرادفات والمفاهيم ───
  'صلاه': ['صلاة', 'مصلية', 'ركعة', 'سجود', 'ركوع', 'قيام', 'تكبير', 'تحية المسجد'],
  'صلاة': ['صلاه', 'مصلية', 'ركعة', 'سجود', 'ركوع', 'قيام'],
  'وضوء': ['طهارة', 'ماء', 'نواقض', 'مسح', 'غسل'],
  'طهاره': ['طهارة', 'وضوء', 'غسل', 'جنابه', 'نجاسه'],
  'جنابه': ['جنابة', 'غسل', 'اطلاق', 'طهارة', 'استحضار'],
  'حيض': ['حياة', 'نفساء', 'دم', 'صلاة', 'قراءة القرآن', 'طهارة'],
  'نفساء': ['نفاس', 'ولاده', 'حيض', 'طهارة'],
  'جمعه': ['جمعة', 'خطبه', 'ظهر', 'فرض', 'جماعه'],
  'عيدين': ['عيد', 'تكبير', 'أضحى', 'فطر', 'خطبة'],
  'تراويح': ['قيام', 'رمضان', 'سنة', 'وترة', 'جمعة'],
  'قصر': ['سفر', 'رباع', 'ركعتين', 'جمع', 'مسافر'],
  'سفر': ['قصر', 'جمع', 'مسافر', 'مسافة', 'طواف القدوم'],

  'زكاه': ['زكاة', 'نصاب', 'حول', 'ربع العشر', 'صدقه', 'مستحقين'],
  'صدقه': ['صدقة', 'زكاة', 'تصدق', 'جارية', 'خيرات'],
  'صيام': ['صوم', 'رمضان', 'نوه', 'قضاء', 'فديه', 'إمساك'],
  'رمضان': ['صيام', 'صوم', 'تراويح', 'ليلة القدر', 'اعتكاف'],
  'حج': ['عمرة', 'إحرام', 'طواف', 'سعي', 'وقفه', 'مناسك'],
  'عمره': ['عمرة', 'حج', 'إحرام', 'طواف', 'سعي'],

  'نكاح': ['زواج', 'عقد', 'مهر', 'ولي', 'شهود', 'زوجة'],
  'زواج': ['نكاح', 'عقد', 'مهر', 'خطبة', 'زوجين'],
  'طلاق': ['طلاق', 'رجعة', 'عدة', 'خلع', 'فراق', 'بينونه'],
  'خُلع': ['خلع', 'طلاق', 'عوض', 'رجعة'],
  'رضاع': ['رضاعة', 'حرم', 'أخت', 'عمه', 'خالة'],

  'ربا': ['فوائد', 'بنوك', 'قرض', 'زيادة', 'تأجيل', 'دين'],
  'شركه': ['شركة', 'شريك', 'رأس مال', 'مضاربة', 'مشاركة'],
  'تامين': ['تأمين', 'تعاوني', 'تجاري', 'خطر', 'غرر'],
  'صرف': ['صرفة', 'عملات', 'نقد', 'حوالة', 'سعر'],
  'فوركس': ['فوركس', 'عملات', 'مضاربة', 'غرر', 'رافعة'],
  'مضاربه': ['مضاربة', 'ربح', 'خسارة', 'رأس مال', 'عمل'],
  'مرابحه': ['مرابحة', 'تمويل', 'ثمن', 'ربح', 'بنك'],

  'شرك': ['شرك', 'توحيد', 'عبادة', 'أنداد', 'كفر'],
  'بدعه': ['بدعة', 'محدثات', 'سنة', 'ضلال', 'أمر جديد'],
  'كفر': ['كفر', 'ارتداد', 'جحود', 'استحلال'],
  'طاقه': ['طاقة', 'شمسية', 'رياح', 'نظيف', 'بديل'],
  'غناء': ['غناء', 'موسيقى', 'معازف', 'لهو', 'فجور'],
  'تدخين': ['تدخين', 'سجائر', 'شيشة', 'معين', 'ضار'],
  'حشيش': ['مخدرات', 'حشيش', 'بانج', 'سكر', 'تحريم'],
  'مخدرات': ['مخدرات', 'حشيش', 'بانج', 'إدمان', 'حرام'],
  'صوره': ['صورة', 'تصوير', 'تمثال', 'تجسيم', 'ملائكة'],
  'كلب': ['كلب', 'نجس', 'طهارة', 'غسل سبع'],
  'خنزير': ['خنزير', 'نجس', 'لحم', 'حرام'],
  'اذكر': ['أذكار', 'ذكر', 'صباح', 'مساء', 'حصن'],
  'دعاء': ['دعاء', 'استجابة', 'رقية', 'حاجة', 'قضاء'],
  'قران': ['قرآن', 'تلاوة', 'حفظ', 'تجويد', 'سورة'],
  'حديث': ['حديث', 'أثر', 'سند', 'متن', 'رواية'],
  'عشر': ['عشر', 'ذو الحجة', 'تكبير', 'أضحية', 'صيام'],
  'اضحيه': ['أضحية', 'أضحى', 'أضحى', 'شاة', 'سنة'],
  'طلاق غضب': ['غضبان', 'مجنون', 'مغلب', 'إغلاق'],
  'زوجه': ['زوجة', 'زوج', 'نكاح', 'نفقة', 'حق'],
  'زوج': ['زوج', 'زوجة', 'نكاح', 'عقد', 'حق'],
  'ولد': ['ولد', 'أولاد', 'تربية', 'نفقة', 'حضانة'],
  'اب': ['أب', 'والد', 'بر', 'ميراث', 'حق'],
  'ام': ['أم', 'والدة', 'بر', 'رضاعة', 'ميراث'],
};

/**
 * Concept Group Representation for Multi-Term Queries.
 */
interface QueryConcept {
  originalToken: string;
  allVariants: string[];
}

export function extractConceptGroups(query: string): QueryConcept[] {
  const allTokens = tokenizeArabic(query);
  const coreTokens = allTokens.filter((t) => !ARABIC_STOP_WORDS.has(t) && t.length > 1);
  const tokensToUse = coreTokens.length > 0 ? coreTokens : allTokens;

  return tokensToUse.map((t) => {
    const variants = new Set<string>();
    variants.add(t);
    if (t.startsWith('ال') && t.length > 3) {
      variants.add(t.slice(2));
    }
    const cleanT = t.replace(/^ال/, '');
    const mapped = FIQH_SYNONYM_MAP[t] || FIQH_SYNONYM_MAP[cleanT];
    if (mapped) {
      for (const syn of mapped) {
        variants.add(normalizeArabic(syn));
      }
    }
    // Semantic domain expansion (lightweight): known fiqh domain terms pull
    // their concept family even when the exact word isn't in the synonym map.
    const domain = SEMANTIC_DOMAINS[cleanT];
    if (domain) {
      for (const term of domain) variants.add(term);
    }
    return {
      originalToken: t,
      allVariants: Array.from(variants).filter((v) => v.length > 1),
    };
  });
}

/**
 * Semantic domain families — normalized fiqh terms that co-occur. When a query
 * token belongs to a family, sibling terms become weak signals (they widen the
 * net without hijacking relevance: the scorer weights title/question matches
 * far above these).
 */
const SEMANTIC_DOMAINS: Record<string, string[]> = buildSemanticDomains();

function buildSemanticDomains(): Record<string, string[]> {
  const families: string[][] = [
    ['صلاه', 'صوم', 'زكاه', 'حج', 'نكاح', 'طلاق', 'بيوع', 'شرك'],
    ['وضوء', 'طهاره', 'جنابه', 'حيض', 'مسح', 'غسل', 'نجاسه'],
    ['زكاه', 'نصاب', 'صدقه', 'فطر', 'حول', 'مال'],
    ['صوم', 'صيام', 'رمضان', 'قضاء', 'كفاره', 'فديه'],
    ['حج', 'عمره', 'احرام', 'طواف', 'سعي', 'مناسك'],
    ['نكاح', 'زواج', 'مهر', 'طلاق', 'خلع', 'عدد', 'نفقه', 'حضانه', 'ميراث'],
    ['ربا', 'فوائد', 'بنك', 'قرض', 'بيع', 'ايجار', 'تقسيط', 'مرابحه', 'تامين'],
    ['شرك', 'بدعه', 'كفر', 'سحر', 'رقيه', 'عين', 'حسد'],
  ];
  const map: Record<string, string[]> = {};
  for (const family of families) {
    for (const term of family) {
      map[term] = family.filter((x) => x !== term);
    }
  }
  return map;
}

/**
 * Extracts and expands keywords with Arabic morphological roots and synonyms.
 */
export function extractAndExpandTokens(query: string): {
  coreTokens: string[];
  expandedKeywords: string[];
  rawQuery: string;
} {
  const concepts = extractConceptGroups(query);
  const coreTokens = concepts.map((c) => c.originalToken);
  const expandedSet = new Set<string>();

  for (const c of concepts) {
    for (const v of c.allVariants) {
      expandedSet.add(v);
    }
  }

  return {
    coreTokens,
    expandedKeywords: Array.from(expandedSet),
    rawQuery: query.trim(),
  };
}

/**
 * Intelligent Multi-Concept Fiqh Semantic Relevance Scorer
 */
export function scoreArabicSearch(
  query: string,
  normTitle: string,
  normQuestion: string,
  normScholar: string,
  normTags: string
): number {
  const normQuery = normalizeArabic(query);
  if (!normQuery) return 0;

  // 1. Exact phrase matches (Highest possible tier)
  if (normTitle === normQuery) {
    return 5000;
  }
  if (normTitle.startsWith(normQuery)) {
    return 3000;
  } else if (normTitle.includes(normQuery)) {
    return 2000;
  }

  const concepts = extractConceptGroups(query);
  if (concepts.length === 0) return 0;

  let score = 0;
  let conceptsMatched = 0;

  for (const concept of concepts) {
    let conceptMatchedInDoc = false;
    let conceptScore = 0;

    for (const variant of concept.allVariants) {
      const inTitle = tokenMatch(normTitle, variant);
      const inQuestion = tokenMatch(normQuestion, variant);
      const inScholar = tokenMatch(normScholar, variant);
      const inTags = tokenMatch(normTags, variant);

      if (inTitle) {
        conceptScore = Math.max(conceptScore, 300);
        conceptMatchedInDoc = true;
      } else if (inQuestion) {
        conceptScore = Math.max(conceptScore, 100);
        conceptMatchedInDoc = true;
      } else if (inTags) {
        conceptScore = Math.max(conceptScore, 80);
        conceptMatchedInDoc = true;
      } else if (inScholar) {
        conceptScore = Math.max(conceptScore, 50);
        conceptMatchedInDoc = true;
      }
    }

    if (conceptMatchedInDoc) {
      score += conceptScore;
      conceptsMatched++;
    }
  }

  // Precision Guard: Must match at least one concept
  if (conceptsMatched === 0) {
    return 0;
  }

  // Multi-Concept Intersection Multiplier (The Key to Google-like Precision)
  // If a query has 2 concepts (e.g. 'صلاة' + 'طائرة'), matching BOTH concepts gives massive priority!
  if (concepts.length > 1) {
    if (conceptsMatched === concepts.length) {
      // 100% of concepts matched -> 5x multiplier!
      score = score * 5 + 1500;
    } else {
      // Partial match (e.g. 1 out of 2 concepts) -> Penalize heavily so partials don't outrank complete matches
      score = Math.floor(score * 0.3);
    }
  }

  return score;
}

/**
 * Flexible Arabic token matcher (handles 'ال', 'ابن/بن', etc.)
 */
export function tokenMatch(target: string, token: string): boolean {
  if (!target || !token) return false;

  if (target.includes(token)) return true;

  // With / without "ال"
  if (token.startsWith('ال') && token.length > 3) {
    if (target.includes(token.slice(2))) return true;
  } else {
    if (target.includes('ال' + token)) return true;
  }

  // Ibn / Bin
  if ((token === 'ابن' || token === 'بن') && (target.includes('ابن') || target.includes('بن'))) {
    return true;
  }

  return false;
}
