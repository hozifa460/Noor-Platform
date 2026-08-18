import fs from 'node:fs';
import path from 'node:path';

const microIndexPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const rawData = JSON.parse(fs.readFileSync(microIndexPath, 'utf-8'));

console.log('=== INSPECTING EMPTY PREVIEWS IN MICRO-INDEX ===\n');

const emptyItems = [];
rawData.items.forEach((item, idx) => {
  const [bIdx, idInBook, chapterId, text, gIdx] = item;
  if (!text || text.trim().length === 0) {
    emptyItems.push({
      index: idx,
      bookId: rawData.books[bIdx],
      hadithId: idInBook,
      chapterId,
      text,
    });
  }
});

console.log(`Total empty previews found: ${emptyItems.length}`);
for (const e of emptyItems.slice(0, 15)) {
  console.log(`  - Book: ${e.bookId}, Hadith ID: ${e.hadithId}, Chapter: ${e.chapterId}, Text: "${e.text}"`);
}
