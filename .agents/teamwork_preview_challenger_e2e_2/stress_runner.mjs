/**
 * Empirical Stress Harness - Noor Sunnah Platform
 * teamwork_preview_challenger_e2e_2
 */

import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import {
  normalizeArabic,
  tokenizeArabic,
  arabicSearchMatch,
} from '../../src/lib/arabic-normalizer.ts';
import {
  loadHadithBook,
  loadHadithMicroIndex,
  loadHadeethEncSharh,
  findHadithSharh,
  searchHadithsInBook,
  searchAcrossAllBooks,
} from '../../src/lib/hadith-engine.ts';
import { getHadithGrade } from '../../src/lib/hadith-grade-engine.ts';

const report = {
  timestamp: new Date().toISOString(),
  baselineResults: {},
  concurrencyTest: {},
  burstMemoryTest: {},
  rankingCorrectnessTest: {},
  boundaryStressTest: {},
  criticalBugsFound: [],
};

console.log('🚀 Starting Empirical Stress-Testing Harness...\n');

// 1. RANKING & ACCURACY DEEP-DIVE
console.log('--- TEST SUITE 1: Ranking & Sahihayn Prioritization Deep Dive ---');
const rankingQueries = [
  { query: 'إنما الأعمال بالنيات', expectedTopBook: 'bukhari', expectedId: 1 },
  { query: 'بالنيات', expectedTopBook: 'bukhari', expectedId: 1 },
  { query: 'بر الوالدين', expectedTopBook: 'bukhari' },
  { query: 'وبالوالدين', expectedTopBook: 'bukhari' },
  { query: 'الصلاة', expectedTopBook: 'bukhari' },
  { query: 'الطهور شطر الإيمان', expectedTopBook: 'muslim' },
  { query: 'طلب العلم فريضة', expectedTopBook: 'ibnmajah' },
  { query: 'لا يؤمن أحدكم حتى يحب لأخيه', expectedTopBook: 'bukhari' },
  { query: 'كلمتان خفيفتان', expectedTopBook: 'bukhari' },
];

const rankingResults = [];
for (const q of rankingQueries) {
  const t0 = performance.now();
  const res = await searchAcrossAllBooks(q.query, 10);
  const latency = performance.now() - t0;
  const top = res[0];
  const passed = top && top.book.id === q.expectedTopBook && (!q.expectedId || top.hadith.idInBook === q.expectedId);
  const item = {
    query: q.query,
    expectedBook: q.expectedTopBook,
    expectedId: q.expectedId,
    actualBook: top ? top.book.id : null,
    actualId: top ? top.hadith.idInBook : null,
    totalReturned: res.length,
    latencyMs: Number(latency.toFixed(2)),
    passed: !!passed,
  };
  rankingResults.push(item);
  if (!passed) {
    report.criticalBugsFound.push({
      category: 'RANKING_INVERSION',
      description: `Query "${q.query}" failed prioritization. Expected [${q.expectedTopBook}], got [${item.actualBook}] (hadith #${item.actualId}).`,
      details: item,
    });
  }
}
report.rankingCorrectnessTest = rankingResults;
console.log(`Ranking test complete. Pass: ${rankingResults.filter(r => r.passed).length}/${rankingResults.length}`);

// 2. CONCURRENCY STRESS TEST (Simultaneous Bursts)
console.log('\n--- TEST SUITE 2: Concurrency & Race Condition Stress ---');
const concurrencyLevels = [10, 50, 100, 200];
const concurrencyResults = [];

for (const level of concurrencyLevels) {
  const queries = [
    'النية', 'الوضوء', 'الصلاة', 'الزكاة', 'الصوم', 'الحج', 'الجهاد', 'العلم',
    'الفتن', 'الرقاق', 'التوبة', 'الذكر', 'الدعاء', 'الجنة', 'النار', 'بر الوالدين',
    'إنما الأعمال بالنيات', 'الطهور شطر الإيمان', 'كلمتان خفيفتان', 'لا يؤمن أحدكم'
  ];

  const t0 = performance.now();
  const promises = Array.from({ length: level }, (_, i) => {
    const q = queries[i % queries.length];
    return searchAcrossAllBooks(q, 10);
  });

  let errorCount = 0;
  let allResults = [];
  try {
    allResults = await Promise.all(promises);
  } catch (err) {
    errorCount++;
  }
  const totalDuration = performance.now() - t0;
  const avgPerQuery = totalDuration / level;

  concurrencyResults.push({
    concurrencyLevel: level,
    totalDurationMs: Number(totalDuration.toFixed(2)),
    avgLatencyPerQueryMs: Number(avgPerQuery.toFixed(2)),
    errors: errorCount,
    successRate: `${(((level - errorCount) / level) * 100).toFixed(1)}%`,
  });
}
report.concurrencyTest = concurrencyResults;
console.log('Concurrency test complete:', concurrencyResults);

