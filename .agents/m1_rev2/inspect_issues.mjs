import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabicText, extractHadithMatn } from '../../scripts/generate_hadiths_micro_index.mjs';

const indexPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

console.log('=== INVESTIGATING EMPTY SNIPPETS & RESIDUALS ===\n');

// 1. Inspect Empty Snippets
const emptyItems = [];
indexData.items.forEach((it, idx) => {
  if (!it[3] || it[3].trim().length === 0) {
    emptyItems.push({ idx, book: indexData.books[it[0]], hadithId: it[1], chapterId: it[2], snippet: it[3] });
  }
});

console.log(`Found ${emptyItems.length} empty snippets in micro-index.`);
console.log('First 10 empty items:', emptyItems.slice(0, 10));

// 2. Test Why Bukhari #26, #28 Had Residuals
const bPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'bukhari.json');
if (fs.existsSync(bPath)) {
  const bukhari = JSON.parse(fs.readFileSync(bPath, 'utf-8'));
  
  for (const hId of [26, 28, 2, 6, 11]) {
    const h = bukhari.hadiths.find(x => x.idInBook === hId);
    if (h) {
      console.log(`\n--- Bukhari #${hId} ---`);
      console.log('Raw:', h.arabic.slice(0, 120));
      const norm = normalizeArabicText(h.arabic);
      console.log('Norm:', norm.slice(0, 120));
      const matn = extractHadithMatn(h.arabic);
      console.log('Extracted Matn:', matn.slice(0, 120));
    }
  }
}

// 3. Inspect Raw Hadiths that produced empty snippets
for (const item of emptyItems.slice(0, 5)) {
  const bookP = path.join(process.cwd(), 'public', 'data', 'hadith', `${item.book}.json`);
  if (fs.existsSync(bookP)) {
    const bData = JSON.parse(fs.readFileSync(bookP, 'utf-8'));
    const h = bData.hadiths.find(x => x.idInBook === item.hadithId);
    if (h) {
      console.log(`\n--- Empty Snippet Analysis: ${item.book} #${item.hadithId} ---`);
      console.log('Raw Arabic:', JSON.stringify(h.arabic));
      console.log('Normalized:', JSON.stringify(normalizeArabicText(h.arabic)));
      console.log('Extracted Matn:', JSON.stringify(extractHadithMatn(h.arabic)));
    }
  }
}
