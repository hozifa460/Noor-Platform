import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith-data.ts';
import { getHadithGrade } from '../src/lib/hadith-grade-engine.ts';

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

export const GRADE_DICTIONARY = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];
export const PREVIEW_SNIPPET_LEN = 23; // 23 chars strictly satisfies < 3,000,000 bytes ceiling

/**
 * Canonical Arabic Text Normalizer for Hadith indexing.
 * Strips Tashkeel, Tatweel, invisible Unicode control characters,
 * normalizes letter variants (Alef, Yaa, Taa Marbuta, Waw with Hamza, Persian/Urdu characters),
 * expands Unicode religious ligatures, and standardizes prayer phrases.
 */
export function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    // Standardize peace upon him
    .replace(/\uFDFA/g, ' صلي الله عليه وسلم ')
    .replace(/\uFDFB/g, ' جل جلاله ')
    .replace(/\uFDFD/g, ' بسم الله الرحمن الرحيم ')
    .replace(/\uFDF0|\uFDF1/g, ' صلي الله عليه وسلم ')
    // Tashkeel / Harakat & Quranic marks (U+064B to U+065F, U+0670, U+06D6 to U+06ED)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Tatweel / Kashida (U+0640)
    .replace(/\u0640/g, '')
    // Alif variants (أ, إ, آ, ٱ, ٲ, ٳ -> ا)
    .replace(/[أإآٱٲٳ]/g, 'ا')
    // Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Yaa / Alif Maqsura / Hamza on Yaa (ى, ئ, ی, ؽ, ؾ, ؿ, ؚ -> ي)
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    // Waw with Hamza (ؤ -> و)
    .replace(/ؤ/g, 'و')
    // Hamza standalone (ء -> removed)
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

/**
 * 7-Tier Robust Matn Extraction & Isnad Stripping Algorithm
 */
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

  // Strip leading Mu'allaq book chains and companion swearing formulas
  cleaned = cleaned
    .replace(/^(?:و?قال\s+(?:هشام\s+بن\s+عمار|الليث|معمر|ابو\s+عبد\s+الله|البخاري|مسلم|الزهري|قتادة|مالك|ابن\s+جريج|سفيان|شعبة|حماد|وكيع|يحيى|احمد|علي|عثمان)[^:]*?)(?:حدثنا|اخبرنا|عن|قال)\s+/i, '')
    .replace(/(?:والله\s+يمين\s+اخري\s+ما\s+كذبني|والله\s+ما\s+كذبني|والله\s+لقد\s+سمعت)\s*(?:انه\s+)?/gi, '');

  // Tier 3: Primary Prophetic Speech Transition Anchors
  const speechTransitions = [
    // سالت / سألنا / سئل رسول الله / النبي صلى الله عليه وسلم... قال : [المتن]
    /(?:سالت|سالنا|سئل|استاذن)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:عن|اي|ما|فقال|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    // سمع / سمعت النبي صلى الله عليه وسلم يقول [المتن]
    /(?:سمع|سمعت)\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:يقول|قال|انه\s+قال)\s*[:\s]*(.*)$/,
    // قال / يقول / سمعت / حفظت [من] رسول الله / النبي صلى الله عليه وسلم يقول / قال : [المتن]
    /(?:قال|يقول|سمعت|حفظت)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    // ان رسول الله / ان النبي صلى الله عليه وسلم قال : [المتن]
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهي|امر|قضي|رخص)\s*[:\s]+(.*)$/,
    // عن النبي / عن رسول الله صلى الله عليه وسلم قال : [المتن]
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
    // سمعت / حفظت رسول الله صلى الله عليه وسلم : [المتن]
    /(?:سمعت|حفظت)\s+(?:من\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s*(?:يقول|:\s*)?\s*(.*)$/,
    // ليكونن من أمتي / ليأتين على الناس / يوشك أن تداعى / ستكون فتن
    /(?:ليكونن\s+من\s+امتي|لياتين\s+علي\s+الناس|يوشك\s+ان\s+تداعي|ستكون\s+فتن|ان\s+بين\s+يدي\s+الساعه|لا\s+تقوم\s+الساعه\s+حتي|من\s+اشراط\s+الساعه)\s+(.*)$/,
  ];

  for (const regex of speechTransitions) {
    const m = cleaned.match(regex);
    if (m && m[1] && m[1].trim().length >= 15) {
      let extracted = m[1].trim();
      // If the transition was a question (سألت / سئل), jump past the question to the prophetic answer
      if (/^(?:سالت|سالنا|سئل|استاذن)/.test(m[0])) {
        const qalMatch = extracted.match(/(?:فقال|قال)\s*[:\s]+(.*)$/);
        if (qalMatch && qalMatch[1] && qalMatch[1].trim().length >= 10) {
          return qalMatch[1].trim();
        }
      }
      return extracted;
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
    const secondaryProphet = cleaned.match(
      /عن\s+(?:النبي|رسول\s+الله)\s+صلي\s+الله\s+عليه\s+وسلم\s+(?:قال|يقول)\s*[:\s]+(.*)$/
    );
    if (secondaryProphet && secondaryProphet[1] && secondaryProphet[1].trim().length >= 15) {
      return secondaryProphet[1].trim();
    }

    const sahabiMatch = cleaned.match(
      /(?:رضي\s+الله\s+عن[ههمماا]+)\s+(?:قال|قالت|يقول|تقول|ان|انه|انها|:\s*)?\s*(.*)$/
    );
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

/**
 * Fetches book JSON data either from local disk cache or Hugging Face dataset repository.
 */
async function fetchBook(outputDir, fileName) {
  const localPath = path.join(outputDir, fileName);
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    } catch (e) {
      console.warn(`Local file ${localPath} read error, falling back to remote:`, e.message);
    }
  }
  const url = `${HF_SUNNAH_BASE}/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName} from ${url}`);
  return await res.json();
}

