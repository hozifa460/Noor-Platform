import { loadHadithBook } from '../src/lib/hadith/index.ts';
import { extractHadithMatn, normalizeArabicText } from './generate_hadiths_micro_index.mjs';
import { normalizeArabic, arabicSearchMatch } from '../src/lib/arabic/normalizer.ts';

async function deepAudit() {
  console.log('=== DEEP AUDIT OF FAMOUS HADITHS ACROSS 17 BOOKS ===\n');

  // Let's check "بر الوالدين"
  console.log('--- 1. Scanning for "بر الوالدين" across books ---');
  const booksToCheck = ['bukhari.json', 'muslim.json', 'aladab_almufrad.json', 'riyad_assalihin.json', 'tirmidhi.json'];
  for (const bName of booksToCheck) {
    const book = await loadHadithBook(bName);
    if (!book) continue;
    for (const h of book.hadiths) {
      const normRaw = normalizeArabic(h.arabic);
      if (normRaw.includes('بر الوالدين') || (normRaw.includes('بر') && normRaw.includes('والدين'))) {
        const extracted = extractHadithMatn(h.arabic);
        const snip44 = extracted.slice(0, 44);
        console.log(`  [${bName} H#${h.idInBook}]:`);
        console.log(`    Norm Raw (first 100): "${normRaw.slice(0, 100)}..."`);
        console.log(`    Extracted (first 100): "${extracted.slice(0, 100)}..."`);
        console.log(`    Snippet 44:           "${snip44}"`);
        console.log(`    Match in extracted:   ${arabicSearchMatch(extracted, 'بر الوالدين')}`);
        console.log(`    Match in snippet44:   ${arabicSearchMatch(snip44, 'بر الوالدين')}`);
      }
    }
  }

  // Let's check "لا تغضب"
  console.log('\n--- 2. Scanning for "لا تغضب" ---');
  for (const bName of ['bukhari.json', 'nawawi40.json', 'tirmidhi.json', 'ahmed.json']) {
    const book = await loadHadithBook(bName);
    if (!book) continue;
    for (const h of book.hadiths) {
      const normRaw = normalizeArabic(h.arabic);
      if (normRaw.includes('لا تغضب')) {
        const extracted = extractHadithMatn(h.arabic);
        const snip44 = extracted.slice(0, 44);
        console.log(`  [${bName} H#${h.idInBook}]:`);
        console.log(`    Norm Raw (first 100): "${normRaw.slice(0, 100)}..."`);
        console.log(`    Extracted (first 100): "${extracted.slice(0, 100)}..."`);
        console.log(`    Snippet 44:           "${snip44}"`);
        console.log(`    Match in extracted:   ${arabicSearchMatch(extracted, 'لا تغضب')}`);
        console.log(`    Match in snippet44:   ${arabicSearchMatch(snip44, 'لا تغضب')}`);
      }
    }
  }
}

deepAudit().catch(console.error);
