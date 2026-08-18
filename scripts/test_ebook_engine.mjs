import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

/**
 * Noor Platform E-Book Engine Verification & Benchmark Suite
 */

const EBOOKS_DIR = path.join(process.cwd(), 'public', 'data', 'ebooks');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    failedTests++;
    errors.push(message);
    console.log(`  ❌ FAIL: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  }
}

function assertLessOrEqual(val, max, message) {
  assert(val <= max, `${message} (expected <= ${max}, got ${val})`);
}

async function runEBookTestSuite() {
  console.log('\n======================================================================');
  console.log('🧪 Starting Noor Islamic E-Book Shard Engine Verification Suite');
  console.log('======================================================================\n');

  // -------------------------------------------------------------
  // Test Group 1: Catalog Integrity
  // -------------------------------------------------------------
  console.log('▶ Group 1: Master Catalog & Metadata Integrity');
  const catalogPath = path.join(EBOOKS_DIR, 'catalog.json');
  assert(fs.existsSync(catalogPath), 'catalog.json exists on disk');

  const catalogContent = fs.readFileSync(catalogPath, 'utf-8');
  const catalog = JSON.parse(catalogContent);
  assert(Array.isArray(catalog), 'catalog.json contains an array');
  assert(catalog.length >= 5, `catalog contains at least 5 books (found: ${catalog.length})`);

  for (const book of catalog) {
    assert(book.id && typeof book.id === 'string', `[${book.id}] has valid id string`);
    assert(book.title && book.title.length > 3, `[${book.id}] has valid title: ${book.title}`);
    assert(book.author && book.author.length > 3, `[${book.id}] has valid author: ${book.author}`);
    assert(book.totalChapters >= 1, `[${book.id}] has totalChapters >= 1 (got: ${book.totalChapters})`);
    assert(book.totalPages >= 1, `[${book.id}] has totalPages >= 1 (got: ${book.totalPages})`);
    assert(book.category && typeof book.category === 'string', `[${book.id}] has category: ${book.category}`);
  }

  // -------------------------------------------------------------
  // Test Group 2: Shard Size Ceilings & TOC Depth
  // -------------------------------------------------------------
  console.log('\n▶ Group 2: Micro-Chunk Size Ceilings (< 35KB) & TOC Structure');
  for (const book of catalog) {
    const bookDir = path.join(EBOOKS_DIR, book.id);
    const metaPath = path.join(bookDir, 'meta.json');
    assert(fs.existsSync(metaPath), `[${book.id}] meta.json exists`);

    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    assert(metaData.toc && Array.isArray(metaData.toc), `[${book.id}] meta.json contains toc array`);
    assert(metaData.toc.length === book.totalChapters, `[${book.id}] TOC item count matches totalChapters`);

    for (let c = 1; c <= book.totalChapters; c++) {
      const chunkPath = path.join(bookDir, 'chunks', `chunk_${c}.json`);
      assert(fs.existsSync(chunkPath), `[${book.id}] chunk_${c}.json exists`);

      const stat = fs.statSync(chunkPath);
      assertLessOrEqual(stat.size, 35 * 1024, `[${book.id}] chunk_${c}.json size <= 35KB (${(stat.size / 1024).toFixed(1)} KB)`);

      const chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf-8'));
      assert(chunkData.chapterIndex === c, `[${book.id}] chunk_${c} index matches ${c}`);
      assert(chunkData.paragraphs.length > 0, `[${book.id}] chunk_${c} contains paragraphs (${chunkData.paragraphs.length})`);
      assert(chunkData.wordCount > 0, `[${book.id}] chunk_${c} wordCount > 0 (${chunkData.wordCount})`);
    }
  }

  // -------------------------------------------------------------
  // Test Group 3: In-Book Search Index Verification
  // -------------------------------------------------------------
  console.log('\n▶ Group 3: In-Book Search Index & Token Retrieval');
  for (const book of catalog) {
    const searchIndexPath = path.join(EBOOKS_DIR, book.id, 'search_index.json');
    assert(fs.existsSync(searchIndexPath), `[${book.id}] search_index.json exists`);

    const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'));
    const tokenCount = Object.keys(searchIndex).length;
    assert(tokenCount > 20, `[${book.id}] search index contains > 20 tokens (found: ${tokenCount})`);
  }

  // Target query validations
  const nawawiIndex = JSON.parse(fs.readFileSync(path.join(EBOOKS_DIR, 'arbaeen-nawawiyyah', 'search_index.json'), 'utf-8'));
  assert(nawawiIndex['النيات'] !== undefined, 'Arbaeen index contains "النيات"');
  assert(nawawiIndex['النيات'][0][0] === 1, 'Search for "النيات" resolves to Chapter 1');

  const tawhidIndex = JSON.parse(fs.readFileSync(path.join(EBOOKS_DIR, 'kitab-at-tawhid', 'search_index.json'), 'utf-8'));
  assert(tawhidIndex['التوحيد'] !== undefined, 'Kitab at-Tawhid index contains "التوحيد"');

  const waraqatIndex = JSON.parse(fs.readFileSync(path.join(EBOOKS_DIR, 'matn-al-waraqat', 'search_index.json'), 'utf-8'));
  assert(waraqatIndex['الاحكام'] !== undefined, 'Waraqat index contains "الاحكام"');

  // -------------------------------------------------------------
  // Test Group 4: Sub-Millisecond Search Latency SLA
  // -------------------------------------------------------------
  console.log('\n▶ Group 4: Search Latency SLA & Performance');
  const t0 = performance.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    const hits = nawawiIndex['النيات'] || [];
    if (hits.length === 0) throw new Error('Search failed');
  }
  const t1 = performance.now();
  const totalMs = t1 - t0;
  const avgMs = totalMs / iterations;

  assertLessOrEqual(totalMs, 25.0, `100 In-Book search iterations execute in < 25.0ms (actual: ${totalMs.toFixed(2)}ms, avg: ${avgMs.toFixed(4)}ms/query)`);

  // -------------------------------------------------------------
  // Test Group 5: OpenITI Classical Catalog & Islamic Arts Taxonomy
  // -------------------------------------------------------------
  console.log('\n▶ Group 5: OpenITI Heritage Catalog & Islamic Arts Taxonomy');
  const openItiCatalogPath = path.join(EBOOKS_DIR, 'openiti_arabic_catalog.json');
  assert(fs.existsSync(openItiCatalogPath), 'openiti_arabic_catalog.json exists on disk');

  const openItiContent = fs.readFileSync(openItiCatalogPath, 'utf-8');
  const openItiCatalog = JSON.parse(openItiContent);
  assert(Array.isArray(openItiCatalog), 'openiti_arabic_catalog.json contains an array');
  assert(openItiCatalog.length >= 11000, `openiti catalog has >= 11,000 books (found: ${openItiCatalog.length})`);

  const arts = new Set(openItiCatalog.map((b) => b.islamicArt).filter(Boolean));
  assert(arts.has('hadith'), 'catalog has Hadith collection books');
  assert(arts.has('fiqh'), 'catalog has Fiqh collection books');
  assert(arts.has('quran'), 'catalog has Quran & Tafsir collection books');
  assert(arts.has('history'), 'catalog has History & Seerah books');
  assert(arts.has('language'), 'catalog has Arabic Language & Poetry books');
  assert(arts.has('aqeedah'), 'catalog has Aqeedah books');
  assert(arts.has('raqaiq'), 'catalog has Raqaiq & Zuhd books');

  const sampleBook = openItiCatalog[0];
  assert(sampleBook.id && sampleBook.id.startsWith('openiti-'), 'first book has valid openiti-* ID');
  assert(sampleBook.century !== undefined && sampleBook.century >= 1, 'first book has valid Hijri century');
  assert(sampleBook.pdfUrl && sampleBook.pdfUrl.includes('OpenITI/'), 'first book has valid OpenITI raw URL');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('📊 Noor E-Book Shard Engine Test Summary');
  console.log('======================================================================');
  console.log(`  Total Test Points:   ${totalTests}`);
  console.log(`  Passed:              ${passedTests}`);
  console.log(`  Failed:              ${failedTests}`);

  if (failedTests > 0) {
    console.error('\n❌ FAILURES:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('\n🌟 ALL E-BOOK ENGINE TESTS PASSED (100% SUCCESS)\n');
  }
}

runEBookTestSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
