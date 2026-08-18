import { loadHadithBook } from '../src/lib/hadith-engine.ts';
import { extractHadithMatn, normalizeArabicText } from './generate_hadiths_micro_index.mjs';

async function testMalik() {
  const malik = await loadHadithBook('malik.json');
  if (!malik) {
    console.log('Could not load malik.json');
    return;
  }

  const ids = [35, 237, 239, 332, 386, 445, 449, 464, 596];
  for (const id of ids) {
    const h = malik.hadiths.find(x => x.idInBook === id);
    if (!h) continue;
    console.log(`\nMalik H#${id}:`);
    console.log(`  Raw arabic: "${h.arabic}"`);
    console.log(`  Normalized: "${normalizeArabicText(h.arabic)}"`);
    console.log(`  Extracted:  "${extractHadithMatn(h.arabic)}"`);
  }
}

testMalik().catch(console.error);
