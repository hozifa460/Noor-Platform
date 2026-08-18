import fs from 'node:fs';
import path from 'node:path';

const indexPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

console.log('--- Inspecting Empty Previews ---');
let emptyCount = 0;
for (let i = 0; i < index.items.length; i++) {
  const item = index.items[i];
  const preview = item[3];
  if (!preview || preview.trim().length === 0) {
    emptyCount++;
    if (emptyCount <= 10) {
      console.log(`Empty #${emptyCount} at idx ${i}: Book=${index.books[item[0]]} (bIdx=${item[0]}), hadithId=${item[1]}, chapterId=${item[2]}`);
    }
  }
}
console.log('Total empty previews:', emptyCount);
