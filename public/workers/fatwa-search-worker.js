/**
 * Dedicated Web Worker for Non-blocking Arabic Semantic Search.
 * Runs in background thread, offloading all NLP, Stemming & Scoring from the main thread.
 */

const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;
const PUNCTUATION_REGEX = /[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"']/g;

function normalizeArabic(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(TASHKEEL_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenizeArabic(query) {
  const norm = normalizeArabic(query);
  if (!norm) return [];
  return norm.split(/\s+/).filter((t) => t.length > 0);
}

const ARABIC_STOP_WORDS = new Set([
  'ما', 'هل', 'من', 'عن', 'في', 'الي', 'الى', 'علي', 'على', 'حكم', 'ماحكم',
  'هو', 'هي', 'هم', 'هن', 'ان', 'انما', 'او', 'ثم', 'مع', 'هذا', 'هذه', 'ذلك',
  'تلك', 'التي', 'الذي', 'الذين', 'اللاتي', 'سؤال', 'جواب', 'فتوى', 'شيخ', 'قال',
  'قيل', 'كيف', 'متى', 'اين', 'ماذا', 'لماذا', 'يا', 'ايها', 'لو', 'اذا', 'اريد',
  'معرفة', 'مسالة', 'بيان', 'توضيح', 'شرح', 'يصلح', 'يجوز', 'حلال', 'حرام'
]);

const FIQH_SYNONYM_MAP = {
  'اصلي': ['صلاة', 'صلاه', 'صلي'],
  'يصلي': ['صلاة', 'صلاه', 'صلي'],
  'تصلي': ['صلاة', 'صلاه', 'صلي'],
  'نصلي': ['صلاة', 'صلاه', 'صلي'],
  'صليت': ['صلاة', 'صلاه', 'صلي'],
  'صلاتي': ['صلاة', 'صلاه', 'صلي'],
  'صلوات': ['صلاة', 'صلاه', 'صلي'],
  'طياره': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'طيارة': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'الطياره': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'الطيارة': ['طائرة', 'طائره', 'سفر', 'طيران'],
  'طائره': ['طائرة', 'طائره', 'طيارة', 'سفر', 'طيران'],
  'طائرة': ['طائرة', 'طائره', 'طيارة', 'سفر', 'طيران'],
  'اصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'يصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'تصوم': ['صيام', 'صوم', 'صائم', 'رمضان'],
  'صمت': ['صيام', 'صوم', 'رمضان'],
  'صائم': ['صيام', 'صوم', 'رمضان'],
  'صيامي': ['صيام', 'صوم', 'رمضان'],
  'بخاخ': ['بخاخ', 'ربو', 'مفطرات', 'صيام'],
  'قطرة': ['قطرة', 'قطره', 'عين', 'اذن', 'مفطرات', 'صيام'],
  'توضات': ['وضوء', 'طهارة', 'طاهره', 'غسل'],
  'اتوضا': ['وضوء', 'طهارة', 'طاهره'],
  'شراب': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'الشراب': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'شرابات': ['جورب', 'جوارب', 'خف', 'خفين', 'مسح'],
  'فلوس': ['مال', 'اموال', 'نقود', 'زكاة', 'زكاه'],
  'الفلوس': ['مال', 'اموال', 'نقود', 'زكاة', 'زكاه'],
  'ذهب': ['ذهب', 'حلي', 'مجوهرات', 'زكاة', 'نساء'],
  'تقسيط': ['تقسيط', 'بيع', 'اجل', 'زيادة', 'معاملات'],
  'قرض': ['قرض', 'ربا', 'فوائد', 'بنك', 'بنوك'],
  'بنك': ['بنك', 'بنوك', 'فوائد', 'ربا', 'ودائع'],
  'تزوجت': ['نكاح', 'زواج', 'عقد', 'مهر', 'زوجة'],
  'طلقت': ['طلاق', 'غضب', 'عدة', 'خلع', 'فراق'],
  'حجاب': ['حجاب', 'ستر', 'نقاب', 'لباس', 'نساء'],
  'ميراث': ['ميراث', 'تركة', 'ورثة', 'تركه', 'وصية', 'وصيه'],
  'دخان': ['تدخين', 'سجائر', 'شيشة', 'محرمات'],
  'شيشة': ['تدخين', 'شيشة', 'شيشه', 'سجائر'],
  'فيب': ['تدخين', 'الكترونية', 'سجائر', 'فيب'],
  'موسيقى': ['موسيقى', 'معازف', 'اغاني', 'طرب'],
  'ابراج': ['ابراج', 'تنجيم', 'كهانة', 'عرافة', 'سحر'],
  'سحر': ['سحر', 'عين', 'حسد', 'رقية', 'شعوذة'],
};

function extractConceptGroups(query) {
  const allTokens = tokenizeArabic(query);
  const coreTokens = allTokens.filter((t) => !ARABIC_STOP_WORDS.has(t) && t.length > 1);
  const tokensToUse = coreTokens.length > 0 ? coreTokens : allTokens;

  return tokensToUse.map((t) => {
    const variants = new Set();
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
    return {
      originalToken: t,
      allVariants: Array.from(variants).filter((v) => v.length > 1),
    };
  });
}

function tokenMatch(target, token) {
  if (!target || !token) return false;
  if (target.includes(token)) return true;
  if (token.startsWith('ال') && token.length > 3) {
    if (target.includes(token.slice(2))) return true;
  } else {
    if (target.includes('ال' + token)) return true;
  }
  if ((token === 'ابن' || token === 'بن') && (target.includes('ابن') || target.includes('بن'))) {
    return true;
  }
  return false;
}

let itemsIndex = [];

self.onmessage = function (e) {
  const { type, payload } = e.data;

  if (type === 'INIT_INDEX') {
    itemsIndex = payload.map((item) => {
      const text = `${item.title} ${item.question} ${item.scholar} ${(item.tags || []).join(' ')}`;
      return {
        item,
        normText: normalizeArabic(text),
        normTitle: normalizeArabic(item.title),
        normQuestion: normalizeArabic(item.question),
        normScholar: normalizeArabic(item.scholar),
        normTags: normalizeArabic((item.tags || []).join(' ')),
        normCategory: normalizeArabic(item.category || ''),
      };
    });
    self.postMessage({ type: 'INDEX_READY', totalCount: itemsIndex.length });
  }

  if (type === 'SEARCH') {
    const { query, category, scholar, limit } = payload;
    const normQuery = normalizeArabic(query);
    const concepts = extractConceptGroups(query);

    const results = [];

    for (let i = 0; i < itemsIndex.length; i++) {
      const entry = itemsIndex[i];

      // Category filter
      if (category && category !== 'all' && entry.item.category !== category) {
        continue;
      }

      // Scholar filter
      if (scholar && scholar !== 'all') {
        const normSch = normalizeArabic(scholar);
        if (!entry.normScholar.includes(normSch)) continue;
      }

      if (!normQuery) {
        results.push({ item: entry.item, score: 10 });
        continue;
      }

      let score = 0;

      if (entry.normTitle === normQuery) score += 5000;
      else if (entry.normTitle.startsWith(normQuery)) score += 3000;
      else if (entry.normTitle.includes(normQuery)) score += 2000;

      let conceptsMatched = 0;
      for (const concept of concepts) {
        let conceptMatched = false;
        let cScore = 0;

        for (const v of concept.allVariants) {
          if (tokenMatch(entry.normTitle, v)) {
            cScore = Math.max(cScore, 300);
            conceptMatched = true;
          } else if (tokenMatch(entry.normQuestion, v)) {
            cScore = Math.max(cScore, 100);
            conceptMatched = true;
          } else if (tokenMatch(entry.normTags, v)) {
            cScore = Math.max(cScore, 80);
            conceptMatched = true;
          } else if (tokenMatch(entry.normScholar, v)) {
            cScore = Math.max(cScore, 50);
            conceptMatched = true;
          }
        }

        if (conceptMatched) {
          score += cScore;
          conceptsMatched++;
        }
      }

      if (conceptsMatched > 0) {
        if (concepts.length > 1) {
          if (conceptsMatched === concepts.length) {
            score = score * 5 + 1500;
          } else {
            score = Math.floor(score * 0.3);
          }
        }
        results.push({ item: entry.item, score });
      }
    }

    if (normQuery) {
      results.sort((a, b) => b.score - a.score);
    }

    const finalResults = results.slice(0, limit || 60).map((r) => r.item);
    self.postMessage({ type: 'SEARCH_RESULTS', query, results: finalResults });
  }
};
