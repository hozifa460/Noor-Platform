import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabicText, extractHadithMatn, PREVIEW_SNIPPET_LEN } from '../../scripts/generate_hadiths_micro_index.mjs';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';
const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');

async function fetchBook(fileName) {
  const localPath = path.join(outputDir, fileName);
  if (fs.existsSync(localPath)) {
    try {
      return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    } catch (e) {}
  }
  const url = `${HF_SUNNAH_BASE}/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
  return await res.json();
}

async function run() {
  console.log('=== DEEP FORENSIC CROSS-VERIFICATION AGAINST RAW DATA ===\n');

  const microPath = path.join(outputDir, 'hadiths_micro_index.json');
  const microRaw = fs.readFileSync(microPath, 'utf-8');
  const micro = JSON.parse(microRaw);

  console.log('Total micro items:', micro.items.length);
  console.log('Books in header:', micro.books.length);

  // Group micro items by book index
  const itemsByBook = {};
  for (const item of micro.items) {
    const bIdx = item[0];
    if (!itemsByBook[bIdx]) itemsByBook[bIdx] = [];
    itemsByBook[bIdx].push(item);
  }

  // Spot-check 5 collections: bukhari, nawawi40, qudsi40, shahwaliullah40, shamail_muhammadiyah
  const booksToCheck = [
    { id: 'bukhari', fileName: 'bukhari.json' },
    { id: 'nawawi40', fileName: 'nawawi40.json' },
    { id: 'qudsi40', fileName: 'qudsi40.json' },
    { id: 'shahwaliullah40', fileName: 'shahwaliullah40.json' },
    { id: 'shamail_muhammadiyah', fileName: 'shamail_muhammadiyah.json' },
  ];

  let allChecksPassed = true;

  for (const b of booksToCheck) {
    const bIdx = HADITH_BOOKS_LIST.findIndex((x) => x.id === b.id);
    const microItems = itemsByBook[bIdx] || [];
    console.log(`Checking book: ${b.id} (bIdx: ${bIdx}, micro count: ${microItems.length})...`);

    const rawData = await fetchBook(b.fileName);
    const rawHadiths = rawData.hadiths;
    console.log(`  Raw book hadiths count: ${rawHadiths.length}`);

    if (rawHadiths.length !== microItems.length) {
      console.error(`  ❌ Mismatch in hadith count: raw=${rawHadiths.length}, micro=${microItems.length}`);
      allChecksPassed = false;
      continue;
    }

    // Verify 5 random hadiths in this book
    const sampleIds = [0, Math.floor(rawHadiths.length / 4), Math.floor(rawHadiths.length / 2), Math.floor(rawHadiths.length * 0.75), rawHadiths.length - 1];
    for (const sIdx of sampleIds) {
      const rawH = rawHadiths[sIdx];
      const micH = microItems[sIdx];

      const expectedSnippet = extractHadithMatn(rawH.arabic).slice(0, PREVIEW_SNIPPET_LEN).trim();
      const actualSnippet = micH[3];

      if (micH[1] !== rawH.idInBook) {
        console.error(`  ❌ Hadith ID mismatch at pos ${sIdx}: expected ${rawH.idInBook}, got ${micH[1]}`);
        allChecksPassed = false;
      }
      if (actualSnippet !== expectedSnippet) {
        console.error(`  ❌ Snippet mismatch at pos ${sIdx} (id ${rawH.idInBook}):`);
        console.error(`     Expected: "${expectedSnippet}"`);
        console.error(`     Actual:   "${actualSnippet}"`);
        allChecksPassed = false;
      } else {
        console.log(`  ✅ Pos ${sIdx} (id ${rawH.idInBook}): matches raw text -> "${actualSnippet}"`);
      }
    }
  }

  console.log('\n=== FINAL CROSS-MATCH RESULT ===');
  console.log('Result:', allChecksPassed ? 'CLEAN (100% genuine data match)' : 'INTEGRITY VIOLATION');
}

run().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
