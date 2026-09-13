import { HADITH_BOOKS_LIST, loadHadithBook } from '../src/features/hadith/index.ts';

async function checkAllRawEmpty() {
  console.log('=== CHECKING EMPTY ARABIC IN RAW COLLECTIONS ===\n');
  for (const b of HADITH_BOOKS_LIST) {
    const book = await loadHadithBook(b.fileName);
    if (!book) {
      console.log(`Could not load ${b.fileName}`);
      continue;
    }
    const emptyCount = book.hadiths.filter(h => !h.arabic || h.arabic.trim().length === 0).length;
    console.log(`[${b.id.padEnd(22)}]: ${emptyCount} empty raw arabic hadiths (out of ${book.hadiths.length})`);
  }
}

checkAllRawEmpty().catch(console.error);
