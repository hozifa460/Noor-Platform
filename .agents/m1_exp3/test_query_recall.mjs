import fs from 'node:fs';
import { normalizeArabic, arabicSearchMatch } from '../../src/lib/arabic-normalizer.ts';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

const ISNAD_PATTERNS = [
  /صلي الله عليه وسلم (?:يقول|قال|قالت|انه قال|انها قالت|فقال|انه|ان)\s*:?\s*(.*)/i,
  /عن النبي صلي الله عليه وسلم (?:قال|انه قال|يقول)\s*:?\s*(.*)/i,
  /سمعت رسول الله صلي الله عليه وسلم (?:يقول|قال)\s*:?\s*(.*)/i,
  /قال رسول الله صلي الله عليه وسلم\s*:?\s*(.*)/i,
  /رسول الله صلي الله عليه وسلم\s*:?\s*(.*)/i,
  /عن [^:]+? قال\s*:?\s*(.*)/i,
];

function extractMatn(text) {
  if (!text) return '';
  let matn = text;
  for (const pat of ISNAD_PATTERNS) {
    const match = text.match(pat);
    if (match && match[1] && match[1].trim().length >= 10) {
      matn = match[1].trim();
      break;
    }
  }
  return matn;
}

const testQueries = [
  'النيات',
  'الوضوء',
  'بر الوالدين',
  'الصلاة',
  'ارحموا',
  'طلب العلم',
  'الدين النصيحة',
  'لا يؤمن احدكم',
  'من غش',
  'بني الاسلام'
];

console.log('--- Testing Query Recall with Different Text Preview Strategies ---\n');

// Strategy 1: Raw text sliced at 20 chars
// Strategy 2: Extracted Matn sliced at 20 chars
// Strategy 3: Extracted Matn sliced at 4 words
// Strategy 4: Extracted Matn sliced at 5 words
// Strategy 5: Full 450 chars baseline (existing)

for (const q of testQueries) {
  console.log(`\nQuery: "${q}"`);
  
  const baselineMatches = data.filter(d => arabicSearchMatch(d.t, q)).length;
  
  const raw20Matches = data.filter(d => arabicSearchMatch(d.t.slice(0, 20), q)).length;
  
  const matn20Matches = data.filter(d => {
    const m = extractMatn(d.t);
    return arabicSearchMatch(m.slice(0, 20), q);
  }).length;
  
  const matn22Matches = data.filter(d => {
    const m = extractMatn(d.t);
    return arabicSearchMatch(m.slice(0, 22), q);
  }).length;

  const matn4wMatches = data.filter(d => {
    const m = extractMatn(d.t);
    const w = m.split(/\s+/).slice(0, 4).join(' ');
    return arabicSearchMatch(w, q);
  }).length;

  const matn5wMatches = data.filter(d => {
    const m = extractMatn(d.t);
    const w = m.split(/\s+/).slice(0, 5).join(' ');
    return arabicSearchMatch(w, q);
  }).length;

  console.log(`  Baseline (450 chars): ${baselineMatches}`);
  console.log(`  Raw 20 chars (No Isnad strip): ${raw20Matches} (lost ${baselineMatches - raw20Matches})`);
  console.log(`  Matn 20 chars: ${matn20Matches}`);
  console.log(`  Matn 22 chars: ${matn22Matches}`);
  console.log(`  Matn 4 words: ${matn4wMatches}`);
  console.log(`  Matn 5 words: ${matn5wMatches}`);
}
