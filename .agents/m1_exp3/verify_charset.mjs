import fs from 'node:fs';
import { normalizeArabic } from '../../src/lib/arabic-normalizer.ts';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

let hasQuotes = 0;
let hasBackslash = 0;
let hasNonArabicOrSpace = 0;
const extraChars = new Set();

data.forEach(item => {
  const norm = normalizeArabic(item.t);
  if (norm.includes('"')) hasQuotes++;
  if (norm.includes('\\')) hasBackslash++;
  for (const ch of norm) {
    const code = ch.charCodeAt(0);
    // Arabic is 0x0600-0x06FF, space is 0x20, digits 0x30-0x39 or arabic digits 0x0660-0x0669
    if (code !== 0x20 && !(code >= 0x0620 && code <= 0x064A) && !(code >= 0x0660 && code <= 0x0669) && !(code >= 0x30 && code <= 0x39)) {
      hasNonArabicOrSpace++;
      extraChars.add(`${ch} (0x${code.toString(16)})`);
    }
  }
});

console.log('Quotes count:', hasQuotes);
console.log('Backslash count:', hasBackslash);
console.log('Non-standard chars count:', hasNonArabicOrSpace);
console.log('Extra chars found:', Array.from(extraChars));
