import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Hadith Authenticity Verification, Sunan Gradings & Sharh Test Suite...\n');

let passedTests = 0;
function check(condition, message) {
  assert(condition, `FAILED: ${message}`);
  console.log(`  ✓ PASS: ${message}`);
  passedTests++;
}

async function runTests() {
  // 1. Verify Fake Hadiths Dataset
  const fakeHadithsPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'fake_hadiths.json');
  check(fs.existsSync(fakeHadithsPath), 'public/data/hadith/fake_hadiths.json exists');

  const fakeHadiths = JSON.parse(fs.readFileSync(fakeHadithsPath, 'utf-8'));
  check(Array.isArray(fakeHadiths) && fakeHadiths.length >= 25, `Contains >= 25 authoritative fake hadiths (found: ${fakeHadiths.length})`);

  for (const item of fakeHadiths) {
    assert(typeof item.id === 'number', `Item ${item.id} has number id`);
    assert(typeof item.title === 'string' && item.title.length > 3, `Item ${item.id} has title`);
    assert(typeof item.fakeText === 'string' && item.fakeText.length > 3, `Item ${item.id} has fakeText`);
    assert(typeof item.degree === 'string' && item.degree.length > 2, `Item ${item.id} has degree`);
    assert(typeof item.scholarRuling === 'string' && item.scholarRuling.length > 10, `Item ${item.id} has scholarRuling`);
    assert(typeof item.source === 'string', `Item ${item.id} has source`);
  }
  check(true, 'All fake hadiths validated with complete schema and scholarly rulings');

  // 2. Verify Sunan Grade Maps
  const gradesDir = path.join(process.cwd(), 'public', 'data', 'hadith', 'grades');
  check(fs.existsSync(gradesDir), 'public/data/hadith/grades exists');

  const sunanFiles = [
    { name: 'tirmidhi.json', minCount: 3800 },
    { name: 'abudawud.json', minCount: 4800 },
    { name: 'nasai.json', minCount: 5000 },
    { name: 'ibnmajah.json', minCount: 3900 },
  ];

  for (const sf of sunanFiles) {
    const fPath = path.join(gradesDir, sf.name);
    check(fs.existsSync(fPath), `Grade map ${sf.name} exists`);
    const data = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
    const count = Object.keys(data).length;
    check(count >= sf.minCount, `${sf.name} contains >= ${sf.minCount} verified hadiths (found: ${count})`);
  }

  // 3. Test Hadith Grade Engine
  const { getHadithGrade, loadSunanGrades } = await import('../src/lib/hadith-grade-engine.ts');

  const bukhariGrade = getHadithGrade('bukhari', 1);
  check(bukhariGrade.grade === 'صحيح', 'Bukhari #1 is graded Sahih');

  const muslimGrade = getHadithGrade('muslim', 1);
  check(muslimGrade.grade === 'صحيح', 'Muslim #1 is graded Sahih');

  // Load Sunan grade map
  await loadSunanGrades('tirmidhi');
  const tirmidhi1 = getHadithGrade('tirmidhi', 1);
  check(tirmidhi1.grade === 'صحيح' && tirmidhi1.rawGrade?.includes('Sahih'), 'Tirmidhi #1 correctly mapped from Darussalam/Albani grade map');

  const tirmidhi3 = getHadithGrade('tirmidhi', 3);
  check(tirmidhi3.grade === 'حسن' && tirmidhi3.rawGrade?.includes('Hasan'), 'Tirmidhi #3 correctly mapped as Hasan');

  // 4. Test Fake Hadith Engine
  const {
    loadFakeHadiths: loadEngineFakes,
    searchFakeHadiths,
    checkHadithAuthenticity,
    FAKE_HADITH_CATEGORIES,
  } = await import('../src/lib/fake-hadith-engine.ts');

  check(Array.isArray(FAKE_HADITH_CATEGORIES) && FAKE_HADITH_CATEGORIES.length >= 6, 'FAKE_HADITH_CATEGORIES has >= 6 categories');

  const engineCatalog = await loadEngineFakes();
  check(engineCatalog.length >= 25, 'loadFakeHadiths() loaded successfully');

  const fastingFakes = searchFakeHadiths(engineCatalog, '', 'fasting_ramadan');
  check(fastingFakes.length >= 4, 'fasting_ramadan filter returns >= 4 items');

  const searchRes = searchFakeHadiths(engineCatalog, 'صوموا', 'all');
  check(searchRes.length >= 1 && searchRes[0].fakeText.includes('صوموا تصحوا'), 'Search for "صوموا" returns "صوموا تصحوا"');

  // Live authenticity verification
  const checkFast = await checkHadithAuthenticity('صوموا تصحوا');
  check(checkFast.status === 'fake' && checkFast.matchedFake?.degree === 'ضعيف', 'checkHadithAuthenticity correctly flags "صوموا تصحوا" as ضعيف');

  const checkRajab = await checkHadithAuthenticity('رجب شهر الله وشعبان شهري');
  check(checkRajab.status === 'fake' && checkRajab.matchedFake?.degree?.includes('موضوع'), 'checkHadithAuthenticity correctly flags fabricated Rajab hadith');

  // 5. Test HadeethEnc Sharh URL Endpoint
  const { hadithSharhUrl, hadithBookTocUrl, hadithBookIndexUrl } = await import('../src/lib/data-base.ts');
  const sharhEndpoint = hadithSharhUrl();
  check(
    sharhEndpoint.includes('data/hadith/sharh/hadeethenc_sharh.json'),
    'hadithSharhUrl points to the verified HadeethEnc explanations dataset on noor-platform-hadith'
  );
  check(
    hadithBookTocUrl('bukhari').includes('data/hadith/books/bukhari/toc.json'),
    'hadithBookTocUrl resolves to clean TOC endpoint'
  );
  check(
    hadithBookIndexUrl('bukhari').includes('data/hadith/books/bukhari/index.json'),
    'hadithBookIndexUrl resolves to clean index endpoint'
  );

  // 6. Test Book Shards Loading & Core Search
  const { loadHadithBook, searchAcrossAllBooks } = await import('../src/lib/hadith-engine.ts');

  const nawawiBook = await loadHadithBook('nawawi40.json');
  check(nawawiBook && nawawiBook.hadiths.length === 42, 'Nawawi 40 loaded with 42 hadiths');

  const searchHits = await searchAcrossAllBooks('النيات');
  check(searchHits.length >= 1, 'searchAcrossAllBooks finds hadiths for "النيات"');

  const fastingHits = await searchAcrossAllBooks('صيام');
  check(fastingHits.length >= 1, 'searchAcrossAllBooks finds hadiths for "صيام"');

  console.log(`\n📊 Summary: ${passedTests}/${passedTests} Hadith Verification & Shards tests passed (100% SUCCESS)\n`);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
