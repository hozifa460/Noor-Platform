export function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    // Standardize peace upon him
    .replace(/\uFDFA/g, ' صلي الله عليه وسلم ')
    .replace(/\uFDFB/g, ' جل جلاله ')
    .replace(/\uFDFD/g, ' بسم الله الرحمن الرحيم ')
    .replace(/\uFDF0|\uFDF1/g, ' صلي الله عليه وسلم ')
    // Tashkeel / Harakat & Quranic marks
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Tatweel / Kashida
    .replace(/\u0640/g, '')
    // Alif variants
    .replace(/[أإآٱٲٳ]/g, 'ا')
    // Taa Marbuta
    .replace(/ة/g, 'ه')
    // Yaa / Alif Maqsura / Hamza on Yaa
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    // Waw with Hamza
    .replace(/ؤ/g, 'و')
    // Hamza standalone
    .replace(/ء/g, '')
    // Persian / Urdu variants
    .replace(/[کګڭڮ]/g, 'ك')
    .replace(/پ/g, 'ب')
    .replace(/چ/g, 'ج')
    .replace(/ژ/g, 'ز')
    .replace(/گ/g, 'ك')
    // Punctuation, symbols, quotes, and invisible formatting control marks
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'«»“”‏\u200B-\u200F\u202A-\u202E\uFEFF\uFFF0-\uFFFF\u00AD\u061C]/g, ' ')
    // Whitespace collapse
    .replace(/\s+/g, ' ')
    // Standardize spacing around 'صلي الله عليه و سلم' -> 'صلي الله عليه وسلم'
    .replace(/صلي\s+الله\s+عليه\s+و\s*سلم/g, 'صلي الله عليه وسلم')
    .trim()
    .toLowerCase();
}

