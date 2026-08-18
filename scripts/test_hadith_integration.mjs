import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith-data.ts';
import {
  loadHadithBook,
  loadHadeethEncSharh,
  findHadithSharh,
  searchHadithsInBook,
  searchAcrossAllBooks,
} from '../src/lib/hadith-engine.ts';
import { getHadithGrade } from '../src/lib/hadith-grade-engine.ts';

console.log('\n📜 Starting Hadith Encyclopedia (Sunnah Hub) Full Suite Tests...\n');

let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

function skip(name, reason) {
  console.log(`  ⏭️ SKIP: ${name} — ${reason}`);
  skippedTests++;
}

// Helper: check if a hadith JSON file exists locally
function hadithFileExists(fileName) {
  const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', fileName);
  return fs.existsSync(localPath);
}

// Suite 1: Hadith Books Metadata
console.log('--- Test Suite 1: Hadith Collections Catalog ---');

await test('Catalog contains exactly 17 Hadith collections', () => {
  assert.equal(HADITH_BOOKS_LIST.length, 17);
});

await test('Sahih al-Bukhari is the primary collection with 7277 hadiths', () => {
  const bukhari = HADITH_BOOKS_LIST.find((b) => b.id === 'bukhari');
  assert.ok(bukhari);
  assert.equal(bukhari.hadithCount, 7277);
  assert.equal(bukhari.category, 'sahih');
});

await test('Sahih Muslim exists in catalog', () => {
  const muslim = HADITH_BOOKS_LIST.find((b) => b.id === 'muslim');
  assert.ok(muslim);
  assert.equal(muslim.category, 'sahih');
});

await test('Contains Sunan collections (Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Darimi)', () => {
  const sunan = HADITH_BOOKS_LIST.filter((b) => b.category === 'sunan');
  assert.equal(sunan.length, 5);
});

await test('Contains Forties (Nawawi 40, Qudsi 40, Shah Waliullah 40)', () => {
  const forties = HADITH_BOOKS_LIST.filter((b) => b.category === 'forties');
  assert.equal(forties.length, 3);
});

// Suite 2: Book Fetching & Structure
console.log('\n--- Test Suite 2: Book Fetching & Structure ---');

await test('Loads Nawawi 40 collection', async () => {
  const data = await loadHadithBook('nawawi40.json');
  assert.ok(data, 'Failed to fetch nawawi40.json');
  assert.ok(data.hadiths.length >= 40, 'Expected at least 40 hadiths');
  assert.ok(data.hadiths[0].arabic.includes('بِالنِّيَّاتِ') || data.hadiths[0].arabic.includes('النيات'), 'Hadith 1 should be the intention hadith');
});

if (hadithFileExists('bukhari.json')) {
  await test('Loads Sahih al-Bukhari structure and chapters', async () => {
    const data = await loadHadithBook('bukhari.json');
    assert.ok(data, 'Failed to fetch bukhari.json');
    assert.ok(data.chapters.length >= 90, 'Expected at least 90 chapters');
    assert.ok(data.hadiths.length >= 7000, 'Expected over 7,000 hadiths');
    assert.equal(data.metadata.arabic.title, 'صحيح البخاري');
  });
} else {
  skip('Loads Sahih al-Bukhari structure and chapters', 'bukhari.json not available locally (CI)');
}

// Suite 3: HadeethEnc Sharh & Explanations Dataset
console.log('\n--- Test Suite 3: HadeethEnc Sharh & Benefits Dataset ---');

await test('Loads HadeethEnc Sharh dataset', async () => {
  const sharhList = await loadHadeethEncSharh();
  assert.ok(Array.isArray(sharhList));
  if (hadithFileExists('hadeethenc_sharh.json')) {
    // Full dataset available — enforce strict count
    assert.ok(sharhList.length >= 3500, `Expected >= 3500 items in full dataset, got ${sharhList.length}`);
  } else {
    // CI/seed fallback — just ensure non-empty
    assert.ok(sharhList.length > 0, `Expected non-empty sharh dataset, got ${sharhList.length}`);
  }
});

