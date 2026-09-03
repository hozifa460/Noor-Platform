import fs from 'node:fs';
import path from 'node:path';
import { loadHadithBook } from '../src/lib/hadith/index.ts';
import { extractHadithMatn, normalizeArabicText } from './generate_hadiths_micro_index.mjs';
import { normalizeArabic, arabicSearchMatch } from '../src/lib/arabic/normalizer.ts';

async function investigateFailures() {
  console.log('=== INVESTIGATING BENCHMARK ZERO-HITS ===\n');

  // 1. "بر الوالدين"
  console.log('--- 1. Investigating "بر الوالدين" ---');
  const adab = await loadHadithBook('aladab_almufrad.json');
  if (adab) {
    const hits = adab.hadiths.filter(h => h.arabic.includes('الوالدين') || h.arabic.includes('والديه'));
    console.log(`Found ${hits.length} hadiths mentioning الوالدين in Al-Adab al-Mufrad.`);
    for (const h of hits.slice(0, 5)) {
      const norm = normalizeArabicText(h.arabic);
      const extracted = extractHadithMatn(h.arabic);
      const snippet25 = extracted.slice(0, 25);
      const snippet44 = extracted.slice(0, 44);
      console.log(`  H#${h.idInBook}:`);
      console.log(`    Raw start:       "${h.arabic.slice(0, 80)}..."`);
      console.log(`    Extracted start: "${extracted.slice(0, 80)}..."`);
      console.log(`    Snippet (44ch):  "${snippet44}"`);
      console.log(`    arabicSearchMatch(snippet44, 'بر الوالدين'): ${arabicSearchMatch(snippet44, 'بر الوالدين')}`);
      console.log(`    arabicSearchMatch(snippet44, 'الوالدين'):    ${arabicSearchMatch(snippet44, 'الوالدين')}`);
    }
  }

  // Check Bukhari for "بر الوالدين"
  const bukhari = await loadHadithBook('bukhari.json');
  if (bukhari) {
    const bHits = bukhari.hadiths.filter(h => h.arabic.includes('الوالدين') || h.arabic.includes('والديك'));
    console.log(`\nFound ${bHits.length} hadiths mentioning الوالدين in Bukhari.`);
    for (const h of bHits.slice(0, 3)) {
      const extracted = extractHadithMatn(h.arabic);
      const snippet44 = extracted.slice(0, 44);
      console.log(`  Bukhari H#${h.idInBook}: "${snippet44}" -> Match 'بر الوالدين': ${arabicSearchMatch(snippet44, 'بر الوالدين')}`);
    }
  }

  // 2. "احفظ الله يحفظك"
  console.log('\n--- 2. Investigating "احفظ الله يحفظك" ---');
  const tirmidhi = await loadHadithBook('tirmidhi.json');
  const nawawi = await loadHadithBook('nawawi40.json');
  if (tirmidhi) {
    const tHits = tirmidhi.hadiths.filter(h => h.arabic.includes('احفظ الله') || h.arabic.includes('احفظ'));
    console.log(`Found ${tHits.length} hadiths mentioning احفظ in Tirmidhi.`);
    for (const h of tHits.slice(0, 3)) {
      const extracted = extractHadithMatn(h.arabic);
      console.log(`  Tirmidhi H#${h.idInBook}: Raw start: "${h.arabic.slice(0, 100)}..."`);
      console.log(`    Extracted: "${extracted.slice(0, 100)}..."`);
      console.log(`    Snippet(44): "${extracted.slice(0, 44)}"`);
      console.log(`    Match "احفظ الله يحفظك": ${arabicSearchMatch(extracted.slice(0, 44), 'احفظ الله يحفظك')}`);
    }
  }
  if (nawawi) {
    // Hadith 19 in Nawawi 40 is "احفظ الله يحفظك"
    const h19 = nawawi.hadiths[18];
    if (h19) {
      const extracted = extractHadithMatn(h19.arabic);
      console.log(`  Nawawi 40 #19: Raw: "${h19.arabic.slice(0, 120)}..."`);
      console.log(`    Extracted: "${extracted.slice(0, 120)}..."`);
      console.log(`    Snippet(44): "${extracted.slice(0, 44)}"`);
      console.log(`    Match "احفظ الله يحفظك": ${arabicSearchMatch(extracted.slice(0, 44), 'احفظ الله يحفظك')}`);
    }
  }

  // 3. "استفت قلبك"
  console.log('\n--- 3. Investigating "استفت قلبك" ---');
  const ahmed = await loadHadithBook('ahmed.json');
  const darimi = await loadHadithBook('darimi.json');
  if (nawawi) {
    const h27 = nawawi.hadiths[26];
    if (h27) {
      const extracted = extractHadithMatn(h27.arabic);
      console.log(`  Nawawi 40 #27 (استفت قلبك): Raw: "${h27.arabic.slice(0, 120)}..."`);
      console.log(`    Extracted: "${extracted.slice(0, 120)}..."`);
      console.log(`    Snippet(44): "${extracted.slice(0, 44)}"`);
      console.log(`    Match "استفت قلبك": ${arabicSearchMatch(extracted.slice(0, 44), 'استفت قلبك')}`);
    }
  }

  // 4. "لا تغضب"
  console.log('\n--- 4. Investigating "لا تغضب" ---');
  if (bukhari) {
    const h6116 = bukhari.hadiths.find(h => h.arabic.includes('لا تغضب'));
    if (h6116) {
      const extracted = extractHadithMatn(h6116.arabic);
      console.log(`  Bukhari "لا تغضب" (H#${h6116.idInBook}): Raw: "${h6116.arabic.slice(0, 120)}..."`);
      console.log(`    Extracted: "${extracted.slice(0, 120)}..."`);
      console.log(`    Snippet(44): "${extracted.slice(0, 44)}"`);
      console.log(`    Match "لا تغضب": ${arabicSearchMatch(extracted.slice(0, 44), 'لا تغضب')}`);
    }
  }
}

investigateFailures().catch(console.error);