export function extractHadithMatn(rawArabic) {
  if (!rawArabic) return '';

  const norm = normalizeArabicText(rawArabic);

  // Tier 1: Short text pass-through (<= 60 chars) - e.g. Shah Waliullah 40 pure matns
  if (norm.length <= 60) {
    return norm;
  }

  // Tier 2: Strip trailing Takhrij, book references, and scholar annotations
  let cleaned = norm.replace(
    /\s*(?:رواه|اخرجه|خرجه|متفق عليه|قال الترمذي|قال ابو داود|قال الشيخ الالباني|صحيح البخاري|صحيح مسلم|في صحيحهما|في سننه|قال ابو عيسي|وفي الباب عن).*$/i,
    ''
  ).trim();
  if (cleaned.length < 20) cleaned = norm;

  // Tier 3: Primary Prophetic Speech Transition Anchors
  const speechTransitions = [
    // قال / يقول / سمعت / حفظت [من] رسول الله / النبي صلى الله عليه وسلم يقول / قال : [المتن]
    /(?:قال|يقول|سمعت|حفظت)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    // ان رسول الله / ان النبي صلى الله عليه وسلم قال : [المتن]
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهي|امر|قضي|رخص)\s*[:\s]+(.*)$/,
    // عن النبي / عن رسول الله صلى الله عليه وسلم قال : [المتن]
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
    // سمعت / حفظت رسول الله صلى الله عليه وسلم : [المتن]
    /(?:سمعت|حفظت)\s+(?:من\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s*(?:يقول|:\s*)?\s*(.*)$/,
  ];

  for (const regex of speechTransitions) {
    const m = cleaned.match(regex);
    if (m && m[1] && m[1].trim().length >= 15) {
      return m[1].trim();
    }
  }

  // Tier 4: Narrative & Action Prophetic Hadiths (حديث فعلي / وصفي / قصصي)
  const narrativeTransitions = [
    // ان رسول الله صلى الله عليه وسلم كان / نهى / أمر...
    /(?:ان\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s+(كان|نهي|امر|قضي|رخص|توضا|صلي|سجد|خطب|بعث|سال|سئل|دخل|خرج|رايته|مر|قدم|اعطي|نزل|صام|حج|افتتح|افتخر|استعاذ|استغفر|علمنا|اخذ|اتي|قام)(.*)$/,
    // كان رسول الله / كان النبي صلى الله عليه وسلم...
    /كان\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(.*)$/,
    // بينما نحن / بينا نحن عند رسول الله...
    /(?:بينما|بينا)\s+نحن\s+(?:جلوس\s+)?(?:عند\s+|مع\s+)(?:رسول\s+الله|النبي)(.*)$/,
    // جاء / أتى / سأل رجل رسول الله...
    /(?:سال|جاء|اتي)\s+رجل\s+(?:الي\s+)?(?:رسول\s+الله|النبي)(.*)$/,
    // كنا مع / خرجنا مع / غزونا مع رسول الله...
    /(?:كنا\s+مع|خرجنا\s+مع|غزونا\s+مع)\s+(?:رسول\s+الله|النبي)(.*)$/,
  ];

  for (const regex of narrativeTransitions) {
    const m = cleaned.match(regex);
    if (m) {
      const extracted = m[0].trim();
      if (extracted.length >= 20) {
        return extracted;
      }
    }
  }

  // Tier 5: Sahabi Isnad Boundary (Chain ending at companion honorific)
  if (/^(?:حدثنا|حدثني|اخبرنا|اخبرني|انبان|انبانا|عن|روي|وحدثني|وحدثنا)\s+/i.test(cleaned)) {
    // If chain continues with "عن النبي صلي الله عليه وسلم قال"
    const secondaryProphet = cleaned.match(/عن\s+(?:النبي|رسول\s+الله)\s+صلي\s+الله\s+عليه\s+وسلم\s+(?:قال|يقول)\s*[:\s]+(.*)$/);
    if (secondaryProphet && secondaryProphet[1] && secondaryProphet[1].trim().length >= 15) {
      return secondaryProphet[1].trim();
    }

    const sahabiMatch = cleaned.match(/(?:رضي\s+الله\s+عن[ههمماا]+)\s+(?:قال|قالت|يقول|تقول|ان|انه|انها|:\s*)?\s*(.*)$/);
    if (sahabiMatch && sahabiMatch[1] && sahabiMatch[1].trim().length >= 15) {
      return sahabiMatch[1].trim();
    }

    // Secondary scan for last Isnad verb in first 45% of words
    const words = cleaned.split(/\s+/);
    const maxScan = Math.min(Math.floor(words.length * 0.45), 25);
    let lastQal = -1;
    for (let i = 0; i < maxScan; i++) {
      if (['قال', 'قالت', 'سمعت', 'يقول'].includes(words[i])) {
        lastQal = i;
      }
    }
    if (lastQal > 1 && lastQal < words.length - 4) {
      const candidate = words.slice(lastQal + 1).join(' ');
      if (candidate.length >= 20) {
        return candidate;
      }
    }
  }

  // Tier 6: Safe Zero-Loss Fallback
  return cleaned;
}

const h11 = `عَنْ أَبِي مُحَمَّدٍ الْحَسَنِ بْنِ عَلِيِّ بْنِ أَبِي طَالِبٍ سِبْطِ رَسُولِ اللَّهِ صلى الله عليه و سلم وَرَيْحَانَتِهِ رَضِيَ اللَّهُ عَنْهُمَا، قَالَ: حَفِظْت مِنْ رَسُولِ اللَّهِ صلى الله عليه و سلم "دَعْ مَا يُرِيبُك إلَى مَا لَا يُرِيبُك". رَوَاهُ التِّرْمِذِيُّ`;

const h13 = `عَنْ أَبِي حَمْزَةَ أَنَسِ بْنِ مَالِكٍ رَضِيَ اللهُ عَنْهُ خَادِمِ رَسُولِ اللَّهِ صلى الله عليه و سلم عَنْ النَّبِيِّ صلى الله عليه و سلم قَالَ: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ". رَوَاهُ الْبُخَارِيُّ`;

console.log('H11 matn:', extractHadithMatn(h11));
console.log('H13 matn:', extractHadithMatn(h13));
