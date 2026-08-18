import fs from 'node:fs';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

// Common isnad markers to extract Matn
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

// Build dictionaries
const bookMap = {};
const books = [];
data.forEach(item => {
  if (bookMap[item.b] === undefined) {
    bookMap[item.b] = books.length;
    books.push(item.b);
  }
});

const gradeMap = {};
const grades = [];
data.forEach(item => {
  const g = item.g || 'مقبول';
  if (gradeMap[g] === undefined) {
    gradeMap[g] = grades.length;
    grades.push(g);
  }
});

console.log('Total Hadiths:', data.length);
console.log('Books (' + books.length + '):', books);
console.log('Grades (' + grades.length + '):', grades);

console.log('\n--- Sample Bukhari 1 Matn Extraction ---');
console.log('Original:', data[0].t);
console.log('Extracted Matn:', extractMatn(data[0].t));

// Test various prefix lengths and word limits on extracted Matn
console.log('\n--- Byte Size Simulation on Extracted Matn ---');

for (const charLimit of [12, 15, 18, 20, 22, 24, 25, 28, 30]) {
  const items = data.map(item => {
    const matn = extractMatn(item.t);
    return [
      bookMap[item.b],
      item.i,
      item.c,
      matn.slice(0, charLimit).trim(),
      gradeMap[item.g || 'مقبول']
    ];
  });
  const payload = { books, grades, items };
  const json = JSON.stringify(payload);
  const bytes = Buffer.byteLength(json, 'utf-8');
  const mb = (bytes / (1024 * 1024)).toFixed(3);
  console.log(`Char limit: ${String(charLimit).padStart(2)} | Size: ${bytes.toLocaleString().padStart(9)} B | ${mb} MB | Avg: ${(bytes / data.length).toFixed(1)} B/item | < 3MB: ${bytes < 3000000 ? 'YES' : 'NO'}`);
}

// Word limit test
console.log('\n--- Word Limit Simulation on Extracted Matn ---');
for (const wordLimit of [2, 3, 4, 5, 6, 7]) {
  const items = data.map(item => {
    const matn = extractMatn(item.t);
    const words = matn.split(/\s+/).slice(0, wordLimit).join(' ');
    return [
      bookMap[item.b],
      item.i,
      item.c,
      words,
      gradeMap[item.g || 'مقبول']
    ];
  });
  const payload = { books, grades, items };
  const json = JSON.stringify(payload);
  const bytes = Buffer.byteLength(json, 'utf-8');
  const mb = (bytes / (1024 * 1024)).toFixed(3);
  console.log(`Word limit: ${wordLimit} words | Size: ${bytes.toLocaleString().padStart(9)} B | ${mb} MB | Avg: ${(bytes / data.length).toFixed(1)} B/item | < 3MB: ${bytes < 3000000 ? 'YES' : 'NO'}`);
}
