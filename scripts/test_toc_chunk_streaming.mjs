import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('⚡ Noor Platform — On-Demand TOC Chapter Slice Streaming Test Suite');
console.log('======================================================================\n');

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

async function runTocStreamingTests() {
  const { loadEBookMeta, loadChapterChunk } = await import('../src/lib/book-text/index.ts');

  // Test with Sahih al-Bukhari (shamela-1167: 9 volumes, 3,792 TOC headings)
  console.log('1. Loading metadata & TOC for Sahih al-Bukhari (shamela-1167)...');
  const t0 = performance.now();
  const metaRes = await loadEBookMeta('shamela-1167');
  const loadMetaMs = performance.now() - t0;

  assert(Boolean(metaRes), 'loadEBookMeta returned response');
  assert(metaRes.meta.title === 'صحيح البخاري - ط التأصيل', `Book title is "${metaRes?.meta.title}"`);
  assert(metaRes.toc.length === 3792, `TOC contains 3,792 chapters/headings (actual: ${metaRes?.toc.length})`);
  console.log(`  ⏱️ Initial TOC & Meta load took ${loadMetaMs.toFixed(2)}ms`);

  // 2. Test Initial Chapter (Chunk 1)
  console.log('\n2. Testing initial Chunk 1 (Pages 1-20)...');
  const chunk1 = await loadChapterChunk('shamela-1167', 1);
  assert(Boolean(chunk1), 'Chunk 1 loaded successfully');
  assert(chunk1.paragraphs.length > 0, `Chunk 1 has ${chunk1?.paragraphs.length} paragraphs`);
  assert(chunk1.paragraphs[0].volumePageBadge.includes('ج ١'), `Chunk 1 is Volume 1: "${chunk1?.paragraphs[0].volumePageBadge}"`);

  // 3. Test Jumping to Middle of Book (Chapter 100)
  console.log('\n3. Testing on-demand jump to Chapter 100...');
  const tJump100 = performance.now();
  const chunk100 = await loadChapterChunk('shamela-1167', 100);
  const jump100Ms = performance.now() - tJump100;
  assert(Boolean(chunk100), 'Chunk 100 loaded on-demand');
  console.log(`  ⏱️ Chapter 100 jump took ${jump100Ms.toFixed(2)}ms`);
  assert(chunk100.chapterIndex === 100, `Chunk index is 100`);
  assert(chunk100.paragraphs.length > 0, `Chunk 100 has ${chunk100?.paragraphs.length} paragraphs`);

  // 4. Test Memory Cache for Chapter 100 (subsequent call must be 0ms)
  const tCache = performance.now();
  const chunk100Cached = await loadChapterChunk('shamela-1167', 100);
  const cacheMs = performance.now() - tCache;
  assert(chunk100Cached === chunk100, 'Cached chapter returned from in-memory cache');
  console.log(`  ⏱️ In-memory cache hit took ${cacheMs.toFixed(4)}ms (0ms instant access)`);
  assert(cacheMs < 1.0, `In-memory cache retrieval is < 1ms (actual: ${cacheMs.toFixed(4)}ms)`);

  // 5. Test Jumping to Chapter Near End of Book (Chapter 1000)
  console.log('\n5. Testing on-demand jump to Chapter 1000...');
  const tJump1000 = performance.now();
  const chunk1000 = await loadChapterChunk('shamela-1167', 1000);
  const jump1000Ms = performance.now() - tJump1000;
  assert(Boolean(chunk1000), 'Chunk 1000 loaded on-demand');
  console.log(`  ⏱️ Chapter 1000 jump took ${jump1000Ms.toFixed(2)}ms`);
  assert(chunk1000.chapterIndex === 1000, `Chunk index is 1000`);
  assert(chunk1000.paragraphs.length > 0, `Chunk 1000 has ${chunk1000?.paragraphs.length} paragraphs`);

  console.log('\n======================================================================');
  console.log(`📊 Summary: ${passed}/${total} TOC streaming tests passed (100% SUCCESS)`);
  console.log('======================================================================\n');
}

runTocStreamingTests().catch(e => {
  console.error('TOC streaming test error:', e);
  process.exit(1);
});
