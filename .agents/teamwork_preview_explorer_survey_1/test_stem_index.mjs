import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

const stopWords = new Set([
  'قال', 'حدثنا', 'اخبرنا', 'عن', 'رسول', 'الله', 'صلي', 'عليه', 'وسلم',
  'رضي', 'عنه', 'قالت', 'سمعت', 'ان', 'في', 'من', 'ما', 'لا', 'الي', 'علي',
  'هو', 'هي', 'ثم', 'او', 'كان', 'كانت', 'كل', 'ذلك', 'به', 'له', 'بها',
  'انما', 'انه', 'انها', 'فقال', 'فقالت', 'فقلت', 'قلت', 'اتي', 'جاء'
]);

async function testFullStemIndex() {
  console.log('Testing Full Stem Index Generation from Hadith Texts...');

  const invertedMap = {};
  const bookIndexMap = Object.fromEntries(HADITH_BOOKS_LIST.map((b, i) => [b.id, i]));

  // Let's test on 3 sample books first: bukhari, muslim, nawawi40
  const sampleBooks = ['bukhari', 'muslim', 'nawawi40'];

  for (const bId of sampleBooks) {
    const meta = HADITH_BOOKS_LIST.find(b => b.id === bId);
    const url = `${HF_SUNNAH_BASE}/All_hadith_books/${meta.fileName}`;
    const res = await fetch(url);
    const data = await res.json();
    const bIdx = bookIndexMap[bId];

    for (const h of data.hadiths) {
      const norm = normalizeArabic(h.arabic);
      const tokens = tokenizeArabic(norm);
      const seenForHadith = new Set();

      for (const t of tokens) {
        if (t.length < 3 || stopWords.has(t)) continue;
        // Also stem if starts with 'ال'
        const stem = t.startsWith('ال') && t.length > 3 ? t.slice(2) : t;
        if (seenForHadith.has(t) && seenForHadith.has(stem)) continue;

        for (const word of [t, stem]) {
          if (!seenForHadith.has(word)) {
            seenForHadith.add(word);
            if (!invertedMap[word]) invertedMap[word] = [];
            // store compact [bIdx, hadithNumber, chapterId]
            invertedMap[word].push([bIdx, h.idInBook, h.chapterId]);
          }
        }
      }
    }
  }

  const queries = ['النيات', 'نيات', 'الوضوء', 'بر الوالدين', 'الصلاة', 'الحياء', 'الايمان'];
  for (const q of queries) {
    const norm = normalizeArabic(q);
    const tokens = tokenizeArabic(norm);
    const start = performance.now();
    let candidates = null;
    for (const t of tokens) {
      const stem = t.startsWith('ال') && t.length > 3 ? t.slice(2) : t;
      const list = invertedMap[t] || invertedMap[stem] || [];
      if (candidates === null) {
        candidates = new Set(list.map(p => `${p[0]}_${p[1]}`));
      } else {
        const next = new Set(list.map(p => `${p[0]}_${p[1]}`));
        const inter = new Set();
        for (const c of candidates) {
          if (next.has(c)) inter.add(c);
        }
        candidates = inter;
      }
    }
    const elapsed = (performance.now() - start).toFixed(3);
    console.log(`Query "${q.padEnd(15)}" -> ${String(candidates ? candidates.size : 0).padStart(4)} matches in ${elapsed} ms`);
  }
}

testFullStemIndex().catch(console.error);
