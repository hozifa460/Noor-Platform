import { loadHadithMicroIndex, searchAcrossAllBooks } from '../../src/lib/hadith-engine.ts';

async function testBirr() {
  const micro = await loadHadithMicroIndex();
  console.log('Total micro items loaded:', micro.length);

  // Search for walidayn in all items
  const matches = micro.filter(m => m.t.includes('والدين') || m.t.includes('بر'));
  console.log(`Found ${matches.length} items containing 'والدين' or 'بر' in snippet`);
  for (const m of matches.slice(0, 10)) {
    console.log(`  [${m.b} #${m.i}] snippet: "${m.t}"`);
  }

  const res = await searchAcrossAllBooks('بر الوالدين', 10);
  console.log(`\nsearchAcrossAllBooks('بر الوالدين') returned ${res.length} results:`);
  for (const r of res) {
    console.log(`  [${r.book.id} #${r.hadith.idInBook}] "${r.hadith.arabic}"`);
  }
}

testBirr().catch(console.error);
