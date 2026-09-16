import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const surahsDir = path.join(rootDir, 'public', 'data', 'quran', 'surahs');
const outputIndexFile = path.join(rootDir, 'public', 'data', 'quran', 'quran_search_index.json');

console.log('Generating Quran search index...');

const indexItems = [];

for (let s = 1; s <= 114; s++) {
  const surahPath = path.join(surahsDir, `${s}.json`);
  if (!fs.existsSync(surahPath)) {
    console.error(`Missing surah file: ${surahPath}`);
    process.exit(1);
  }

  const surahData = JSON.parse(fs.readFileSync(surahPath, 'utf-8'));
  const surahNo = surahData.surahNo || s;

  for (const a of surahData.ayahs) {
    // Compact tuple: [surahNo, ayahNo, textAr]
    indexItems.push([surahNo, a.ayahNo, a.textAr]);
  }
}

if (indexItems.length !== 6236) {
  console.warn(`Warning: expected 6236 verses, found ${indexItems.length}`);
} else {
  console.log(`Verified exactly 6,236 verses across 114 Surahs.`);
}

fs.writeFileSync(outputIndexFile, JSON.stringify(indexItems), 'utf-8');
const stats = fs.statSync(outputIndexFile);
console.log(`Successfully generated: ${outputIndexFile}`);
console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
