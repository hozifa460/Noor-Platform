import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';
import { normalizeArabic } from '../../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

// Let's test different Isnad stripping algorithms on real data
async function test() {
  console.log('Testing Matn Extraction and Isnad Stripping on collections...\n');

  // Let's fetch Bukhari, Muslim, Nawawi 40, Abu Dawud, and Malik
  const testBooks = ['bukhari.json', 'muslim.json', 'nawawi40.json', 'malik.json', 'shahwaliullah40.json'];
  
  for (const fileName of testBooks) {
    const res = await fetch(`${HF_SUNNAH_BASE}/${fileName}`);
    const data = await res.json();
    console.log(`\n========================================\n=== Testing ${fileName} (${data.hadiths.length} hadiths) ===\n========================================`);
    
    for (let i = 0; i < Math.min(5, data.hadiths.length); i++) {
      const raw = data.hadiths[i].arabic;
      console.log(`\n[Hadith ${i+1}] Raw length: ${raw.length}`);
      console.log(`Original: ${raw.slice(0, 150)}...`);
      
      // Let's inspect different splitting markers
      // 1. Quoted text check
      const quoteMatch = raw.match(/["«“][\s\S]+?["»”]/) || raw.match(/‏"‏([\s\S]+?)‏"‏/);
      if (quoteMatch) {
        console.log(`-> Quote found: ${quoteMatch[0].replace(/[\n\r]+/g, ' ').slice(0, 100)}...`);
      }
    }
  }
}

test();
