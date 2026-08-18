import fs from 'node:fs';
import { normalizeArabic } from '../../src/lib/arabic-normalizer.ts';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

// Regex to strip invisible control characters and Unicode formatting marks
const CONTROL_MARKS_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF\uFFF0-\uFFFF\u00AD\u061C]/g;
const EXTRA_PUNCTUATION_REGEX = /[«»“”"''`~@#$%^&*()_+=\[\]{}|\\:;?/><.,،؛ـ]/g;

function cleanArabicText(text) {
  if (!text) return '';
  return normalizeArabic(text)
    .replace(CONTROL_MARKS_REGEX, '')
    .replace(EXTRA_PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let originalBytes = 0;
let cleanedBytes = 0;

data.forEach(item => {
  const norm = normalizeArabic(item.t);
  originalBytes += Buffer.byteLength(norm, 'utf-8');
  const clean = cleanArabicText(item.t);
  cleanedBytes += Buffer.byteLength(clean, 'utf-8');
});

console.log(`Original normalized bytes: ${originalBytes.toLocaleString()} B (${(originalBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Cleaned normalized bytes:  ${cleanedBytes.toLocaleString()} B (${(cleanedBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Bytes saved:               ${(originalBytes - cleanedBytes).toLocaleString()} B (${((originalBytes - cleanedBytes) / 1024).toFixed(1)} KB)`);
