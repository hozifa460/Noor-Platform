import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabicText, extractHadithMatn } from '../../scripts/generate_hadiths_micro_index.mjs';

const indexPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const indexRaw = fs.readFileSync(indexPath, 'utf-8');
const index = JSON.parse(indexRaw);
const stat = fs.statSync(indexPath);

console.log('=== FORENSIC VALIDATION OF HADITHS_MICRO_INDEX.JSON ===');
console.log('Exact byte size on disk:', stat.size);
console.log('Size ceiling (< 3,000,000 bytes):', stat.size < 3000000 ? 'PASS' : `FAIL (${stat.size} bytes > 3,000,000 bytes)`);
console.log('Total books in payload:', index.books.length);
console.log('Total items in payload:', index.items.length);
console.log('Grade dictionary:', JSON.stringify(index.grades));

// Check book distribution
const bookCounts = {};
for (const item of index.items) {
  const bIdx = item[0];
  const bId = index.books[bIdx];
  bookCounts[bId] = (bookCounts[bId] || 0) + 1;
}

console.log('\n--- Book Distribution in Generated Index ---');
for (const b of HADITH_BOOKS_LIST) {
  const count = bookCounts[b.id] || 0;
  console.log(`- ${b.id.padEnd(22)}: ${count.toString().padStart(6)} hadiths`);
}

// Sample verification against raw files in public/data/hadith if present, or fetch sample
console.log('\n--- Sample Integrity Cross-Check ---');
const sampleIndices = [0, 1, 100, 1000, 7276, 7277, 10000, 20000, 30000, 40000, 50000, index.items.length - 1];
for (const idx of sampleIndices) {
  const item = index.items[idx];
  const bId = index.books[item[0]];
  const hadithId = item[1];
  const chapterId = item[2];
  const textPreview = item[3];
  const grade = index.grades[item[4]];
  console.log(`[Item #${idx}] Book: ${bId} | Hadith ID: ${hadithId} | Chap: ${chapterId} | Grade: ${grade} | Preview: "${textPreview}"`);
}

// Check for nulls, undefined, NaN, empty strings, duplicates
let nullCount = 0;
let emptyPreviewCount = 0;
const seenKeys = new Set();
let dupCount = 0;

for (let i = 0; i < index.items.length; i++) {
  const item = index.items[i];
  if (!item || item.length !== 5) nullCount++;
  if (item[0] < 0 || item[0] >= index.books.length) nullCount++;
  if (typeof item[1] !== 'number' || isNaN(item[1])) nullCount++;
  if (typeof item[2] !== 'number' || isNaN(item[2])) nullCount++;
  if (typeof item[3] !== 'string' || item[3].trim().length === 0) emptyPreviewCount++;
  if (item[4] < 0 || item[4] >= index.grades.length) nullCount++;

  const key = `${item[0]}-${item[1]}`;
  if (seenKeys.has(key)) {
    dupCount++;
  }
  seenKeys.add(key);
}

console.log('\n--- Anomaly Scan ---');
console.log('Structural Null / Malformed tuples:', nullCount);
console.log('Empty preview count:', emptyPreviewCount);
console.log('Duplicate [bookIdx, hadithId] count:', dupCount);

