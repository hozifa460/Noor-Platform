import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';
import { normalizeArabic } from '../../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

/**
 * Enhanced Arabic Normalizer specifically handling Hadith texts:
 * - Ligatures: ﷺ (U+FDFA), ﷻ (U+FDFB), ﷽ (U+FDFD)
 * - Quotes & Punctuation: « » “ ” " ' `
 * - Tashkeel & Tatweel
 * - Alif, Yaa, Taa Marbuta
 */
export function normalizeHadithText(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    // Expand or normalize ligatures first
    .replace(/\uFDFA/g, ' صلى الله عليه وسلم ')
    .replace(/\uFDFB/g, ' جل جلاله ')
    .replace(/\uFDFD/g, ' بسم الله الرحمن الرحيم ')
    // Remove Tashkeel & Quranic annotation marks
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Remove Tatweel
    .replace(/\u0640/g, '')
    // Normalize Alefs (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Yaa / Alef Maksura (ى -> ي)
    .replace(/ى/g, 'ي')
    // Normalize Hamza forms (ؤ -> و, ئ -> ي, ء -> '')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Remove Persian/Urdu variants if present (ک -> ك, ی -> ي, etc.)
    .replace(/ک/g, 'ك')
    .replace(/ی/g, 'ي')
    // Clean punctuation and quotes
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'«»“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matn Extraction & Isnad Stripping Algorithm
 */
export function extractMatn(rawText) {
  if (!rawText) return '';

  // 1. Normalize text for pattern matching
  const norm = normalizeHadithText(rawText);

  // If text is short (e.g. < 50 chars), it's likely already pure Matn (e.g. Forty Hadith of Shah Waliullah)
  if (norm.length <= 60) {
    return norm;
  }

  // Trailing Takhrij / Commentary Stripping
  // Patterns like: "رواه البخاري", "متفق عليه", "رواه الترمذي وقال حديث حسن", "اخرجه مسلم", "رواه احمد"
  let cleanNorm = norm.replace(
    /\s*(?:رواه|اخرجه|خرجه|متفق عليه|قال الترمذي|قال ابو داود|قال الشيخ الالباني|صحيح البخاري|صحيح مسلم|في صحيحهما|في سننه).*$/i,
    ''
  ).trim();
  if (!cleanNorm) cleanNorm = norm;

  // Let's test Isnad Transition Patterns
  // We want the match that represents the true transition to the Prophetic Matn or narrative
  
  // High-priority Prophetic speech transition patterns:
  // "قال رسول الله صلى الله عليه وسلم"
  // "ان رسول الله صلى الله عليه وسلم قال"
  // "سمعت رسول الله صلى الله عليه وسلم يقول"
  // "عن النبي صلى الله عليه وسلم قال"
  // "عن النبي صلى الله عليه وسلم انه قال"
  // "عن رسول الله صلى الله عليه وسلم قال"
  // "قال النبي صلى الله عليه وسلم"
  // "ان النبي صلى الله عليه وسلم قال"
  
  const propheticSpeechRegexes = [
    // قال / يقول رسول الله صلى الله عليه وسلم [:]
    /(?:قال|يقول|سمعت)\s+(?:رسول\s+الله|النبي)(?:\s+صلى\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال)?\s*[:\s]+(.*)$/,
    // ان رسول الله / ان النبي صلى الله عليه وسلم قال / انه قال
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلى\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهى|امر|قضى|رخّص|رخص)\s*[:\s]+(.*)$/,
    // عن النبي / رسول الله صلى الله عليه وسلم قال
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلى\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
  ];

  for (const rx of propheticSpeechRegexes) {
    const match = cleanNorm.match(rx);
    if (match && match[1] && match[1].trim().length >= 15) {
      return match[1].trim();
    }
  }

  // Narrative / Action Hadith Transition Patterns (حديث فعلي / وصفي):
  // "ان رسول الله صلى الله عليه وسلم كان..."
  // "كان رسول الله صلى الله عليه وسلم..."
  // "نهى رسول الله صلى الله عليه وسلم عن..."
  // "امر رسول الله صلى الله عليه وسلم بـ..."
  // "بينما نحن جلوس عند رسول الله صلى الله عليه وسلم..."
  // "سئل رسول الله صلى الله عليه وسلم عن..."
  // "جاء رجل الى رسول الله صلى الله عليه وسلم فقال..."
  // "رايت رسول الله صلى الله عليه وسلم..."
  const narrativeRegexes = [
    /(?:ان\s+)?(?:رسول\s+الله|النبي)\s+صلى\s+الله\s+عليه\s+وسلم\s+(كان|نهى|امر|قضى|رخص|توضا|صلى|سجد|خطب|بعث|سال|سئل|دخل|خرج|رايته|مر|قدم|اعطى|نزل|صام|حج|افتتح|افتخر|استعاذ|استغفر|علمنا)(.*)$/,
    /(?:بينما|بينا)\s+نحن\s+(?:جلوس\s+)?(?:عند\s+|مع\s+)(?:رسول\s+الله|النبي)(.*)$/,
    /(?:سأل|سال|جاء|اتى)\s+رجل\s+(?:الى\s+)?(?:رسول\s+الله|النبي)(.*)$/,
    /(?:كنا\s+مع|خرجنا\s+مع|غزونا\s+مع)\s+(?:رسول\s+الله|النبي)(.*)$/,
  ];

  for (const rx of narrativeRegexes) {
    const match = cleanNorm.match(rx);
    if (match) {
      const extracted = match[0].trim();
      if (extracted.length >= 20) {
        return extracted;
      }
    }
  }

  // Secondary Isnad Cut: If the text starts with classical Isnad markers (حدثنا, اخبرنا, عن, etc.),
  // find the last occurrence of (قال|قالت|يقول|رضي الله عنه قال|رضي الله عنها قالت)
  if (/^(?:حدثنا|حدثني|اخبرنا|اخبرني|انبان|انبانا|عن|روى)\s+/i.test(cleanNorm)) {
    // Look for (رضي الله عنه|عنها|عنهم|عنهما) followed by (قال|قالت|ان|يقول)
    const sahabiCut = cleanNorm.match(/(?:رضي\s+الله\s+عن[ههمماا]+)\s+(?:قال|قالت|يقول|تقول|ان|انه|انها|:\s*)?\s*(.*)$/);
    if (sahabiCut && sahabiCut[1] && sahabiCut[1].trim().length >= 15) {
      return sahabiCut[1].trim();
    }

    // Look for last (قال|قالت|سمعت) in the first 40% of the text
    const words = cleanNorm.split(/\s+/);
    const maxIsnadWords = Math.min(Math.floor(words.length * 0.5), 30);
    let lastQalIdx = -1;
    for (let i = 0; i < maxIsnadWords; i++) {
      if (['قال', 'قالت', 'سمعت', 'يقول'].includes(words[i])) {
        lastQalIdx = i;
      }
    }
    if (lastQalIdx > 2 && lastQalIdx < words.length - 4) {
      const candidate = words.slice(lastQalIdx + 1).join(' ');
      if (candidate.length >= 20) {
        return candidate;
      }
    }
  }

  // Fallback: Return the cleaned normalized text (ensures zero loss of information)
  return cleanNorm;
}