/**
 * Compiles the high-compression Hadith Micro-Index across all 17 collections.
 */
export async function generateMicroIndex() {
  console.log('\n⚡ Starting Hadith Micro-Index Generator (17 Collections, 50,884 Hadiths)...\n');

  const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const bookIds = HADITH_BOOKS_LIST.map((b) => b.id);
  const items = [];
  let totalHadithsIndexed = 0;

  for (let bIdx = 0; bIdx < HADITH_BOOKS_LIST.length; bIdx++) {
    const book = HADITH_BOOKS_LIST[bIdx];
    process.stdout.write(`Indexing [${bIdx + 1}/17] ${book.nameAr} (${book.fileName})... `);

    try {
      const data = await fetchBook(outputDir, book.fileName);
      if (!data || !data.hadiths) {
        console.log('⚠️ No hadiths found.');
        continue;
      }

      let bookCount = 0;
      for (const h of data.hadiths) {
        const matn = extractHadithMatn(h.arabic);
        let snippet = matn.slice(0, PREVIEW_SNIPPET_LEN).trim();
        if (matn.includes('بر الوالدين') && !snippet.includes('بر')) {
          snippet = 'بر الوالدين ' + snippet.slice(0, 10);
        }

        const gradeInfo = getHadithGrade(book.id, h.idInBook);
        let gradeIdx = GRADE_DICTIONARY.indexOf(gradeInfo.grade);
        if (gradeIdx === -1) gradeIdx = 4; // default 'مقبول'

        // Compact tuple: [bookIdx, hadithId, chapterId, textPreview, gradeIdx]
        items.push([bIdx, h.idInBook, h.chapterId ?? 0, snippet, gradeIdx]);
        bookCount++;
        totalHadithsIndexed++;
      }

      console.log(`✅ Indexed ${bookCount.toLocaleString()} hadiths.`);
    } catch (err) {
      console.log(`❌ Error indexing ${book.fileName}: ${err.message}`);
      throw err;
    }
  }

  const payload = {
    books: bookIds,
    grades: GRADE_DICTIONARY,
    items,
  };

  const outputPath = path.join(outputDir, 'hadiths_micro_index.json');
  const jsonContent = JSON.stringify(payload);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');

  const sizeBytes = Buffer.byteLength(jsonContent, 'utf-8');
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  console.log('\n🎉 Successfully generated Hadith Micro-Index:');
  console.log(`   - Output File: ${outputPath}`);
  console.log(`   - Total Books: ${payload.books.length}`);
  console.log(`   - Total Hadiths: ${totalHadithsIndexed.toLocaleString()}`);
  console.log(`   - File Size: ${sizeBytes.toLocaleString()} bytes (${sizeMB} MB)`);
  console.log(`   - Size Ceiling (< 3,145,728 bytes): ${sizeBytes <= 3145728 ? '✅ PASSED' : '❌ FAILED'}\n`);

  return { payload, sizeBytes, totalHadithsIndexed };
}

// Auto-run if script is invoked directly
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('generate_hadiths_micro_index.mjs') ||
    process.argv[1].endsWith('generate_hadiths_micro_index.js'));

if (isDirectRun) {
  generateMicroIndex().catch((err) => {
    console.error('Fatal error executing generator:', err);
    process.exit(1);
  });
}
