import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic, arabicSearchScore } from '../../src/lib/arabic-normalizer.ts';

const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
const invertedPath = path.join(outputDir, 'hadiths_inverted_index.json');
const microPath = path.join(outputDir, 'hadiths_micro_index.json');

function benchmarkSearchEngine() {
  if (!fs.existsSync(invertedPath) || !fs.existsSync(microPath)) {
    console.log('Files not found');
    return;
  }

  const invertedMap = JSON.parse(fs.readFileSync(invertedPath, 'utf8'));
  const microIndex = JSON.parse(fs.readFileSync(microPath, 'utf8'));

  console.log(`Inverted Index stems: ${Object.keys(invertedMap).length}`);
  console.log(`Micro Index items: ${microIndex.length}`);

  const testQueries = [
    'النيات',
    'الوضوء',
    'بر الوالدين',
    'الصلاة',
    'الحياء من الايمان',
    'الجهاد في سبيل الله',
    'صيام رمضان',
    'بني الاسلام علي خمس'
  ];

  console.log('\n--- Benchmarking Inverted Index Fast Query Execution ---');

  for (const query of testQueries) {
    const start = performance.now();
    const tokens = tokenizeArabic(query);
    
    // Find candidate lists
    let candidates = null;
    for (const t of tokens) {
      const posting = invertedMap[t] || [];
      if (candidates === null) {
        candidates = new Set(posting.map(p => `${p[0]}_${p[1]}`));
      } else {
        const nextSet = new Set(posting.map(p => `${p[0]}_${p[1]}`));
        const intersected = new Set();
        for (const item of candidates) {
          if (nextSet.has(item)) intersected.add(item);
        }
        candidates = intersected;
      }
    }

    const elapsed = (performance.now() - start).toFixed(3);
    const count = candidates ? candidates.size : 0;
    console.log(`Query "${query.padEnd(20)}" -> ${String(count).padStart(4)} candidates found in ${elapsed.padStart(6)} ms`);
  }
}

benchmarkSearchEngine();
