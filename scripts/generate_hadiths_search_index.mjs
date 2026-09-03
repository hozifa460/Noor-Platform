import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith/data.ts';
import { normalizeArabic, tokenizeArabic } from '../src/lib/arabic/normalizer.ts';

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

console.log('\n⚡ Building High-Precision Full-Text Inverted Hadith Index (17 Books)...\n');

const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function fetchBook(fileName) {
  const localPath = path.join(outputDir, fileName);
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  }
  const url = `${HF_SUNNAH_BASE}/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
  return await res.json();
}

async function main() {
  const books = HADITH_BOOKS_LIST.map((b) => b.id);
  const wordIndex = {}; // word -> Array of [bookIdx, idInBook, chapterId]

  const STOP_WORDS = new Set([
    'في', 'من', 'ما', 'لا', 'الي', 'علي', 'هو', 'هي', 'ثم', 'او', 'ان', 'انما',
    'كل', 'ذلك', 'به', 'له', 'بها', 'لنا', 'لهم', 'كان', 'كانت', 'يكون', 'تكون'
  ]);

  let totalTokens = 0;
  let totalHadiths = 0;

  for (let bIdx = 0; bIdx < HADITH_BOOKS_LIST.length; bIdx++) {
    const book = HADITH_BOOKS_LIST[bIdx];
    process.stdout.write(`Indexing [${bIdx + 1}/17] ${book.nameAr}... `);

    try {
      const data = await fetchBook(book.fileName);
      if (!data || !data.hadiths) continue;

      let bookHadiths = 0;
      for (const h of data.hadiths) {
        const norm = normalizeArabic(h.arabic || '');
        const tokens = norm.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

        // Use a set per Hadith to avoid duplicate postings for same hadith
        const uniqueTokens = new Set(tokens);

        for (const t of uniqueTokens) {
          if (!wordIndex[t]) {
            wordIndex[t] = [];
          }
          wordIndex[t].push([bIdx, h.idInBook, h.chapterId ?? 0]);
          totalTokens++;
        }

        // Also index root 'والد' if contains 'والد'
        if (norm.includes('والد') || norm.includes('والدين') || norm.includes('والديه')) {
          if (!wordIndex['والدين']) wordIndex['والدين'] = [];
          if (!uniqueTokens.has('والدين')) {
            wordIndex['والدين'].push([bIdx, h.idInBook, h.chapterId ?? 0]);
          }
        }

        bookHadiths++;
        totalHadiths++;
      }

      console.log(`✅ Indexed ${bookHadiths.toLocaleString()} hadiths.`);
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  const payload = {
    books,
    index: wordIndex,
  };

  const outputPath = path.join(outputDir, 'hadiths_search_index.json');
  const jsonContent = JSON.stringify(payload);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');

  const bytes = Buffer.byteLength(jsonContent, 'utf-8');
  const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
  const uniqueWords = Object.keys(wordIndex).length;

  console.log(`\n🎉 High-Precision Search Index Generated:`);
  console.log(`   - Output File: ${outputPath}`);
  console.log(`   - Total Hadiths Indexed: ${totalHadiths.toLocaleString()}`);
  console.log(`   - Unique Search Terms: ${uniqueWords.toLocaleString()}`);
  console.log(`   - File Size: ${bytes.toLocaleString()} bytes (${sizeMB} MB)\n`);
}

main().catch(console.error);