// 3. BURST & MEMORY STABILITY TEST (1000 & 3000 Sequential Iterations)
console.log('\n--- TEST SUITE 3: Burst Load & Heap Memory Stability ---');
const testQueries = ['النية', 'الصلاة', 'الزكاة', 'بر الوالدين', 'العلم'];
const initialMem = process.memoryUsage();

const burstSnapshots = [];
const BURST_ROUNDS = [100, 500, 1000, 2000];
let currentTotal = 0;

for (const round of BURST_ROUNDS) {
  const count = round - currentTotal;
  const t0 = performance.now();
  for (let i = 0; i < count; i++) {
    const q = testQueries[i % testQueries.length];
    await searchAcrossAllBooks(q, 10);
  }
  const duration = performance.now() - t0;
  currentTotal = round;
  const memNow = process.memoryUsage();

  burstSnapshots.push({
    iterations: round,
    durationMs: Number(duration.toFixed(2)),
    avgLatencyMs: Number((duration / count).toFixed(3)),
    heapUsedMB: Number((memNow.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotalMB: Number((memNow.heapTotal / 1024 / 1024).toFixed(2)),
    rssMB: Number((memNow.rss / 1024 / 1024).toFixed(2)),
  });
}

report.burstMemoryTest = {
  initialHeapMB: Number((initialMem.heapUsed / 1024 / 1024).toFixed(2)),
  snapshots: burstSnapshots,
  finalHeapDeltaMB: Number(((process.memoryUsage().heapUsed - initialMem.heapUsed) / 1024 / 1024).toFixed(2)),
};
console.log('Burst & Memory test complete:', burstSnapshots);

// 4. BOUNDARY & MALFORMED INPUT RESILIENCE
console.log('\n--- TEST SUITE 4: Boundary & Malformed Inputs ---');
const boundaryInputs = [
  { name: 'Null-like strings', input: 'null' },
  { name: 'Undefined-like strings', input: 'undefined' },
  { name: 'Object prototype pollution keys', input: '__proto__' },
  { name: 'Constructor token', input: 'constructor' },
  { name: 'Zero-width joiner & non-joiner', input: '\u200C\u200D\uFEFF' },
  { name: 'Mixed Unicode emojis & Arabic', input: '🕌 الصلاة 📖' },
  { name: 'Long repeated word (1000 tokens)', input: 'الله '.repeat(500) },
  { name: 'Special regex characters', input: '.*+?^${}()|[]\\' },
  { name: 'Negative numbers', input: '-10' },
  { name: 'Max 32-bit int', input: '2147483647' },
  { name: 'Float number', input: '3.14159' },
  { name: 'Right-to-Left Override character (U+202E)', input: '\u202Eحديث' },
];

const boundaryResults = [];
for (const item of boundaryInputs) {
  const t0 = performance.now();
  let status = 'PASS';
  let returnedCount = 0;
  let errMsg = null;
  try {
    const res = await searchAcrossAllBooks(item.input, 10);
    returnedCount = res.length;
  } catch (e) {
    status = 'FAIL';
    errMsg = e.message;
  }
  const latency = performance.now() - t0;
  boundaryResults.push({
    test: item.name,
    input: item.input.slice(0, 30),
    status,
    returnedCount,
    latencyMs: Number(latency.toFixed(2)),
    error: errMsg,
  });
}
report.boundaryStressTest = boundaryResults;
console.log('Boundary resilience complete:', boundaryResults);

// Write results json
fs.writeFileSync(
  path.join(process.cwd(), '.agents/teamwork_preview_challenger_e2e_2/stress_telemetry.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n✅ Stress testing run complete. Telemetry saved to stress_telemetry.json');
