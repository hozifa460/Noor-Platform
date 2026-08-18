import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic, arabicSearchMatch } from '../../src/lib/arabic-normalizer.ts';
import { getHadithGrade } from '../../src/lib/hadith-grade-engine.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

function extractHadithMatn(normalizedText) {
  if (!normalizedText) return '';

  const markers = [
    'قال رسول الله صلي الله عليه وسلم',
    'ان رسول الله صلي الله عليه وسلم قال',
    'سمعت رسول الله صلي الله عليه وسلم يقول',
    'سمعت رسول الله صلي الله عليه وسلم',
    'عن النبي صلي الله عليه وسلم قال',
    'سمعت النبي صلي الله عليه وسلم يقول',
    'عن النبي صلي الله عليه وسلم انه قال',
    'عن النبي صلي الله عليه وسلم',
    'رسول الله صلي الله عليه وسلم يقول',
    'رسول الله صلي الله عليه وسلم قال',
    'رسول الله صلي الله عليه وسلم',
    'النبي صلي الله عليه وسلم قال',
    'النبي صلي الله عليه وسلم',
    'رضي الله عنه قال',
    'رضي الله عنها قالت',
    'رضي الله عنهما قال',
    'رضي الله عنهم قال'
  ];

  for (const m of markers) {
    const idx = normalizedText.indexOf(m);
    if (idx !== -1 && idx + m.length + 3 < normalizedText.length) {
      const candidate = normalizedText.slice(idx + m.length).trim();
      if (candidate.length >= 8) {
        return candidate;
      }
    }
  }

  return normalizedText;
}

const gradeMap = { 'صحيح': 0, 'حسن': 1, 'ضعيف': 2, 'موضوع': 3, 'مقبول': 4 };

async function buildAndTestTrialIndex() {
  console.log('Testing Full Trial Index Generation across all 17 books...');

  // We can load books from Hugging Face or public/data/hadith if available
  const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
  
  const microList = [];
  const bookKeyList = HADITH_BOOKS_LIST.map(b => b.id);
  const bookIndexMap = Object.fromEntries(HADITH_BOOKS_LIST.map((b, i) => [b.id, i]));

  // Let's test with loaded books from previous survey or fetch
  for (const book of HADITH_BOOKS_LIST) {
    const url = `${HF_SUNNAH_BASE}/All_hadith_books/${book.fileName}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.hadiths) continue;

    const bIdx = bookIndexMap[book.id];
    for (const h of data.hadiths) {
      const normFull = normalizeArabic((h.arabic || '').replace(/\n+/g, ' ').trim());
      const matn = extractHadithMatn(normFull);
      const preview = matn.slice(0, 60); // 60 chars of matn preview
      const gradeObj = getHadithGrade(book.id, h.idInBook);
      const gradeCode = gradeMap[gradeObj.grade] ?? 4;

      // Tuple: [bookIdx, hadithNumber, chapterId, textPreview, gradeCode]
      microList.push([
        bIdx,
        h.idInBook,
        h.chapterId,
        preview,
        gradeCode
      ]);
    }
  }

  console.log(`Total Indexed Hadiths: ${microList.length}`);

  const jsonStr = JSON.stringify(microList);
  const sizeMB = (Buffer.byteLength(jsonStr, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`Compact Micro Index Size (60 chars preview): ${sizeMB} MB`);

  // Test with 45 chars preview
  const micro45 = microList.map(item => [item[0], item[1], item[2], item[3].slice(0, 45), item[4]]);
  const size45MB = (Buffer.byteLength(JSON.stringify(micro45), 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`Compact Micro Index Size (45 chars preview): ${size45MB} MB`);

  // Test with 35 chars preview
  const micro35 = microList.map(item => [item[0], item[1], item[2], item[3].slice(0, 35), item[4]]);
  const size35MB = (Buffer.byteLength(JSON.stringify(micro35), 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`Compact Micro Index Size (35 chars preview): ${size35MB} MB`);

  // Benchmark search queries
  console.log('\n--- Search Benchmarking with Matn Extraction ---');
  const testQueries = ['النيات', 'الوضوء', 'بر الوالدين', 'الصلاة', 'الحياء', 'الجهاد', 'الصوم', 'الايمان'];

  for (const q of testQueries) {
    const start = performance.now();
    const matches = [];
    const normQ = normalizeArabic(q);
    const qTokens = tokenizeArabic(normQ);

    for (let i = 0; i < microList.length; i++) {
      const [bIdx, hid, cid, text, gCode] = microList[i];
      let match = true;
      for (const tok of qTokens) {
        if (!text.includes(tok)) {
          match = false;
          break;
        }
      }
      if (match) {
        matches.push(microList[i]);
      }
    }
    const elapsed = (performance.now() - start).toFixed(3);
    const firstMatchBook = matches.length > 0 ? HADITH_BOOKS_LIST[matches[0][0]].nameAr : 'None';
    const firstMatchNum = matches.length > 0 ? matches[0][1] : 'N/A';
    console.log(`Query: "${q.padEnd(12)}" -> ${String(matches.length).padStart(4)} matches in ${elapsed.padStart(6)} ms | Top Match: ${firstMatchBook} #${firstMatchNum}`);
  }
}

buildAndTestTrialIndex().catch(console.error);
