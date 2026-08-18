import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../src/lib/arabic-normalizer.ts';

const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
const microPath = path.join(outputDir, 'hadiths_micro_index.json');

console.log('Building Inverted Stem Index from Micro-Index...');

if (fs.existsSync(microPath)) {
  const items = JSON.parse(fs.readFileSync(microPath, 'utf-8'));
  const invertedMap = {};

  const stopWords = new Set([
    'قال', 'حدثنا', 'اخبرنا', 'عن', 'رسول', 'الله', 'صلى', 'عليه', 'وسلم',
    'رضي', 'عنه', 'قالت', 'سمعت', 'ان', 'في', 'من', 'ما', 'لا', 'الى', 'على',
    'هو', 'هي', 'ثم', 'او', 'كان', 'كانت', 'كل', 'ذلك', 'به', 'له', 'بها'
  ]);

  for (const item of items) {
    const tokens = tokenizeArabic(item.t);
    const bookIdx = HADITH_BOOKS_LIST.findIndex((b) => b.id === item.b);

    for (const t of tokens) {
      if (t.length < 3 || stopWords.has(t)) continue;
      if (!invertedMap[t]) invertedMap[t] = [];

      // Add [bookIndex, hadithNumber, chapterId]
      invertedMap[t].push([bookIdx, item.i, item.c]);
    }
  }

  const invertedPath = path.join(outputDir, 'hadiths_inverted_index.json');
  const content = JSON.stringify(invertedMap);
  fs.writeFileSync(invertedPath, content, 'utf-8');

  const sizeMB = (Buffer.byteLength(content, 'utf-8') / (1024 * 1024)).toFixed(2);
  console.log(`✅ Inverted Index created: ${invertedPath} (${sizeMB} MB, ${Object.keys(invertedMap).length} unique stems)`);
}