// Test runner across books
async function testExtractor() {
  console.log('Testing extractMatn on key books...\n');

  const testBooks = [
    { file: 'bukhari.json', name: 'Sahih Bukhari' },
    { file: 'muslim.json', name: 'Sahih Muslim' },
    { file: 'nawawi40.json', name: 'Nawawi 40' },
    { file: 'abudawud.json', name: 'Sunan Abu Dawud' },
    { file: 'tirmidhi.json', name: 'Jami at-Tirmidhi' },
    { file: 'malik.json', name: 'Muwatta Malik' },
    { file: 'shahwaliullah40.json', name: 'Shah Waliullah 40' },
  ];

  for (const tb of testBooks) {
    const res = await fetch(`${HF_SUNNAH_BASE}/${tb.file}`);
    const data = await res.json();
    console.log(`\n========================================\n=== ${tb.name} (${data.hadiths.length} hadiths) ===\n========================================`);

    let strippedCount = 0;
    let fallbackCount = 0;

    for (let i = 0; i < Math.min(10, data.hadiths.length); i++) {
      const h = data.hadiths[i];
      const raw = h.arabic;
      const matn = extractMatn(raw);
      const normRaw = normalizeHadithText(raw);

      console.log(`\n--- Hadith #${h.idInBook} ---`);
      console.log(`[Raw Preview]  : ${normRaw.slice(0, 100)}...`);
      console.log(`[Extracted Matn]: ${matn.slice(0, 100)}...`);
      console.log(`[Length delta] : ${normRaw.length} -> ${matn.length} chars (Saved ${(100 - (matn.length/normRaw.length)*100).toFixed(1)}%)`);

      if (matn !== normRaw) strippedCount++;
      else fallbackCount++;
    }
  }
}

testExtractor().catch(console.error);
