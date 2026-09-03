import fs from 'fs';
import { useBooksStore, BOOK_CATEGORIES, BOOK_LANGUAGES } from '../src/stores/books-store.ts';
import { arabicSearchMatch, arabicSearchScore } from '../src/lib/arabic/normalizer.ts';

async function runBooksIntegrationTests() {
  console.log('📚 Starting Deluxe Islamic Books Library Tests...\n');
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

  // 1. Initial State & Quranic Mus-hafs & Core Books
  console.log('--- Test Suite 1: Quranic Recitations & Mus-hafs ---');
  const store = useBooksStore.getState();
  const initialBooks = store.books;
  assert(initialBooks.length >= 18, `Store initializes with ${initialBooks.length} Quranic Mus-hafs and books`);

  const warsh = initialBooks.find((b) => b.id === 'quran-warsh');
  assert(Boolean(warsh), 'Contains Warsh an Nafea Mus-haf');
  assert(warsh?.pdfUrl?.includes('quran_warsh.pdf'), 'Valid PDF URL for Warsh');

  const qaloon = initialBooks.find((b) => b.id === 'quran-qaloon');
  assert(Boolean(qaloon), 'Contains Qaloon an Nafea Mus-haf');

  const bukhari = initialBooks.find((b) => b.id === 'book-sahih-bukhari');
  assert(Boolean(bukhari), 'Contains Sahih al-Bukhari');

  // 2. Categories & Languages
  console.log('\n--- Test Suite 2: Categories and Multi-Language Setup ---');
  assert(BOOK_CATEGORIES.length >= 8, `Configured ${BOOK_CATEGORIES.length} library categories`);
  assert(BOOK_LANGUAGES.length >= 10, `Configured ${BOOK_LANGUAGES.length} global languages`);

  // 3. Search & Normalization on Books
  console.log('\n--- Test Suite 3: Arabic Search & Filter Engine on Books ---');
  store.setSearchQuery('ورش');
  const warshResults = store.getFilteredBooks();
  assert(warshResults.length > 0 && warshResults.some((b) => b.title.includes('ورش')), 'Finds Warsh Mus-haf by search');

  store.setSearchQuery('حفص');
  const hafsResults = store.getFilteredBooks();
  assert(hafsResults.length > 0 && hafsResults.some((b) => b.title.includes('حفص')), 'Finds Hafs Mus-haf by search');

  store.setSearchQuery('قالون');
  const qaloonResults = store.getFilteredBooks();
  assert(qaloonResults.length > 0 && qaloonResults.some((b) => b.title.includes('قالون')), 'Finds Qaloon Mus-haf by search');

  store.setSearchQuery('');
  store.setSelectedCategory('quran');
  const quranCategory = store.getFilteredBooks();
  assert(quranCategory.length >= 18, `Filters to ${quranCategory.length} Quran Mus-hafs`);

  store.setSelectedCategory('all');
  const allBooks = store.getFilteredBooks();
  assert(allBooks.length >= 18, 'Resets filters cleanly');

  // 4. Search Latency Benchmark across 100 Rapid Queries
  console.log('\n--- Test Suite 4: Search Latency SLA Benchmark ---');
  const testQueries = ['البخاري', 'ورش', 'التوحيد', 'الفقه', 'النووي', 'السيرة', 'تفسير', 'عقيدة', 'المدينة', 'أصول'];
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) {
    store.setSearchQuery(testQueries[i % testQueries.length]);
    store.getFilteredBooks();
  }
  const totalMs = performance.now() - t0;
  const avgMs = totalMs / 100;
  console.log(`  📊 100 rapid searches took ${totalMs.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms/query)`);
  assert(totalMs < 50.0, `100 searches completed in < 50ms (actual: ${totalMs.toFixed(2)}ms)`);

  // 5. On-Demand Language & Category Partitioning Tests
  console.log('\n--- Test Suite 5: On-Demand Language & Category Partitioning ---');
  assert(typeof useBooksStore.getState().loadLanguageBooks === 'function', 'loadLanguageBooks function exists');
  assert(typeof useBooksStore.getState().loadCategoryBooks === 'function', 'loadCategoryBooks function exists');
  useBooksStore.getState().setSelectedLanguage('en');
  assert(useBooksStore.getState().selectedLanguage === 'en', 'Selected language set to English');
  useBooksStore.getState().setSelectedLanguage('all');
  assert(useBooksStore.getState().selectedLanguage === 'all', 'Selected language reset to all');
  useBooksStore.getState().setSelectedCategory('shamela');
  assert(useBooksStore.getState().selectedCategory === 'shamela', 'Selected category set to shamela');
  useBooksStore.getState().setSelectedCategory('all');
  assert(useBooksStore.getState().selectedCategory === 'all', 'Selected category reset to all');

  // 6. Shamela 4 & Classical Heritage Datasets Verification
  console.log('\n--- Test Suite 6: Shamela 4 & Classical Datasets ---');
  const shamelaCatalogPath = fs.existsSync('./public/data/ebooks/shamela_arabic_catalog.json')
    ? './public/data/ebooks/shamela_arabic_catalog.json'
    : './public/data/ebooks/catalog.json';
  assert(fs.existsSync(shamelaCatalogPath), 'Compiled books catalog JSON exists on disk');
  if (fs.existsSync(shamelaCatalogPath)) {
    const data = JSON.parse(fs.readFileSync(shamelaCatalogPath, 'utf8'));
    assert(data.length > 0, `Catalog contains valid verified books (count: ${data.length})`);
    const verified = data.find((b) => b.title.includes('البخاري') || b.title.includes('الطحاوية') || b.title.includes('النووية'));
    assert(Boolean(verified), 'Catalog contains verified authentic classical Islamic works');
  }

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runBooksIntegrationTests().catch((err) => {
  console.error('Books integration test failed:', err);
  process.exit(1);
});
