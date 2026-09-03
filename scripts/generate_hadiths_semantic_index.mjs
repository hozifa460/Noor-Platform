import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith/data.ts';
import { getHadithGrade } from '../src/lib/hadith/grade-engine.ts';
import { normalizeArabic, tokenizeArabic } from '../src/lib/arabic/normalizer.ts';

const GRADE_DICTIONARY = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];
const PREVIEW_MAX_LEN = 160; // 160 characters of full rich Matn!

console.log('\n⚡ Building High-Precision Semantic Inverted Index (17 Hadith Books, 50,884 Hadiths)...\n');

const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function fetchLocalBook(fileName) {
  const localPath = path.join(outputDir, fileName);
  if (!fs.existsSync(localPath)) {
    throw new Error(`File not found: ${localPath}`);
  }
  return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
}

/**
 * Extracts clean Matn starting from prophetic speech
 */
function extractCleanMatn(rawArabic) {
  if (!rawArabic) return '';
  const norm = normalizeArabic(rawArabic);
  if (norm.length <= 60) return norm;

  // Clean trailing takhrij
  let cleaned = norm.replace(
    /\s*(?:رواه|اخرجه|خرجه|متفق عليه|قال الترمذي|قال ابو داود|قال الشيخ الالباني|صحيح البخاري|صحيح مسلم|في صحيحهما|في سننه).*$/i,
    ''
  ).trim();

  // Speech anchors
  const speechTransitions = [
    /(?:سالت|سالنا|سئل|استاذن)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:عن|اي|ما|فقال|قال)?\s*[:\s]+(.*)$/,
    /(?:قال|يقول|سمعت|حفظت)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهي|امر|قضي|رخص)\s*[:\s]+(.*)$/,
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
    /(?:سمعت|حفظت)\s+(?:من\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s*(?:يقول|:\s*)?\s*(.*)$/,
    /(?:كان\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s+(كان|نهي|امر|قضي|رخص|توضا|صلي|سجد|خطب|بعث|سال|سئل|دخل|خرج|رايته|مر|قدم|اعطي|نزل|صام|حج)(.*)$/,
  ];

  for (const regex of speechTransitions) {
    const m = cleaned.match(regex);
    if (m && m[1] && m[1].trim().length >= 15) {
      let extracted = m[1].trim();
      if (/^(?:سالت|سالنا|سئل|استاذن)/.test(m[0])) {
        const qalMatch = extracted.match(/(?:فقال|قال)\s*[:\s]+(.*)$/);
        if (qalMatch && qalMatch[1] && qalMatch[1].trim().length >= 10) {
          return qalMatch[1].trim();
        }
      }
      return extracted;
    }
  }

  return cleaned;
}

async function main() {
  const books = HADITH_BOOKS_LIST.map((b) => b.id);
  const items = []; // [bookIdx, idInBook, chapterId, textPreview, gradeIdx]
  const invertedIndex = {}; // word -> Array of item indices

  const STOP_WORDS = new Set([
    'في', 'من', 'ما', 'لا', 'الي', 'علي', 'هو', 'هي', 'ثم', 'او', 'ان', 'انما',
    'كل', 'ذلك', 'به', 'له', 'بها', 'لنا', 'لهم', 'كان', 'كانت', 'يكون', 'تكون'
  ]);

  let totalHadiths = 0;

  for (let bIdx = 0; bIdx < HADITH_BOOKS_LIST.length; bIdx++) {
    const book = HADITH_BOOKS_LIST[bIdx];
    process.stdout.write(`Processing [${bIdx + 1}/17] ${book.nameAr}... `);

    try {
      const data = fetchLocalBook(book.fileName);
      if (!data || !data.hadiths) continue;

      let bookHadiths = 0;
      for (const h of data.hadiths) {
        const rawArabic = h.arabic || '';
        const normFull = normalizeArabic(rawArabic);
        const cleanMatn = extractCleanMatn(rawArabic);

        // 160-char rich preview text
        const snippet = cleanMatn.slice(0, PREVIEW_MAX_LEN).trim() || normFull.slice(0, PREVIEW_MAX_LEN).trim();

        const gradeInfo = getHadithGrade(book.id, h.idInBook);
        let gradeIdx = GRADE_DICTIONARY.indexOf(gradeInfo.grade);
        if (gradeIdx === -1) gradeIdx = 4; // 'مقبول'

        const itemIdx = items.length;
        items.push([bIdx, h.idInBook, h.chapterId ?? 0, snippet, gradeIdx]);

        // Index all tokens from the ENTIRE full text of the Hadith
        const tokens = normFull.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
        const uniqueTokens = new Set(tokens);

        for (const t of uniqueTokens) {
          if (!invertedIndex[t]) {
            invertedIndex[t] = [];
          }
          invertedIndex[t].push(itemIdx);
        }

        // Also index root 'والد'
        if (normFull.includes('والد') || normFull.includes('والدين') || normFull.includes('والديه')) {
          if (!invertedIndex['والدين']) invertedIndex['والدين'] = [];
          if (!uniqueTokens.has('والدين')) {
            invertedIndex['والدين'].push(itemIdx);
          }
        }

        // Also index 'بر الوالدين'
        if (normFull.includes('بر') && (normFull.includes('والد') || normFull.includes('والدين'))) {
          if (!invertedIndex['بر_والدين']) invertedIndex['بر_والدين'] = [];
          invertedIndex['بر_والدين'].push(itemIdx);
        }

        bookHadiths++;
        totalHadiths++;
      }

      console.log(`✅ ${bookHadiths.toLocaleString()} hadiths.`);
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  const payload = {
    books,
    grades: GRADE_DICTIONARY,
    items,
    index: invertedIndex,
  };

  const outputPath = path.join(outputDir, 'hadiths_semantic_index.json');
  const jsonContent = JSON.stringify(payload);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');

  const bytes = Buffer.byteLength(jsonContent, 'utf-8');
  const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
  const uniqueWords = Object.keys(invertedIndex).length;

  console.log(`\n🎉 Semantic Inverted Hadith Index Built:`);
  console.log(`   - Output Path: ${outputPath}`);
  console.log(`   - Total Hadiths: ${totalHadiths.toLocaleString()}`);
  console.log(`   - Unique Indexed Terms: ${uniqueWords.toLocaleString()}`);
  console.log(`   - File Size: ${bytes.toLocaleString()} bytes (${sizeMB} MB)\n`);
}

main().catch(console.error);
