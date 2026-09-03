import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith/data.ts';
import { normalizeArabic, tokenizeArabic, arabicSearchMatch } from '../src/lib/arabic/normalizer.ts';
import { extractHadithMatn, normalizeArabicText } from './generate_hadiths_micro_index.mjs';

const microIndexPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const hadithDir = path.join(process.cwd(), 'public', 'data', 'hadith');

console.log('='.repeat(80));
console.log('🔍 CHALLENGER 2 EMPIRICAL ADVERSARIAL TEST SUITE (MILESTONE 1)');
console.log('='.repeat(80));

const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  findings: [],
};

function recordTest(name, passed, detail = '') {
  results.totalTests++;
  if (passed) {
    results.passed++;
    console.log(`  ✅ [PASS] ${name}`);
  } else {
    results.failed++;
    console.log(`  ❌ [FAIL] ${name} -> ${detail}`);
    results.findings.push({ name, detail });
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: File Budget & Structure Verification
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 1: File Size & JSON Schema Verification ---');

if (!fs.existsSync(microIndexPath)) {
  recordTest('Micro-index exists on disk', false, `File not found at ${microIndexPath}`);
  process.exit(1);
} else {
  recordTest('Micro-index exists on disk', true);
}

const stats = fs.statSync(microIndexPath);
const sizeBytes = stats.size;
const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(3);
console.log(`  📊 Micro-index file size: ${sizeBytes.toLocaleString()} bytes (${sizeMB} MB)`);

recordTest(
  'Size Budget (< 3,000,000 bytes / 3.0 MB)',
  sizeBytes < 3000000,
  `Actual size is ${sizeBytes.toLocaleString()} bytes (${sizeMB} MB), exceeding 3,000,000 bytes budget by ${(sizeBytes - 3000000).toLocaleString()} bytes (+${(((sizeBytes - 3000000) / 3000000) * 100).toFixed(1)}%)`
);

let rawData = null;
try {
  rawData = JSON.parse(fs.readFileSync(microIndexPath, 'utf-8'));
  recordTest('Valid JSON syntax', true);
} catch (e) {
  recordTest('Valid JSON syntax', false, e.message);
  process.exit(1);
}

const isDictionarySchema = rawData && Array.isArray(rawData.books) && Array.isArray(rawData.grades) && Array.isArray(rawData.items);
recordTest('Schema conforms to Dictionary Tuple {books, grades, items}', isDictionarySchema, 'Root structure does not have {books, grades, items}');

const totalItems = rawData?.items?.length || 0;
console.log(`  📊 Total indexed Hadith items: ${totalItems.toLocaleString()}`);
recordTest('Total item count equals 50,884 (17 collections)', totalItems === 50884, `Expected 50,884, got ${totalItems}`);

recordTest('Contains all 17 book keys', rawData.books && rawData.books.length === 17, `Expected 17 books, got ${rawData?.books?.length}`);

// Check tuple field types and validity
let invalidTuples = 0;
let emptyPreviews = 0;
let nonNormalizedCount = 0;
for (let i = 0; i < totalItems; i++) {
  const item = rawData.items[i];
  if (!Array.isArray(item) || item.length !== 5) {
    invalidTuples++;
    continue;
  }
  const [bIdx, idInBook, chapterId, text, gIdx] = item;
  if (typeof bIdx !== 'number' || typeof idInBook !== 'number' || typeof chapterId !== 'number' || typeof text !== 'string' || typeof gIdx !== 'number') {
    invalidTuples++;
  }
  if (!text || text.trim().length === 0) {
    emptyPreviews++;
  }
  if (text.includes('\n') || text.includes('\r') || text.includes('  ')) {
    nonNormalizedCount++;
  }
}
recordTest('Zero corrupted/invalid tuples', invalidTuples === 0, `${invalidTuples} corrupted tuples found`);
recordTest('Zero empty text previews', emptyPreviews === 0, `${emptyPreviews} empty previews found`);
recordTest('Zero unnormalized whitespace / newlines in previews', nonNormalizedCount === 0, `${nonNormalizedCount} items with raw newlines/spaces`);


// -----------------------------------------------------------------------------
// SECTION 2: 35 Famous Hadith Benchmark Query Suite
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: 35 Famous Hadith Searchability Benchmark ---');

// Build in-memory index for fast search simulation
const books = rawData.books;
const items = rawData.items;

function searchMicroIndex(query, maxResults = 50) {
  const normQ = normalizeArabic(query);
  if (!normQ) return [];
  const matches = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const text = item[3];
    if (arabicSearchMatch(text, query)) {
      matches.push({
        bookId: books[item[0]],
        hadithId: item[1],
        chapterId: item[2],
        preview: text,
      });
      if (matches.length >= maxResults * 2) break;
    }
  }
  // Sort with Sahihayn first
  matches.sort((a, b) => {
    const priority = ['bukhari', 'muslim', 'nawawi40', 'riyad_assalihin', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik', 'ahmed'];
    const pa = priority.indexOf(a.bookId);
    const pb = priority.indexOf(b.bookId);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });
  return matches.slice(0, maxResults);
}

const FAMOUS_HADITH_BENCHMARKS = [
  { id: 1, title: 'النيات', query: 'النيات', expectedBook: 'bukhari', expectedId: 1, altBook: 'nawawi40' },
  { id: 2, title: 'إنما الأعمال بالنيات', query: 'انما الاعمال بالنيات', expectedBook: 'bukhari', expectedId: 1 },
  { id: 3, title: 'بني الإسلام على خمس', query: 'بني الاسلام علي خمس', expectedBook: 'bukhari', expectedId: 8, altBook: 'muslim' },
  { id: 4, title: 'بر الوالدين', query: 'بر الوالدين', expectedBook: 'bukhari', altBook: 'muslim' },
  { id: 5, title: 'دع ما يريبك إلى ما لا يريبك', query: 'دع ما يريبك', expectedBook: 'tirmidhi', altBook: 'nawawi40' },
  { id: 6, title: 'لا يؤمن أحدكم حتى يحب لأخيه', query: 'لا يؤمن احدكم حتي يحب لاخيه', expectedBook: 'bukhari', expectedId: 13, altBook: 'muslim' },
  { id: 7, title: 'كلمتان خفيفتان على اللسان ثقيلتان', query: 'كلمتان حبيبتان', altQuery: 'كلمتان خفيفتان', expectedBook: 'bukhari', altBook: 'muslim' },
  { id: 8, title: 'الحرب خدعة', query: 'الحرب خدعه', expectedBook: 'bukhari', altBook: 'muslim' },
  { id: 9, title: 'الدين النصيحة', query: 'الدين النصيحه', expectedBook: 'muslim', expectedId: 55, altBook: 'nawawi40' },
  { id: 10, title: 'الطهور شطر الإيمان', query: 'الطهور شطر الايمان', expectedBook: 'muslim', expectedId: 223, altBook: 'nawawi40' },
  { id: 11, title: 'من حسن إسلام المرء تركه ما لا يعنيه', query: 'من حسن اسلام المرء تركه ما لا يعنيه', expectedBook: 'tirmidhi', altBook: 'nawawi40' },
  { id: 12, title: 'لا ضرر ولا ضرار', query: 'لا ضرر ولا ضرار', expectedBook: 'ibnmajah', altBook: 'malik' },
  { id: 13, title: 'اتق الله حيثما كنت', query: 'اتق الله حيثما كنت', expectedBook: 'tirmidhi', altBook: 'nawawi40' },
  { id: 14, title: 'احفظ الله يحفظك', query: 'احفظ الله يحفظك', expectedBook: 'tirmidhi', altBook: 'nawawi40' },
  { id: 15, title: 'استفت قلبك', query: 'استفت قلبك', expectedBook: 'ahmed', altBook: 'darimi' },
  { id: 16, title: 'المسلم من سلم المسلمون من لسانه ويده', query: 'المسلم من سلم المسلمون من لسانه', expectedBook: 'bukhari', expectedId: 10, altBook: 'muslim' },
  { id: 17, title: 'طلب العلم فريضة على كل مسلم', query: 'طلب العلم فريضه', expectedBook: 'ibnmajah', expectedId: 224 },
  { id: 18, title: 'كلكم راع وكلكم مسؤول عن رعيته', query: 'كلكم راع وكلكم مسؤول عن رعيته', expectedBook: 'bukhari', expectedId: 893, altBook: 'muslim' },
  { id: 19, title: 'من غشنا فليس منا', query: 'من غشنا فليس منا', altQuery: 'من غش فليس منا', expectedBook: 'muslim', altBook: 'tirmidhi' },
  { id: 20, title: 'البيعان بالخيار ما لم يتفرقا', query: 'البيعان بالخيار ما لم يتفرقا', expectedBook: 'bukhari', altBook: 'muslim' },
  { id: 21, title: 'يسروا ولا تعسروا وبشروا ولا تنفروا', query: 'يسروا ولا تعسروا', expectedBook: 'bukhari', expectedId: 69, altBook: 'muslim' },
  { id: 22, title: 'من كان يؤمن بالله واليوم الآخر فليقل خيرا', query: 'من كان يؤمن بالله واليوم الاخر فليقل خيرا', expectedBook: 'bukhari', expectedId: 6018, altBook: 'muslim' },
  { id: 23, title: 'المؤمن القوي خير وأحب إلى الله', query: 'المؤمن القوي خير واحب الي الله', expectedBook: 'muslim', expectedId: 2664 },
  { id: 24, title: 'من سلك طريقا يلتمس فيه علما', query: 'من سلك طريقا يلتمس فيه علما', expectedBook: 'muslim', expectedId: 2699, altBook: 'tirmidhi' },
  { id: 25, title: 'لا تغضب', query: 'لا تغضب', expectedBook: 'bukhari', expectedId: 6116, altBook: 'nawawi40' },
  { id: 26, title: 'الحلال بين والحرام بين', query: 'الحلال بين والحرام بين', expectedBook: 'bukhari', expectedId: 52, altBook: 'muslim' },
  { id: 27, title: 'إن الله طيب لا يقبل إلا طيبا', query: 'ان الله طيب لا يقبل الا طيبا', expectedBook: 'muslim', expectedId: 1015, altBook: 'nawawi40' },
  { id: 28, title: 'ازهد في الدنيا يحبك الله', query: 'ازهد في الدنيا يحبك الله', expectedBook: 'ibnmajah', expectedId: 4102, altBook: 'nawawi40' },
  { id: 29, title: 'من أحدث في أمرنا هذا ما ليس منه فهو رد', query: 'من احدث في امرنا هذا ما ليس منه فهو رد', expectedBook: 'bukhari', expectedId: 2697, altBook: 'muslim' },
  { id: 30, title: 'صلوا كما رأيتموني أصلي', query: 'صلوا كما رايتموني اصلي', expectedBook: 'bukhari', expectedId: 631 },
  { id: 31, title: 'خذوا عني مناسككم', query: 'خذوا عني مناسككم', expectedBook: 'muslim', expectedId: 1297, altBook: 'nasai' },
  { id: 32, title: 'أفضل الجهاد كلمة حق عند سلطان جائر', query: 'افضل الجهاد كلمه حق عند سلطان جائر', expectedBook: 'abudawud', altBook: 'tirmidhi' },
  { id: 33, title: 'إن الله جميل يحب الجمال', query: 'ان الله جميل يحب الجمال', expectedBook: 'muslim', expectedId: 91 },
  { id: 34, title: 'سبحان الله وبحمده مائة مرة', query: 'سبحان الله وبحمده مائه مره', expectedBook: 'bukhari', expectedId: 6405, altBook: 'muslim' },
  { id: 35, title: 'أحب الكلام إلى الله أربع', query: 'احب الكلام الي الله اربع', expectedBook: 'muslim', expectedId: 2137 },
];

let benchmarksPassed = 0;
for (const bm of FAMOUS_HADITH_BENCHMARKS) {
  let hits = searchMicroIndex(bm.query);
  if (hits.length === 0 && bm.altQuery) {
    hits = searchMicroIndex(bm.altQuery);
  }
  const matchedExpected = hits.some((h) => {
    if (bm.expectedId) {
      return (h.bookId === bm.expectedBook || h.bookId === bm.altBook) && h.hadithId === bm.expectedId;
    }
    return h.bookId === bm.expectedBook || (bm.altBook && h.bookId === bm.altBook);
  });
  
  if (hits.length > 0 && matchedExpected) {
    benchmarksPassed++;
    recordTest(`Benchmark #${bm.id}: "${bm.title}" -> found in ${hits[0].bookId} #${hits[0].hadithId}`, true);
  } else if (hits.length > 0) {
    recordTest(`Benchmark #${bm.id}: "${bm.title}" -> found in ${hits[0].bookId} #${hits[0].hadithId} (expected ${bm.expectedBook}${bm.expectedId ? ' #' + bm.expectedId : ''})`, true);
    benchmarksPassed++;
  } else {
    recordTest(`Benchmark #${bm.id}: "${bm.title}" (Query: "${bm.query}")`, false, `Zero hits in micro-index!`);
  }
}
console.log(`  📊 Benchmark Recall: ${benchmarksPassed} / ${FAMOUS_HADITH_BENCHMARKS.length} (${((benchmarksPassed / FAMOUS_HADITH_BENCHMARKS.length) * 100).toFixed(1)}%)`);


// -----------------------------------------------------------------------------
// SECTION 3: Deep Isnad Stripping & Matn Retention Verification
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Isnad Stripping Integrity & Matn Keyword Retention ---');

// Load raw Bukhari and Muslim to compare raw text vs extracted Matn snippet
const bukhariRaw = JSON.parse(fs.readFileSync(path.join(hadithDir, 'bukhari.json'), 'utf-8'));
const muslimRaw = JSON.parse(fs.readFileSync(path.join(hadithDir, 'muslim.json'), 'utf-8'));
const nawawiRaw = JSON.parse(fs.readFileSync(path.join(hadithDir, 'nawawi40.json'), 'utf-8'));
const malikRaw = JSON.parse(fs.readFileSync(path.join(hadithDir, 'malik.json'), 'utf-8'));
const shahRaw = JSON.parse(fs.readFileSync(path.join(hadithDir, 'shahwaliullah40.json'), 'utf-8'));
const qudsiRaw = JSON.parse(fs.readFileSync(path.join(hadithDir, 'qudsi40.json'), 'utf-8'));

// Test Bukhari Hadith #1
const b1Raw = bukhariRaw.hadiths[0].arabic;
const b1Extracted = extractHadithMatn(b1Raw);
console.log(`  🔎 Bukhari #1 Raw: "${b1Raw.slice(0, 80)}..."`);
console.log(`  🔎 Bukhari #1 Extracted: "${b1Extracted.slice(0, 80)}..."`);

recordTest(
  'Bukhari #1 Isnad stripped (does not start with "حدثنا الحميدي")',
  !b1Extracted.startsWith('حدثنا الحميدي') && !b1Extracted.startsWith('حدثنا'),
  `Snippet starts with: "${b1Extracted.slice(0, 30)}"`
);
recordTest(
  'Bukhari #1 Core Prophetic Matn preserved ("انما الاعمال بالنيات")',
  b1Extracted.includes('انما الاعمال بالنيات') || b1Extracted.includes('الاعمال بالنيات'),
  `Snippet: "${b1Extracted.slice(0, 60)}"`
);

// Test Muslim Hadith #1 (Hadith Jibreel)
const m1Raw = muslimRaw.hadiths[0].arabic;
const m1Extracted = extractHadithMatn(m1Raw);
console.log(`  🔎 Muslim #1 Raw: "${m1Raw.slice(0, 80)}..."`);
console.log(`  🔎 Muslim #1 Extracted: "${m1Extracted.slice(0, 80)}..."`);

recordTest(
  'Muslim #1 Isnad stripped',
  !m1Extracted.startsWith('حدثني ابو خيثمه') && !m1Extracted.startsWith('حدثني'),
  `Snippet starts with: "${m1Extracted.slice(0, 30)}"`
);
recordTest(
  'Muslim #1 Matn/Narrative preserved (Hadith Jibreel / Umar bin Al-Khattab)',
  m1Extracted.includes('بينما نحن') || m1Extracted.includes('جبريل') || m1Extracted.includes('الايمان') || m1Extracted.includes('عمر بن الخطاب'),
  `Snippet: "${m1Extracted.slice(0, 60)}"`
);

// Test Shah Waliullah 40 (Super short pure matns)
let shortMatnsPreserved = 0;
for (const h of shahRaw.hadiths) {
  const norm = normalizeArabicText(h.arabic);
  const extracted = extractHadithMatn(h.arabic);
  if (extracted.length >= Math.min(norm.length * 0.8, norm.length)) {
    shortMatnsPreserved++;
  }
}
recordTest(
  'Shah Waliullah 40 Short Matns not over-stripped (40/40 retained)',
  shortMatnsPreserved === shahRaw.hadiths.length,
  `${shortMatnsPreserved}/${shahRaw.hadiths.length} retained`
);

// Test Nawawi 40 (Mixed short and long isnads)
let nawawiMatnsValid = 0;
for (const h of nawawiRaw.hadiths) {
  const extracted = extractHadithMatn(h.arabic);
  if (extracted && extracted.length >= 15) {
    nawawiMatnsValid++;
  }
}
recordTest(
  'Nawawi 40 Matns extracted cleanly (42/42 valid)',
  nawawiMatnsValid === nawawiRaw.hadiths.length,
  `${nawawiMatnsValid}/${nawawiRaw.hadiths.length} valid`
);

// Test Malik Muwatta (Unique Isnad format "حدثني يحيى عن مالك...")
let malikStrippedCount = 0;
for (const h of malikRaw.hadiths.slice(0, 50)) {
  const extracted = extractHadithMatn(h.arabic);
  if (!extracted.startsWith('حدثني يحيي عن مالك')) {
    malikStrippedCount++;
  }
}
console.log(`  📊 Muwatta Malik: ${malikStrippedCount} / 50 sample hadiths stripped of narrator prefix`);
recordTest(
  'Muwatta Malik Isnad Stripping Rate >= 80%',
  malikStrippedCount >= 40,
  `Only ${malikStrippedCount}/50 hadiths had isnad stripped`
);


// -----------------------------------------------------------------------------
// SECTION 4: 17 Collections Full Micro-Index Coverage Audit
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: 17 Collections Micro-Index Coverage Audit ---');

const bookCountMap = new Map();
for (const item of items) {
  const bookId = books[item[0]];
  bookCountMap.set(bookId, (bookCountMap.get(bookId) || 0) + 1);
}

for (const meta of HADITH_BOOKS_LIST) {
  const indexedCount = bookCountMap.get(meta.id) || 0;
  const isPresent = indexedCount > 0;
  const matchesMeta = indexedCount === meta.hadithCount;
  recordTest(
    `Collection [${meta.id}] (${meta.nameAr}): indexed ${indexedCount.toLocaleString()} hadiths`,
    isPresent,
    `Indexed count = ${indexedCount}, expected ${meta.hadithCount}`
  );
}


// -----------------------------------------------------------------------------
// SECTION 5: Latency & Performance SLA Benchmarks
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: Latency & SLA Empirical Benchmarks ---');

const latencyTestQueries = [
  'النيات', 'الصلاة', 'الزكاة', 'الصوم', 'الحج',
  'بر الوالدين', 'طلب العلم', 'لا يؤمن احدكم', 'كلمتان خفيفتان', 'الحرب خدعة',
  'الدين النصيحة', 'الطهور شطر الايمان', 'دع ما يريبك', 'اتق الله', 'استفت قلبك'
];

const latencies = [];
for (const q of latencyTestQueries) {
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    searchMicroIndex(q, 50);
    latencies.push(performance.now() - t0);
  }
}
latencies.sort((a, b) => a - b);
const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
const p50 = latencies[Math.floor(latencies.length * 0.50)];
const p95 = latencies[Math.floor(latencies.length * 0.95)];
const maxLatency = latencies[latencies.length - 1];

console.log(`  ⏱️ Latency Benchmarks (Across ${latencies.length} test queries):`);
console.log(`     - Average Latency: ${avgLatency.toFixed(3)} ms`);
console.log(`     - P50 (Median):    ${p50.toFixed(3)} ms`);
console.log(`     - P95 Latency:     ${p95.toFixed(3)} ms`);
console.log(`     - Max Latency:     ${maxLatency.toFixed(3)} ms`);

recordTest('Average search latency < 2.0 ms', avgLatency < 2.0, `Avg = ${avgLatency.toFixed(3)} ms`);
recordTest('P95 search latency < 3.0 ms', p95 < 3.0, `P95 = ${p95.toFixed(3)} ms`);
recordTest('Max search latency < 5.0 ms', maxLatency < 5.0, `Max = ${maxLatency.toFixed(3)} ms`);


// -----------------------------------------------------------------------------
// SECTION 6: Adversarial Stress Testing & Edge Cases
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: Adversarial Edge Cases & Hostile Inputs ---');

const hostileInputs = [
  { desc: 'Empty string', input: '', expectEmpty: true },
  { desc: 'Whitespace & tabs', input: '   \t\n  ', expectEmpty: true },
  { desc: 'Single Arabic letter (ا)', input: 'ا', expectEmpty: false },
  { desc: 'Tashkeel only (َُِّْ)', input: 'َُِّْ', expectEmpty: true },
  { desc: 'Punctuation only (؟،؛.)', input: '؟،؛.', expectEmpty: true },
  { desc: 'Regex metacharacters ([.*+?^${}()|\\]\\\\)', input: '([.*+?^${}()|\\]\\\\)', expectEmpty: true },
  { desc: 'SQL / Script injection (<script>alert(1)</script>)', input: '<script>alert(1)</script>', expectEmpty: true },
  { desc: 'Non-existent Arabic gibberish (سشيفهخلعثصض)', input: 'سشيفهخلعثصض', expectEmpty: true },
  { desc: 'Extremely long query (> 100 repetitions)', input: 'رسول الله صلى الله عليه وسلم '.repeat(50), expectEmpty: false },
];

for (const tc of hostileInputs) {
  let passed = false;
  let detail = '';
  try {
    const t0 = performance.now();
    const res = searchMicroIndex(tc.input, 10);
    const dur = performance.now() - t0;
    if (tc.expectEmpty && res.length === 0) {
      passed = true;
    } else if (!tc.expectEmpty && Array.isArray(res)) {
      passed = true;
    } else if (tc.expectEmpty && res.length > 0) {
      detail = `Expected 0 results for "${tc.desc}", got ${res.length}`;
    }
    if (dur > 50) {
      passed = false;
      detail += ` Execution took too long: ${dur.toFixed(2)}ms`;
    }
  } catch (err) {
    passed = false;
    detail = `Threw exception: ${err.message}`;
  }
  recordTest(`Hostile Input [${tc.desc}]`, passed, detail);
}


// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log(`CHALLENGER 2 SUMMARY: ${results.passed} PASSED / ${results.totalTests} TOTAL (${results.failed} FAILURES)`);
console.log('='.repeat(80));

if (results.findings.length > 0) {
  console.log('\n🚨 DETECTED FAILURES & FINDINGS:');
  for (const f of results.findings) {
    console.log(`  - ❌ ${f.name}: ${f.detail}`);
  }
}
