import { extractHadithMatn, normalizeArabicText } from '../../scripts/generate_hadiths_micro_index.mjs';

const res = await fetch('https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books/malik.json');
const malik = await res.json();

const h35 = malik.hadiths.find(h => h.idInBook === 35);
console.log('Malik #35 raw arabic:', JSON.stringify(h35?.arabic));
console.log('Malik #35 norm arabic:', JSON.stringify(normalizeArabicText(h35?.arabic)));
console.log('Malik #35 matn:', JSON.stringify(extractHadithMatn(h35?.arabic)));

const h237 = malik.hadiths.find(h => h.idInBook === 237);
console.log('Malik #237 raw arabic:', JSON.stringify(h237?.arabic));
console.log('Malik #237 norm arabic:', JSON.stringify(normalizeArabicText(h237?.arabic)));
console.log('Malik #237 matn:', JSON.stringify(extractHadithMatn(h237?.arabic)));

