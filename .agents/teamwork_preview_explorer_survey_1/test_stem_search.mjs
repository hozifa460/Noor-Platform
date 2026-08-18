import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

function stemArabicWord(word) {
  let norm = normalizeArabic(word);
  if (!norm || norm.length <= 2) return norm;

  if (norm.startsWith('بال') || norm.startsWith('فال') || norm.startsWith('وال') || norm.startsWith('كال')) {
    if (norm.length > 4) norm = norm.slice(3);
  } else if (norm.startsWith('لل')) {
    if (norm.length > 3) norm = norm.slice(2);
  } else if (norm.startsWith('ال')) {
    if (norm.length > 3) norm = norm.slice(2);
  } else if ((norm.startsWith('و') || norm.startsWith('ف') || norm.startsWith('ب') || norm.startsWith('ل')) && norm.length > 3) {
    norm = norm.slice(1);
  }

  return norm;
}

const stopWords = new Set([
  'قال', 'حدثنا', 'اخبرنا', 'عن', 'رسول', 'الله', 'صلي', 'عليه', 'وسلم',
  'رضي', 'عنه', 'قالت', 'سمعت', 'ان', 'في', 'من', 'ما', 'لا', 'الي', 'علي',
  'هو', 'هي', 'ثم', 'او', 'كان', 'كانت', 'كل', 'ذلك', 'به', 'له', 'بها'
]);

async function testSearchWithStemming() {
  const url = `${HF_SUNNAH_BASE}/All_hadith_books/bukhari.json`;
  const res = await fetch(url);
  const data = await res.json();

  const stemIndex = new Map();

  for (const h of data.hadiths) {
    const norm = normalizeArabic(h.arabic);
    const tokens = tokenizeArabic(norm);
    const seen = new Set();

    for (const t of tokens) {
      if (t.length < 3 || stopWords.has(t)) continue;
      const stem = stemArabicWord(t);
      for (const w of [t, stem]) {
        if (w.length >= 3 && !stopWords.has(w) && !seen.has(w)) {
          seen.add(w);
          if (!stemIndex.has(w)) stemIndex.set(w, []);
          stemIndex.get(w).push(h.idInBook);
        }
      }
    }
  }

  const queries = ['النيات', 'الوضوء', 'بر الوالدين', 'الصلاة', 'الحياء', 'الجهاد', 'الصوم', 'الايمان'];
  for (const q of queries) {
    const tokens = tokenizeArabic(q);
    const start = performance.now();
    let candidates = null;
    for (const t of tokens) {
      const stem = stemArabicWord(t);
      const list = stemIndex.get(t) || stemIndex.get(stem) || [];
      if (candidates === null) {
        candidates = new Set(list);
      } else {
        const next = new Set(list);
        const inter = new Set();
        for (const id of candidates) {
          if (next.has(id)) inter.add(id);
        }
        candidates = inter;
      }
    }
    const elapsed = (performance.now() - start).toFixed(3);
    const arr = candidates ? Array.from(candidates) : [];
    console.log(`Query: "${q.padEnd(12)}" -> ${String(arr.length).padStart(4)} matches in ${elapsed.padStart(6)} ms | Hadiths: ${arr.slice(0, 5).join(', ')}`);
  }
}

testSearchWithStemming().catch(console.error);
