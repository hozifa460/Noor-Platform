import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../../src/lib/arabic-normalizer.ts';
import { getHadithGrade } from '../../src/lib/hadith-grade-engine.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function testIndexFormats() {
  console.log('Testing Micro-Index Compaction Strategies...\n');

  // Let's load existing micro_index.json to get the 50,884 items
  const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
  if (!fs.existsSync(p)) {
    console.log('Micro index not found at', p);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log(`Loaded ${rawData.length} hadith items.`);

  const bookIdToIdx = {};
  HADITH_BOOKS_LIST.forEach((b, idx) => { bookIdToIdx[b.id] = idx; });

  const gradeToCode = { 'صحيح': 0, 'حسن': 1, 'ضعيف': 2, 'موضوع': 3, 'مقبول': 4 };

  // 1. Current object format
  const sizeCurrent = Buffer.byteLength(JSON.stringify(rawData), 'utf8') / (1024 * 1024);
  console.log(`1. Current Object format {b, i, c, t (140 chars), g}: ${sizeCurrent.toFixed(2)} MB`);

  // 2. Tuple format with 140 chars: [bIdx, idInBook, chapterId, text140, gradeCode]
  const tuple140 = rawData.map(h => [
    bookIdToIdx[h.b] ?? 0,
    h.i,
    h.c,
    h.t,
    gradeToCode[h.g] ?? 0
  ]);
  const sizeTuple140 = Buffer.byteLength(JSON.stringify(tuple140), 'utf8') / (1024 * 1024);
  console.log(`2. Tuple format [bIdx, i, c, t(140), gCode]: ${sizeTuple140.toFixed(2)} MB`);

  // 3. Tuple format with 70 chars: [bIdx, idInBook, chapterId, text70, gradeCode]
  const tuple70 = rawData.map(h => [
    bookIdToIdx[h.b] ?? 0,
    h.i,
    h.c,
    h.t.slice(0, 70),
    gradeToCode[h.g] ?? 0
  ]);
  const sizeTuple70 = Buffer.byteLength(JSON.stringify(tuple70), 'utf8') / (1024 * 1024);
  console.log(`3. Tuple format [bIdx, i, c, t(70), gCode]: ${sizeTuple70.toFixed(2)} MB`);

  // 4. Tuple format with 45 chars: [bIdx, idInBook, chapterId, text45, gradeCode]
  const tuple45 = rawData.map(h => [
    bookIdToIdx[h.b] ?? 0,
    h.i,
    h.c,
    h.t.slice(0, 45),
    gradeToCode[h.g] ?? 0
  ]);
  const sizeTuple45 = Buffer.byteLength(JSON.stringify(tuple45), 'utf8') / (1024 * 1024);
  console.log(`4. Tuple format [bIdx, i, c, t(45), gCode]: ${sizeTuple45.toFixed(2)} MB`);

  // 5. Tuple format with 35 chars
  const tuple35 = rawData.map(h => [
    bookIdToIdx[h.b] ?? 0,
    h.i,
    h.c,
    h.t.slice(0, 35),
    gradeToCode[h.g] ?? 0
  ]);
  const sizeTuple35 = Buffer.byteLength(JSON.stringify(tuple35), 'utf8') / (1024 * 1024);
  console.log(`5. Tuple format [bIdx, i, c, t(35), gCode]: ${sizeTuple35.toFixed(2)} MB`);

  // 6. Test search performance on tuple format
  console.log('\n--- Benchmarking Search Speed on 50,884 items ---');
  const queries = ['النيات', 'الوضوء', 'بر الوالدين', 'الصلاة', 'الحياء', 'الجهاد', 'الصوم', 'الايمان'];

  for (const q of queries) {
    const normQ = normalizeArabic(q);
    const start = performance.now();
    let matches = 0;
    for (let i = 0; i < tuple70.length; i++) {
      if (tuple70[i][3].includes(normQ)) {
        matches++;
      }
    }
    const elapsed = (performance.now() - start).toFixed(3);
    console.log(`Query "${q}" -> ${matches} matches in ${elapsed} ms`);
  }
}

testIndexFormats().catch(console.error);
