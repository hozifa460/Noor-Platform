import fs from 'node:fs';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

console.log('Sample item 0 (Bukhari 1):', JSON.stringify(data[0], null, 2));
console.log('\nSample item 1 (Bukhari 2):', JSON.stringify(data[1], null, 2));
console.log('\nSample item 2 (Bukhari 3):', JSON.stringify(data[2], null, 2));
console.log('\nSample item 100:', JSON.stringify(data[100], null, 2));
console.log('\nSample Muslim 0:', JSON.stringify(data.find(d => d.b === 'muslim'), null, 2));
console.log('\nSample Nawawi40 0:', JSON.stringify(data.find(d => d.b === 'nawawi40'), null, 2));
