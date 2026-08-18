import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic, arabicSearchMatch } from '../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function checkWalidayn() {
  const booksToCheck = ['bukhari', 'aladab_almufrad', 'muslim', 'riyad_assalihin'];
  for (const bId of booksToCheck) {
    const meta = HADITH_BOOKS_LIST.find(b => b.id === bId);
    const res = await fetch(`${HF_SUNNAH_BASE}/All_hadith_books/${meta.fileName}`);
    const data = await res.json();
    const matches = data.hadiths.filter(h => {
      const norm = normalizeArabic(h.arabic);
      return arabicSearchMatch(norm, 'بر الوالدين') || norm.includes('الوالدين') || norm.includes('والديه');
    });
    console.log(`${meta.nameAr} (${bId}): found ${matches.length} matches for parents/والدين`);
    if (matches.length > 0) {
      console.log('  Sample:', matches[0].arabic.slice(0, 150));
    }
  }
}

checkWalidayn().catch(console.error);
