import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeArabicText, extractHadithMatn, GRADE_DICTIONARY } from '../../scripts/generate_hadiths_micro_index.mjs';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { getHadithGrade } from '../../src/lib/hadith-grade-engine.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';
const indexPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');

async function runAudit() {
  console.log('=== COMPREHENSIVE M1 ADVERSARIAL AUDIT ===\n');

  // 1. File Size and Format Audit
  if (!fs.existsSync(indexPath)) {
    console.error('❌ hadiths_micro_index.json DOES NOT EXIST');
    return;
  }

  const stat = fs.statSync(indexPath);
  const rawContent = fs.readFileSync(indexPath, 'utf-8');
  const indexData = JSON.parse(rawContent);

  console.log(`[1] File Size Check:`);
  console.log(`    Bytes: ${stat.size.toLocaleString()}`);
  console.log(`    MB: ${(stat.size / (1024 * 1024)).toFixed(3)} MB`);
  console.log(`    Ceiling: < 3,000,000 bytes`);
  console.log(`    Status: ${stat.size < 3000000 ? '✅ PASS' : '❌ FAIL (EXCEEDS 3MB)'}`);

  // 2. Schema and Integrity
  console.log(`\n[2] Schema & Structure Check:`);
  console.log(`    Books count: ${indexData.books?.length} (expected 17) -> ${indexData.books?.length === 17 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    Grades count: ${indexData.grades?.length} (expected 5) -> ${indexData.grades?.length === 5 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    Items count: ${indexData.items?.length?.toLocaleString()} (expected 50,884) -> ${indexData.items?.length === 50884 ? '✅ PASS' : '❌ FAIL'}`);

  let nullCount = 0;
  let invalidTupleCount = 0;
  let emptySnippetCount = 0;
  let invalidGradeIdxCount = 0;
  let invalidBookIdxCount = 0;

  for (let i = 0; i < indexData.items.length; i++) {
    const it = indexData.items[i];
    if (!Array.isArray(it) || it.length !== 5) {
      invalidTupleCount++;
      continue;
    }
    const [bIdx, hId, cId, snippet, gIdx] = it;
    if (typeof bIdx !== 'number' || bIdx < 0 || bIdx >= indexData.books.length) invalidBookIdxCount++;
    if (typeof hId !== 'number') nullCount++;
    if (typeof cId !== 'number') nullCount++;
    if (typeof snippet !== 'string' || snippet.trim().length === 0) emptySnippetCount++;
    if (typeof gIdx !== 'number' || gIdx < 0 || gIdx >= indexData.grades.length) invalidGradeIdxCount++;
  }

  console.log(`    Invalid tuples: ${invalidTupleCount}`);
  console.log(`    Invalid book indices: ${invalidBookIdxCount}`);
  console.log(`    Invalid grade indices: ${invalidGradeIdxCount}`);
  console.log(`    Empty snippets: ${emptySnippetCount}`);
  console.log(`    Null/NaN metadata: ${nullCount}`);

  // 3. Grade Distribution & Raw Grade inspection
  console.log(`\n[3] Grade Distribution:`);
  const gradeDist = {};
  indexData.grades.forEach(g => gradeDist[g] = 0);
  indexData.items.forEach(it => {
    const g = indexData.grades[it[4]];
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  });
  for (const [g, count] of Object.entries(gradeDist)) {
    console.log(`    ${g.padEnd(10)}: ${count.toLocaleString()}`);
  }

  // 4. Sample Hadith extraction from raw JSONs (Local/HF)
  console.log(`\n[4] Deep Matn Extraction & Isnad Stripping Analysis across Collections:`);
  const sampleBooks = ['bukhari.json', 'muslim.json', 'abudawud.json', 'tirmidhi.json', 'ahmed.json', 'malik.json', 'nawawi40.json', 'shahwaliullah40.json'];
  
  let totalSampled = 0;
  let isnadResidualCount = 0;
  let overstrippedCount = 0;

  for (const fileName of sampleBooks) {
    let bookJson;
    const localP = path.join(process.cwd(), 'public', 'data', 'hadith', fileName);
    if (fs.existsSync(localP)) {
      bookJson = JSON.parse(fs.readFileSync(localP, 'utf-8'));
    } else {
      const res = await fetch(`${HF_SUNNAH_BASE}/${fileName}`);
      bookJson = await res.json();
    }

    console.log(`\n--- Auditing ${fileName} (${bookJson.hadiths.length} hadiths) ---`);
    let bookIsnadResiduals = 0;
    let bookSamples = Math.min(bookJson.hadiths.length, 500);

    for (let i = 0; i < bookSamples; i++) {
      const h = bookJson.hadiths[i];
      const raw = h.arabic;
      const norm = normalizeArabicText(raw);
      const matn = extractHadithMatn(raw);

      totalSampled++;

      // Check if Isnad terms still lead the matn
      if (/^(?:حدثنا|حدثني|اخبرنا|اخبرني|انبان|انبانا|روي)\s+/i.test(matn)) {
        bookIsnadResiduals++;
        isnadResidualCount++;
        if (bookIsnadResiduals <= 2) {
          console.log(`  ⚠️ Isnad residual [${fileName} #${h.idInBook}]: "${matn.slice(0, 50)}..."`);
        }
      }

      // Check if matn is unexpectedly tiny when raw is long
      if (raw.length > 100 && matn.length < 15) {
        overstrippedCount++;
        console.log(`  ⚠️ Overstripped [${fileName} #${h.idInBook}]: raw len ${raw.length} -> matn len ${matn.length} ("${matn}")`);
      }
    }

    console.log(`  Sampled ${bookSamples}: Isnad residuals = ${bookIsnadResiduals}`);
  }

  console.log(`\n[5] Overall Extraction Metrics on ${totalSampled} samples:`);
  console.log(`    Isnad residual rate: ${((isnadResidualCount / totalSampled) * 100).toFixed(2)}% (${isnadResidualCount}/${totalSampled})`);
  console.log(`    Overstripped rate: ${((overstrippedCount / totalSampled) * 100).toFixed(2)}% (${overstrippedCount}/${totalSampled})`);

  // 6. Snippet Length & UTF-8 Byte Size Simulation
  console.log(`\n[6] UTF-8 Byte Simulation for Different Snippet Lengths:`);
  for (const snippetLen of [18, 20, 22, 24, 28, 32, 44]) {
    let simBytes = 0;
    // Base JSON structure: {"books":[...],"grades":[...],"items":[...]}
    const headerStr = JSON.stringify({ books: indexData.books, grades: indexData.grades, items: [] });
    simBytes += Buffer.byteLength(headerStr, 'utf-8');

    for (const it of indexData.items) {
      const snippet = it[3].slice(0, snippetLen);
      // Item format: [0,1,1,"...",0],
      const itemStr = `[${it[0]},${it[1]},${it[2]},${JSON.stringify(snippet)},${it[4]}],`;
      simBytes += Buffer.byteLength(itemStr, 'utf-8');
    }
    const mb = (simBytes / (1024 * 1024)).toFixed(3);
    const pass = simBytes < 3000000;
    console.log(`    Snippet Len ${String(snippetLen).padEnd(2)}: ${simBytes.toLocaleString()} bytes (${mb} MB) -> ${pass ? '✅ < 3MB' : '❌ >= 3MB'}`);
  }
}

runAudit().catch(console.error);
