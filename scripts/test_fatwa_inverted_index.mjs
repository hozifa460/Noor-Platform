import { fatwaIndexManager, SCHOLARS_LIST } from '../src/lib/fatwa/index-data.ts';
import { extractAndExpandTokens } from '../src/lib/arabic/search-engine.ts';
import { microShardEngine } from '../src/lib/micro-shard-engine.ts';
import { BUILTIN_SEED_FATWAS } from '../src/lib/fatwa/seed-fatwas.ts';

async function runFatwaIndexTests() {
  console.log('⚖️ Starting High-Precision Fatwa Engine & Scholar Filter Tests...\n');
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

  // 1. Micro-Shard Engine & Built-in Seeds
  console.log('--- Test Suite 1: Micro Shard Engine & Instant Seeds ---');
  assert(BUILTIN_SEED_FATWAS.length > 0, `Builtin seed fatwas registered (${BUILTIN_SEED_FATWAS.length} items)`);
  const showcase = await microShardEngine.getShowcase();
  assert(showcase.length > 0, `Showcase returns ${showcase.length} initial fatwas`);

  // 2. Scholar Filter & ID Mapping Tests
  console.log('\n--- Test Suite 2: Scholar ID to Arabic Name Mapping ---');
  const binbazScholar = SCHOLARS_LIST.find(s => s.id === 'binbaz');
  assert(binbazScholar && binbazScholar.query === 'باز', 'Maps binbaz ID to "باز" query');
  const othaymeenScholar = SCHOLARS_LIST.find(s => s.id === 'othaymeen');
  assert(othaymeenScholar && othaymeenScholar.query === 'عثيمين', 'Maps othaymeen ID to "عثيمين" query');

  const binbazResults = await microShardEngine.search('صلاة', 'all', 'binbaz', 20);
  assert(Array.isArray(binbazResults) && binbazResults.length > 0, `Search with scholar filter returns valid matching fatwas (${binbazResults.length} found)`);

  // 3. Morphological Stemming & Fiqh Synonyms
  console.log('\n--- Test Suite 3: Morphological Stemming & Fiqh Synonyms ---');
  const tokens1 = extractAndExpandTokens('كيف أصلي في الطيارة؟');
  assert(tokens1.expandedKeywords.some(t => t.includes('صلا')), 'Expands verb "أصلي" to "صلاة"');
  assert(tokens1.expandedKeywords.some(t => t.includes('طائر') || t.includes('طيار')), 'Expands "الطيارة" to "طائرة"');

  const tokens2 = extractAndExpandTokens('المسح على الشرابات');
  assert(tokens2.expandedKeywords.some(t => t.includes('جورب') || t.includes('شراب') || t.includes('خف')), 'Expands "الشرابات" to "جوارب/شراب/خفين"');

  // 4. In-Memory Search Engine
  console.log('\n--- Test Suite 4: In-Memory Search & Category Filtering ---');
  fatwaIndexManager.mergeItems(BUILTIN_SEED_FATWAS);
  assert(fatwaIndexManager.rawList.length > 0, `In-memory manager contains ${fatwaIndexManager.rawList.length} items`);

  const searchSalah = fatwaIndexManager.searchIndex('صلاة');
  assert(searchSalah.length > 0, `Finds prayer fatwas in seed list (${searchSalah.length} results)`);

  console.log('\n========================================');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFatwaIndexTests().catch(e => {
  console.error('Fatwa index test error:', e);
  process.exit(1);
});
