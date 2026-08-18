import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

async function sampleBooks() {
  for (const book of HADITH_BOOKS_LIST) {
    console.log(`\n========================================\n=== Book: ${book.nameAr} (${book.fileName}) [Total: ${book.hadithCount}] ===\n========================================`);
    try {
      const res = await fetch(`${HF_SUNNAH_BASE}/${book.fileName}`);
      const data = await res.json();
      const samples = [0, 1, Math.min(10, data.hadiths.length - 1)];
      for (const idx of samples) {
        if (data.hadiths[idx]) {
          const h = data.hadiths[idx];
          console.log(`\n--- Hadith #${h.idInBook} ---`);
          console.log(h.arabic);
        }
      }
    } catch (e) {
      console.error('Error fetching', book.fileName, e.message);
    }
  }
}
sampleBooks();
