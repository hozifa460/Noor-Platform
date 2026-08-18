import fs from 'node:fs';
import path from 'node:path';

const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const stat = fs.statSync(p);
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

console.log('=== HADITH MICRO-INDEX AUDIT REPORT ===');
console.log('File Size:', stat.size.toLocaleString(), 'bytes (' + (stat.size / (1024 * 1024)).toFixed(3) + ' MB)');
console.log('Size Constraint (< 3,000,000 bytes):', stat.size < 3000000 ? '✅ PASS' : '❌ FAIL');
console.log('Total Books:', data.books.length, '->', data.books.length === 17 ? '✅ PASS' : '❌ FAIL');
console.log('Total Grades:', data.grades.length, '->', data.grades.length === 5 ? '✅ PASS' : '❌ FAIL');
console.log('Total Items:', data.items.length.toLocaleString(), '->', data.items.length === 50884 ? '✅ PASS' : '❌ FAIL');

// Book by book count audit
const bookCounts = {};
data.books.forEach((b) => (bookCounts[b] = 0));
data.items.forEach((it) => {
  const bName = data.books[it[0]];
  bookCounts[bName] = (bookCounts[bName] || 0) + 1;
});

console.log('\n--- Book Item Breakdown ---');
for (const [bName, count] of Object.entries(bookCounts)) {
  console.log('  ' + bName.padEnd(24) + ': ' + count.toLocaleString() + ' hadiths');
}

// Grade distribution
const gradeCounts = {};
data.grades.forEach((g) => (gradeCounts[g] = 0));
data.items.forEach((it) => {
  const gName = data.grades[it[4]];
  gradeCounts[gName] = (gradeCounts[gName] || 0) + 1;
});

console.log('\n--- Grade Distribution ---');
for (const [gName, count] of Object.entries(gradeCounts)) {
  console.log('  ' + gName.padEnd(10) + ': ' + count.toLocaleString() + ' hadiths');
}

// Famous Hadiths Validation
console.log('\n--- Famous Hadiths Matn Validation ---');
const famousChecks = [
  { b: 0, id: 1, expectedPrefix: 'انما الاعمال بالنيات', desc: 'Sahih Bukhari #1 (Intentions)' },
  { b: 0, id: 8, expectedPrefix: 'بني الاسلام علي خمس', desc: 'Sahih Bukhari #8 (Pillars of Islam)' },
  { b: 14, id: 1, expectedPrefix: 'انما الاعمال بالنيات', desc: 'Nawawi 40 #1 (Intentions)' },
  { b: 14, id: 11, expectedPrefix: 'دع ما يريبك الي ما', desc: 'Nawawi 40 #11 (Doubtful matters)' },
  { b: 14, id: 13, expectedPrefix: 'لا يومن احدكم حتي', desc: 'Nawawi 40 #13 (Love for brother)' },
  { b: 16, id: 1, expectedPrefix: 'ليس الخبر كالمعاينه', desc: 'Shah Waliullah 40 #1' },
  { b: 16, id: 2, expectedPrefix: 'الحرب خدعه', desc: 'Shah Waliullah 40 #2' },
];

let famousPassed = 0;
for (const c of famousChecks) {
  const item = data.items.find((it) => it[0] === c.b && it[1] === c.id);
  if (item && item[3].startsWith(c.expectedPrefix)) {
    console.log(`  ✅ ${c.desc}: "${item[3]}"`);
    famousPassed++;
  } else {
    console.log(`  ❌ ${c.desc}: Expected prefix "${c.expectedPrefix}", got "${item ? item[3] : 'NOT FOUND'}"`);
  }
}

console.log(`\nFamous Hadith Checks Passed: ${famousPassed}/${famousChecks.length}`);
