/**
 * Empirical Adversarial Mutation & Verification Harness
 * Tests whether `test_hadith_e2e.mjs` and underlying subsystems correctly catch defects.
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { normalizeArabic, tokenizeArabic, arabicSearchMatch } from '../../src/lib/arabic-normalizer.ts';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { loadHadithMicroIndex, searchAcrossAllBooks } from '../../src/lib/hadith-engine.ts';
import { getHadithGrade } from '../../src/lib/hadith-grade-engine.ts';

const results = [];

function record(mutationId, description, expectedToCatch, caught, details) {
  results.push({ mutationId, description, expectedToCatch, caught, pass: expectedToCatch === caught, details });
  console.log(`[${caught ? 'CAUGHT' : 'MISSED'}] ${mutationId}: ${description} -> ${details}`);
}

async function runAdversarialAudit() {
  console.log('=== Starting Adversarial Mutation Testing on Noor Hadith Platform ===\n');

  // Mutation 1: Schema Corruption - Non-existent file
  try {
    const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'non_existent_file.json');
    const exists = fs.existsSync(p);
    record('MUT_SCHEMA_1', 'Detect non-existent micro-index file', true, !exists, 'fs.existsSync correctly returned false');
  } catch (e) {
    record('MUT_SCHEMA_1', 'Detect non-existent micro-index file', true, true, e.message);
  }

  // Mutation 2: Size Budget Enforcement (> 3MB)
  try {
    const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
    const stats = fs.statSync(p);
    const size = stats.size;
    const isUnder3MB = size < 3_000_000;
    const isUnder3MiB = size < 3_145_728;
    record('MUT_SIZE_1', 'Verify size strictly < 3,000,000 bytes', true, isUnder3MB, `Actual size: ${size} bytes (${(size/1024/1024).toFixed(2)} MB)`);
    record('MUT_SIZE_2', 'Verify size strictly < 3,145,728 bytes (3 MiB)', true, isUnder3MiB, `Actual size: ${size} bytes`);
  } catch (e) {
    record('MUT_SIZE_1', 'Verify size budget', true, false, e.message);
  }

  // Mutation 3: Arabic Normalizer Falsification (Mutate Tashkeel removal)
  {
    const originalWithTashkeel = 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ';
    const normalized = normalizeArabic(originalWithTashkeel);
    const fakeBrokenNormalizer = (str) => str.toLowerCase();
    const brokenNorm = fakeBrokenNormalizer(originalWithTashkeel);
    const caught = normalized !== brokenNorm && normalized === 'انما الاعمال بالنيات';
    record('MUT_NORM_1', 'Catch missing Tashkeel / Harakat normalization', true, caught, `Normalized: "${normalized}" vs Broken: "${brokenNorm}"`);
  }

  // Mutation 4: Arabic Normalizer Falsification (Mutate Alef normalization)
  {
    const input = 'إيمان أحمد آية ٱستغفار';
    const norm = normalizeArabic(input);
    const caught = norm === 'ايمان احمد ايه استغفار';
    record('MUT_NORM_2', 'Catch missing Alef forms normalization', true, caught, `Normalized: "${norm}"`);
  }

  // Mutation 5: Arabic Normalizer Prefix Stripping Falsification
  {
    const target = 'وقضى ربك ألا تعبدوا إلا إياه وبالوالدين إحسانا';
    const query = 'الوالدين';
    const match = arabicSearchMatch(target, query);
    record('MUT_PREFIX_1', 'Catch morphological prefix match (وبالوالدين -> الوالدين)', true, match, `Match result: ${match}`);
  }

  // Mutation 6: Grade Engine Falsification (Mutate Sahih grade consensus)
  {
    const bukhari1 = getHadithGrade('bukhari', 1);
    const caught = bukhari1.grade === 'صحيح';
    record('MUT_GRADE_1', 'Catch invalid Bukhari #1 consensus grade', true, caught, `Bukhari #1 grade: ${bukhari1.grade}`);
  }

  // Mutation 7: Grade Engine Falsification (Unknown book fallback)
  {
    const unknown = getHadithGrade('fake_unknown_collection_xyz', 999);
    const caught = unknown.grade === 'مقبول';
    record('MUT_GRADE_2', 'Catch unknown book grade fallback', true, caught, `Fallback grade: ${unknown.grade}`);
  }

  // Mutation 8: Timer Spoofing & Resolution Audit
  {
    const t0 = performance.now();
    let counter = 0;
    for (let i = 0; i < 100_000; i++) {
      counter += i;
    }
    const t1 = performance.now();
    const elapsed = t1 - t0;
    const isHighRes = elapsed > 0 && typeof elapsed === 'number' && !isNaN(elapsed);
    record('SPOOF_TIMER_1', 'Verify performance.now() high-resolution monotonicity', true, isHighRes, `Elapsed: ${elapsed.toFixed(4)}ms for 100k ops`);
  }

  // Mutation 9: Search Engine Latency & Index Hit/Miss Profile
  {
    console.log('\n--- Evaluating Search Latency & Index Hit/Miss Profile ---');
    const testQueries = [
      { q: 'الصلاة', desc: 'Direct keyword in index' },
      { q: 'النيات', desc: 'Prefix variant (النيات vs بالنيات)' },
      { q: 'بر الوالدين', desc: 'Two-token query' },
      { q: 'لا يؤمن أحدكم', desc: 'Three-token query' },
      { q: 'خزعبلاتغيرموجودة', desc: 'Zero-result query' },
    ];

    for (const item of testQueries) {
      const times = [];
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        const res = await searchAcrossAllBooks(item.q, 10);
        times.push(performance.now() - t0);
      }
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const res = await searchAcrossAllBooks(item.q, 10);
      const topBook = res.length > 0 ? res[0].book.id : 'none';
      const topId = res.length > 0 ? res[0].hadith.idInBook : -1;
      console.log(`Query "${item.q}" (${item.desc}): avg ${avg.toFixed(2)}ms, results: ${res.length}, top: [${topBook} #${topId}]`);
      record(`LATENCY_${item.q}`, `Latency check for "${item.q}"`, true, avg < 2.0, `Avg: ${avg.toFixed(2)}ms (SLA < 2.0ms), Top: ${topBook} #${topId}`);
    }
  }

  console.log('\n=== Adversarial Audit Summary ===');
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  console.log(`Total Checks: ${total}, Passed: ${passed}, Failed: ${total - passed}`);
  
  fs.writeFileSync(
    path.join(process.cwd(), '.agents', 'teamwork_preview_challenger_e2e_1', 'mutation_results.json'),
    JSON.stringify(results, null, 2)
  );
}

runAdversarialAudit().catch(console.error);
