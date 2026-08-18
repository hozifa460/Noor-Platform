import fs from 'node:fs';
import { normalizeArabic, arabicSearchMatch } from '../../src/lib/arabic-normalizer.ts';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

const birrItems = data.filter(d => arabicSearchMatch(d.t, 'بر الوالدين'));
console.log('Total items matching بر الوالدين in 450 chars:', birrItems.length);
birrItems.slice(0, 5).forEach((item, i) => {
  console.log(`\n--- Item ${i} (${item.b} #${item.i}) ---`);
  console.log('Text:', item.t);
  const idx = item.t.indexOf('بر الوالدين');
  console.log('Position of "بر الوالدين":', idx);
});