await test('Matches explanation for famous Hadith (إنما الأعمال بالنيات)', async () => {
  const hadithText = 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى الله ورسوله';
  const sharh = await findHadithSharh(hadithText);
  assert.ok(sharh, 'Failed to match Sharh for intentions hadith');
  assert.ok(sharh.grade.includes('صحيح'), 'Grade should be Sahih');
  assert.ok(sharh.explanation.length > 50, 'Explanation should be descriptive');
});

// Suite 4: Morphological In-Book Search Engine
console.log('\n--- Test Suite 4: Morphological Hadith Search Engine ---');

await test('Finds intention hadiths in Nawawi 40 by keyword "النيات"', async () => {
  const data = await loadHadithBook('nawawi40.json');
  const results = searchHadithsInBook(data.hadiths, 'النيات');
  assert.ok(results.length >= 1);
  assert.ok(results[0].arabic.includes('بِالنِّيَّاتِ') || results[0].arabic.includes('النيات'));
});

await test('Finds Hadith by number query "1"', async () => {
  const data = await loadHadithBook('nawawi40.json');
  const results = searchHadithsInBook(data.hadiths, '1');
  assert.ok(results.length >= 1);
  assert.equal(results[0].idInBook, 1);
});

if (hadithFileExists('bukhari.json')) {
  await test('Filters hadiths by chapterId', async () => {
    const data = await loadHadithBook('bukhari.json');
    const results = searchHadithsInBook(data.hadiths, '', 1);
    assert.ok(results.length >= 1);
    assert.ok(results.every((h) => h.chapterId === 1));
  });
} else {
  skip('Filters hadiths by chapterId', 'bukhari.json not available locally (CI)');
}

// Suite 5: Global Cross-Book Search Engine
console.log('\n--- Test Suite 5: Global Cross-Book Sunnah Search ---');

if (hadithFileExists('hadiths_micro_index.json')) {
  if (hadithFileExists('bukhari.json')) {
    await test('Searches across multiple Hadith books simultaneously', async () => {
      const results = await searchAcrossAllBooks('النيات', 10);
      assert.ok(results.length >= 2, 'Should find intention hadith in Bukhari and others');
      assert.ok(results.some((r) => r.book.id === 'bukhari'));
    });
  } else {
    await test('Searches across available Hadith books', async () => {
      const results = await searchAcrossAllBooks('النيات', 10);
      assert.ok(results.length >= 1, 'Should find intention hadith in at least one book');
    });
  }
} else {
  skip('Global cross-book search', 'hadiths_micro_index.json not available locally (CI)');
}

// Suite 6: Hadith Grade Authentication Engine
console.log('\n--- Test Suite 6: Hadith Grade Engine ---');

await test('Identifies Sahihayn hadiths as Sahih by consensus', () => {
  const bukhariGrade = getHadithGrade('bukhari', 1);
  assert.equal(bukhariGrade.grade, 'صحيح');
  assert.ok(bukhariGrade.scholar.includes('إجماع'));

  const muslimGrade = getHadithGrade('muslim', 1);
  assert.equal(muslimGrade.grade, 'صحيح');
});

await test('Parses explicit Hasan & Daif grades accurately', () => {
  const hasan = getHadithGrade('tirmidhi', 100, 'حديث حسن صحيح');
  assert.equal(hasan.grade, 'صحيح');

  const daif = getHadithGrade('tirmidhi', 200, 'حديث ضعيف الإسناد');
  assert.equal(daif.grade, 'ضعيف');
});

console.log('\n========================================');
console.log(`Total: ${passedTests + failedTests} | Passed: ${passedTests} | Failed: ${failedTests} | Skipped: ${skippedTests}`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
