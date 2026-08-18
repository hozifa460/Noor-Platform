import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

/**
 * Standard Arabic Normalization Rules for Search & Indexing:
 * 1. NFKD decomposition + ligatures expansion
 * 2. Tashkeel / Harakat removal (U+064B-U+065F, U+0670, U+06D6-U+06ED)
 * 3. Tatweel removal (U+0640)
 * 4. Alif normalization: أ, إ, آ, ٱ, ٲ, ٳ -> ا
 * 5. Yaa / Alif Maqsura normalization: ى, ئ, ی, ؽ, ؾ, ؿ, ؚ -> ي
 * 6. Taa Marbuta normalization: ة -> ه
 * 7. Waw with Hamza: ؤ -> و
 * 8. Persian/Urdu letter normalization: ک, ګ, ڭ, ڮ -> ك, پ -> ب, چ -> ج, ژ -> ز, گ -> ك
 * 9. Punctuation removal & whitespace collapsing
 */
export function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    // Ligatures expansion
    .replace(/\uFDFA/g, ' صلى الله عليه وسلم ')
    .replace(/\uFDFB/g, ' جل جلاله ')
    .replace(/\uFDFD/g, ' بسم الله الرحمن الرحيم ')
    .replace(/\uFDF0|\uFDF1/g, ' صلعم ')
    // Tashkeel / Harakat & Quranic marks
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Tatweel / Kashida
    .replace(/\u0640/g, '')
    // Alif variants
    .replace(/[أإآٱٲٳإ]/g, 'ا')
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
    // Punctuation and symbols
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'«»“”‏]/g, ' ')
    // Whitespace collapse
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Robust Matn Extraction & Isnad Stripping
 */
export function extractHadithMatn(rawArabic) {
  if (!rawArabic) return '';

  const norm = normalizeArabicText(rawArabic);

  // If text is already very short (< 60 chars), return it directly (e.g. Shah Waliullah 40)
  if (norm.length <= 60) {
    return norm;
  }

  // 1. Strip trailing Takhrij / commentary footnotes
  // E.g., "رواه البخاري ومسلم", "متفق عليه", "رواه الترمذي وقال حديث حسن صحيح", "اخرجه ابو داود"
  let cleaned = norm.replace(
    /\s*(?:رواه|اخرجه|خرجه|متفق عليه|قال الترمذي|قال ابو داود|قال الشيخ الالباني|صحيح البخاري|صحيح مسلم|في صحيحهما|في سننه|قال ابو عيسي|وفي الباب عن).*$/i,
    ''
  ).trim();
  if (cleaned.length < 20) cleaned = norm;

  // 2. Primary: Prophetic Speech Transition Patterns
  const speechTransitions = [
    // قال / يقول / سمعت رسول الله / النبي صلى الله عليه وسلم يقول / قال : [المتن]
    /(?:قال|يقول|سمعت)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    // ان رسول الله / ان النبي صلى الله عليه وسلم قال : [المتن]
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهي|امر|قضي|رخص)\s*[:\s]+(.*)$/,
    // عن النبي / عن رسول الله صلى الله عليه وسلم قال : [المتن]
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
    // سمعت رسول الله صلى الله عليه وسلم : [المتن]
    /سمعت\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|:\s*)?\s*(.*)$/,
  ];

  for (const regex of speechTransitions) {
    const m = cleaned.match(regex);
    if (m && m[1] && m[1].trim().length >= 15) {
      return m[1].trim();
    }
  }

  // 3. Narrative & Action Prophetic Hadiths (أحاديث فعلية ووصفية وقصصية)
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

  // 4. Sahabi Cut: Chain ending at companion honorific (رضي الله عنه قال...)
  if (/^(?:حدثنا|حدثني|اخبرنا|اخبرني|انبان|انبانا|عن|روي|وحدثني|وحدثنا)\s+/i.test(cleaned)) {
    const sahabiMatch = cleaned.match(/(?:رضي\s+الله\s+عن[ههمماا]+)\s+(?:قال|قالت|يقول|تقول|ان|انه|انها|:\s*)?\s*(.*)$/);
    if (sahabiMatch && sahabiMatch[1] && sahabiMatch[1].trim().length >= 15) {
      return sahabiMatch[1].trim();
    }

    // 5. Fallback for Isnad verb scan in first half of words
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

  // 6. Safe Fallback: Cleaned text ensures zero loss
  return cleaned;
}

// Full 17 Books Test
async function runFullTest() {
  console.log('Testing Hadith Extraction across ALL 17 books...\n');

  let totalHadiths = 0;
  let totalStripped = 0;
  let totalUnchanged = 0;
  let totalRawBytes = 0;
  let totalMatnBytes = 0;

  for (const book of HADITH_BOOKS_LIST) {
    process.stdout.write(`Testing ${book.nameAr} (${book.fileName})... `);
    try {
      const res = await fetch(`${HF_SUNNAH_BASE}/${book.fileName}`);
      const data = await res.json();
      if (!data || !data.hadiths) {
        console.log('No hadiths');
        continue;
      }

      let bookStripped = 0;
      let bookUnchanged = 0;
      let bookRawBytes = 0;
      let bookMatnBytes = 0;

      for (const h of data.hadiths) {
        totalHadiths++;
        const raw = h.arabic || '';
        const norm = normalizeArabicText(raw);
        const matn = extractHadithMatn(raw);

        bookRawBytes += Buffer.byteLength(norm, 'utf-8');
        bookMatnBytes += Buffer.byteLength(matn, 'utf-8');

        if (matn !== norm) {
          bookStripped++;
          totalStripped++;
        } else {
          bookUnchanged++;
          totalUnchanged++;
        }
      }

      totalRawBytes += bookRawBytes;
      totalMatnBytes += bookMatnBytes;

      const pctSaved = ((1 - bookMatnBytes / bookRawBytes) * 100).toFixed(1);
      console.log(`✅ ${data.hadiths.length} hadiths | Stripped: ${bookStripped} (${((bookStripped/data.hadiths.length)*100).toFixed(1)}%) | Size reduction: ${pctSaved}%`);
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
  }

  console.log('\n========================================');
  console.log('=== OVERALL SUMMARY ACROSS 17 BOOKS ===');
  console.log('========================================');
  console.log(`Total Hadiths: ${totalHadiths.toLocaleString()}`);
  console.log(`Isnad Stripped: ${totalStripped.toLocaleString()} (${((totalStripped/totalHadiths)*100).toFixed(1)}%)`);
  console.log(`Unchanged/Pure Matn: ${totalUnchanged.toLocaleString()} (${((totalUnchanged/totalHadiths)*100).toFixed(1)}%)`);
  console.log(`Total Normalized Raw Size: ${(totalRawBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Extracted Matn Size: ${(totalMatnBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total Size Reduction: ${((1 - totalMatnBytes / totalRawBytes) * 100).toFixed(1)}%`);
}

runFullTest().catch(console.error);
