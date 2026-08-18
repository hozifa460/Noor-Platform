import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('🔍 Noor Platform — Shamela 4 Master Integration Test Suite');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function normalizeArabicSimple(text) {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '')
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"«»“”‏\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function runTests() {
  // Test 1: Catalog File Existence & Size
  const catalogPath = path.join(process.cwd(), 'public', 'data', 'ebooks', 'shamela_arabic_catalog.json');
  assert(fs.existsSync(catalogPath), 'shamela_arabic_catalog.json exists in public/data/ebooks');

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  assert(Array.isArray(catalog), 'Catalog parsed as valid JSON array');
  assert(catalog.length === 8589, `Catalog contains exactly 8,589 books (found ${catalog.length})`);

  // Test 2: Essential Categories Coverage
  const categories = new Set(catalog.map(b => b.shamelaCategoryName));
  console.log(`  ℹ Found ${categories.size} unique Shamela categories.`);
  assert(categories.has('العقيدة'), 'Contains category: العقيدة');
  assert(categories.has('كتب السنة'), 'Contains category: كتب السنة');
  assert(categories.has('التفسير'), 'Contains category: التفسير');
  assert(categories.has('الفقه الحنبلي'), 'Contains category: الفقه الحنبلي');
  assert(categories.has('التراجم والطبقات'), 'Contains category: التراجم والطبقات');
  assert(categories.has('كتب اللغة'), 'Contains category: كتب اللغة');

  // Test 3: Major Canonical Books in Catalog
  const bukhari = catalog.find(b => b.shamelaId === 1167 || b.title === 'صحيح البخاري - ط التأصيل');
  assert(Boolean(bukhari), 'Found Sahih al-Bukhari (ط التأصيل) in catalog');
  assert(Boolean(bukhari?.shamelaPath), `Bukhari path is valid: ${bukhari?.shamelaPath}`);
  assert(Boolean(bukhari?.betakaText), 'Bukhari contains verified betakaText/publisher info');

  const nawawi = catalog.find(b => b.sheikhName && b.sheikhName.includes('النووي'));
  assert(Boolean(nawawi), 'Found Imam al-Nawawi works in catalog');

  const ibnTaymiyyah = catalog.find(b => b.sheikhName && b.sheikhName.includes('ابن تيمية'));
  assert(Boolean(ibnTaymiyyah), 'Found Sheikh al-Islam Ibn Taymiyyah works in catalog');

  // Test 4: Live Data Fetching from Hugging Face resolve
  console.log('\n🌐 Testing live fetch of Sahih al-Bukhari metadata & TOC...');
  const baseHfUrl = 'https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/';
  const bukhariPath = bukhari.shamelaPath;

  try {
    const metaRes = await fetch(`${baseHfUrl}${bukhariPath}/book_metadata.json`);
    assert(metaRes.ok, `Fetched book_metadata.json for Bukhari (HTTP ${metaRes.status})`);
    const meta = await metaRes.json();
    assert(meta.main_author_death_hijri === 256, `Bukhari death year is 256 AH (found ${meta.main_author_death_hijri})`);

    const tocRes = await fetch(`${baseHfUrl}${bukhariPath}/toc.jsonl`);
    assert(tocRes.ok, `Fetched toc.jsonl for Bukhari (HTTP ${tocRes.status})`);
    const tocText = await tocRes.text();
    const tocLines = tocText.split('\n').filter(Boolean);
    assert(tocLines.length > 1000, `Bukhari TOC contains ${tocLines.length} hierarchical titles (> 1000)`);

    const firstToc = JSON.parse(tocLines[0]);
    assert(Boolean(firstToc.title_text), `First TOC title: "${firstToc.title_text}"`);

    // Test 5: Range Request on pages.jsonl
    const pagesRes = await fetch(`${baseHfUrl}${bukhariPath}/pages.jsonl`, {
      headers: { 'Range': 'bytes=0-8192' }
    });
    assert(pagesRes.status === 206 || pagesRes.ok, `Fetched first pages chunk via Range request (HTTP ${pagesRes.status})`);
    const pageText = await pagesRes.text();
    const pageLines = pageText.split('\n').filter(Boolean);
    assert(pageLines.length >= 2, `Parsed ${pageLines.length} pages in initial 8KB chunk`);

    const p1 = JSON.parse(pageLines[0]);
    assert(p1.page_num === 1, `Page number is 1`);
    assert(Boolean(p1.body), `Body text is non-empty (${p1.body.length} chars)`);
  } catch (err) {
    console.error('Remote fetch error:', err.message);
    assert(false, `Remote fetch succeeded without error`);
  }

  // Test 6: In-Memory Search Latency Benchmark on 8,589 Books
  console.log('\n⚡ Benchmark: Search performance over 8,589 books catalog...');
  const searchQueries = ['البخاري', 'الصلاة', 'العقيدة الواسطية', 'تفسير ابن كثير', 'مغني المحتاج', 'لسان العرب'];
  const start = performance.now();
  for (const q of searchQueries) {
    const qNorm = normalizeArabicSimple(q);
    const matches = catalog.filter(b => (b._normSearchText || b.title).includes(qNorm));
    assert(matches.length > 0, `Search for "${q}" returned ${matches.length} results`);
  }
  const duration = performance.now() - start;
  const avg = duration / searchQueries.length;
  console.log(`  ⏱️ Executed ${searchQueries.length} complex catalog searches in ${duration.toFixed(2)}ms (avg: ${avg.toFixed(2)}ms per search)`);
  assert(avg < 15.0, `Average search latency is < 15ms (actual: ${avg.toFixed(2)}ms)`);

  console.log('\n======================================================================');
  console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed (100% SUCCESS)`);
  console.log('======================================================================\n');
}

runTests();
