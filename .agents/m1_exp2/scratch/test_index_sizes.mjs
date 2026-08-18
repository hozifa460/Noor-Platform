import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';
import { normalizeArabicText, extractHadithMatn } from './full_test.mjs';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

async function testIndexSizes() {
  console.log('Testing Micro-Index size optimizations across all 50,884 Hadiths...\n');

  const books = HADITH_BOOKS_LIST.map(b => b.id);
  const grades = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];

  // Let's test snippet lengths: 40, 50, 60, 80, 100
  const lengths = [40, 50, 60, 80, 100];
  const itemsByLen = {
    40: [],
    50: [],
    60: [],
    80: [],
    100: [],
  };

  for (let bIdx = 0; bIdx < HADITH_BOOKS_LIST.length; bIdx++) {
    const book = HADITH_BOOKS_LIST[bIdx];
    const res = await fetch(`${HF_SUNNAH_BASE}/${book.fileName}`);
    const data = await res.json();
    if (!data || !data.hadiths) continue;

    for (const h of data.hadiths) {
      const matn = extractHadithMatn(h.arabic);
      const gradeIdx = (book.id === 'bukhari' || book.id === 'muslim' || book.id === 'nawawi40') ? 0 : 4;

      for (const len of lengths) {
        // tuple: [bookIdx, hadithId, chapterId, textSnippet, gradeIdx]
        itemsByLen[len].push([
          bIdx,
          h.idInBook,
          h.chapterId,
          matn.slice(0, len),
          gradeIdx
        ]);
      }
    }
  }

  console.log(`Total items collected: ${itemsByLen[50].length}\n`);

  for (const len of lengths) {
    const payload = {
      books,
      grades,
      items: itemsByLen[len],
    };
    const jsonStr = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf-8');
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`Snippet Length = ${len.toString().padStart(3, ' ')} chars -> Size: ${sizeBytes.toLocaleString()} bytes (${sizeMB} MB)`);
  }
}

testIndexSizes().catch(console.error);
