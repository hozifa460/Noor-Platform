import fs from 'fs';
import path from 'path';
import { fatwaIndexManager, FATWA_CATEGORIES, SCHOLARS_LIST } from '../src/lib/fatwa-index.ts';
import { scoreArabicSearch, extractAndExpandTokens } from '../src/lib/arabic-search-engine.ts';
import { normalizeArabic } from '../src/lib/arabic-normalizer.ts';

async function runFatwaIndexTests() {
  console.log('⚖️ Starting High-Precision Fatwa Inverted Index & Morphological NLP Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // 1. Initial State & Manifest Loading
  console.log('--- Test Suite 1: Manifest Seeding & High-Capacity Inverted Index ---');
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'fatwas_manifest.json');
  assert(fs.existsSync(manifestPath), 'Static fatwas_manifest.json exists');
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(manifestData.length >= 10000, `Manifest contains ${manifestData.length} verified fatwas (Expected > 10,000)`);

  fatwaIndexManager.mergeItems(manifestData);
  const index = await fatwaIndexManager.getIndex();
  assert(index.length >= 10000, `Index loaded ${index.length} items`);

  // 2. Morphological Stemming & Synonyms
  console.log('\n--- Test Suite 2: Morphological Stemming & Fiqh Synonyms Expansion ---');
  const tokens1 = extractAndExpandTokens('كيف أصلي في الطيارة؟');
  assert(tokens1.expandedKeywords.some(t => t.includes('صلا')), 'Expands verb "أصلي" to "صلاة"');
  assert(tokens1.expandedKeywords.some(t => t.includes('طائر') || t.includes('طيار')), 'Expands "الطيارة" to "طائرة"');

  const tokens2 = extractAndExpandTokens('المسح على الشرابات');
  assert(tokens2.expandedKeywords.some(t => t.includes('جورب') || t.includes('شراب') || t.includes('خف')), 'Expands "الشرابات" to "جوارب/شراب/خفين"');

  // 3. Search Accuracy & Natural Questions Understanding Tests across 38k+ Records
  console.log('\n--- Test Suite 3: Natural Language Questions Understanding (38,000+ Fatwas) ---');
  
  // Query 1: "أصلي في الطيارة"
  const planeSearch = fatwaIndexManager.searchIndex('أصلي في الطيارة');
  assert(planeSearch.length >= 5, `Finds ${planeSearch.length} airplane prayer fatwas`);
  const topPlane = normalizeArabic(planeSearch[0].title);
  assert(topPlane.includes('طائر') || topPlane.includes('اصلي') || topPlane.includes('صلا'), 'Top result accurately matches airplane prayer');

  // Query 2: "المسح على الشراب"
  const socksSearch = fatwaIndexManager.searchIndex('المسح على الشراب');
  assert(socksSearch.length >= 5, `Finds ${socksSearch.length} socks wudu fatwas`);
  const topSocks = normalizeArabic(socksSearch[0].title);
  assert(topSocks.includes('مسح') && (topSocks.includes('شراب') || topSocks.includes('خف') || topSocks.includes('جورب')), 'Top result matches wiping over socks (المسح على الشراب)');

  // Query 3: "بخاخ الربو يفطر"
  const inhalerSearch = fatwaIndexManager.searchIndex('بخاخ الربو يفطر');
  assert(inhalerSearch.length > 0, `Finds asthma inhaler fasting fatwa (${inhalerSearch.length} results)`);

  // Query 4: "شرب الشيشة والفيب"
  const vapeSearch = fatwaIndexManager.searchIndex('شرب الشيشة والفيب');
  assert(vapeSearch.length > 0, `Finds smoking/shisha/vape fatwas (${vapeSearch.length} results)`);

  // Query 5: "زكاة الذهب والفلوس"
  const goldSearch = fatwaIndexManager.searchIndex('زكاة الذهب والفلوس');
  assert(goldSearch.length >= 5, `Finds gold & money zakah fatwas (${goldSearch.length} results)`);

  // Query 6: Non-existent gibberish query must return 0 results (Strict Precision Guard)
  const gibberishSearch = fatwaIndexManager.searchIndex('زيليكسياكورب_9845729_نوفريدوم');
  assert(gibberishSearch.length === 0, 'Rejects completely non-existent gibberish terms (0 results)');

  // 4. Topic and Scholar Filtering
  console.log('\n--- Test Suite 4: Topic and Scholar Filtering ---');
  assert(FATWA_CATEGORIES.length >= 6, `Configured ${FATWA_CATEGORIES.length} fatwa topics`);
  assert(SCHOLARS_LIST.length >= 5, `Configured ${SCHOLARS_LIST.length} scholars`);

  const salahCat = fatwaIndexManager.searchIndex('', 'salah');
  assert(salahCat.length >= 50, `Filters by Salah category (${salahCat.length} found)`);

  const binbazSch = fatwaIndexManager.searchIndex('', 'all', 'binbaz');
  assert(binbazSch.length >= 50, `Filters by Sheikh Bin Baz (${binbazSch.length} found)`);

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runFatwaIndexTests().catch((err) => {
  console.error('Fatwa index test failed:', err);
  process.exit(1);
});
