import fs from 'node:fs';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

let exactPhraseMatches = 0;
let items = [];
data.forEach(d => {
  if (d.t.includes('بر الوالدين')) {
    exactPhraseMatches++;
    items.push(d);
  }
});

console.log('Total hadiths containing exact phrase "بر الوالدين":', exactPhraseMatches);
items.slice(0, 10).forEach(it => {
  console.log(`- ${it.b} #${it.i}: ${it.t.slice(0, 120)}...`);
});
