import fs from 'node:fs';
import path from 'node:path';

const p = 'public/data/hadith/hadiths_micro_index.json';
const raw = fs.readFileSync(p, 'utf-8');
const data = JSON.parse(raw);

// Book mapping
const bookMap = {};
const books = [];
data.forEach(item => {
  if (bookMap[item.b] === undefined) {
    bookMap[item.b] = books.length;
    books.push(item.b);
  }
});

// Grade mapping
const gradeMap = {};
const grades = [];
data.forEach(item => {
  const g = item.g || 'مقبول';
  if (gradeMap[g] === undefined) {
    gradeMap[g] = grades.length;
    grades.push(g);
  }
});

console.log('Books table (' + books.length + '):', books);
console.log('Grades table (' + grades.length + '):', grades);
console.log('\n--- Simulation of Raw Character Prefix Lengths ---');

for (const charLimit of [10, 15, 18, 20, 22, 24, 25, 28, 30, 35, 40, 50, 60, 80, 100]) {
  const items = data.map(item => [
    bookMap[item.b],
    item.i,
    item.c,
    (item.t || '').slice(0, charLimit),
    gradeMap[item.g || 'مقبول']
  ]);
  const payload = { books, grades, items };
  const json = JSON.stringify(payload);
  const byteLen = Buffer.byteLength(json, 'utf-8');
  const mb = (byteLen / (1024 * 1024)).toFixed(3);
  const avgItemBytes = (byteLen / data.length).toFixed(1);
  console.log(`charLimit: ${String(charLimit).padStart(3)} | total: ${byteLen.toLocaleString().padStart(9)} bytes | ${mb} MB | avg/item: ${avgItemBytes} bytes | within 3MB: ${byteLen < 3000000 ? 'YES' : 'NO'}`);
}
