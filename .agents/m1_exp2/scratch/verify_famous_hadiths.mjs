import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';
import { normalizeArabicText, extractHadithMatn } from './full_test.mjs';
import { arabicSearchMatch } from '../../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

const famousHadithQueries = [
  { query: 'الاعمال بالنيات', name: 'Hadith 1: Intentions (النيات)' },
  { query: 'بني الاسلام علي خمس', name: 'Hadith 3: Five Pillars of Islam' },
  { query: 'دع ما يريبك الي ما لا يريبك', name: 'Hadith 11: Leave what is doubtful' },
  { query: 'لا يومن احدكم حتي يحب لاخيه', name: 'Hadith 13: Love for your brother' },
  { query: 'من احدث في امرنا هذا', name: 'Hadith 5: Innovation rejected' },
  { query: 'الحلال بين والحرام بين', name: 'Hadith 6: Halal & Haram are clear' },
  { query: 'ان الله طيب لا يقبل الا طيبا', name: 'Hadith 10: Allah is pure' },
  { query: 'لا ضرر ولا ضرار', name: 'Hadith 32: No harm and no reciprocating harm' },
  { query: 'اتق الله حيثما كنت', name: 'Hadith 18: Fear Allah wherever you are' },
  { query: 'الدين النصيحه', name: 'Hadith 7: Religion is sincere advice' },
  { query: 'الطهور شطر الايمان', name: 'Hadith 23: Purification is half of faith' },
  { query: 'ازهد في الدنيا يحبك الله', name: 'Hadith 31: Renounce the world' },
  { query: 'البر حسن الخلق', name: 'Hadith 27: Righteousness is good character' },
  { query: 'سبعه يظلهم الله في ظله', name: 'Seven whom Allah will shade' },
  { query: 'كلمتان خفيفتان علي اللسان', name: 'Last Hadith of Bukhari: Two words light on the tongue' },
];

async function verifyFamous() {
  console.log('Verifying famous hadiths match extracted matns...\n');

  // Let's load Bukhari, Muslim, Nawawi 40, Tirmidhi
  const booksToLoad = ['bukhari.json', 'muslim.json', 'nawawi40.json', 'tirmidhi.json', 'riyad_assalihin.json'];
  const booksData = {};

  for (const f of booksToLoad) {
    const res = await fetch(`${HF_SUNNAH_BASE}/${f}`);
    booksData[f] = await res.json();
  }

  let passed = 0;
  let failed = 0;

  for (const q of famousHadithQueries) {
    let foundIn = [];

    for (const [f, data] of Object.entries(booksData)) {
      for (const h of data.hadiths) {
        const matn = extractHadithMatn(h.arabic);
        if (arabicSearchMatch(matn, q.query)) {
          foundIn.push(`${f.replace('.json', '')} #${h.idInBook}`);
        }
      }
    }

    if (foundIn.length > 0) {
      console.log(`✅ [PASS] "${q.name}" (${q.query}) -> Found in ${foundIn.length} hadiths: [${foundIn.slice(0, 4).join(', ')}${foundIn.length > 4 ? '...' : ''}]`);
      passed++;
    } else {
      console.log(`❌ [FAIL] "${q.name}" (${q.query}) NOT found in extracted matns!`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
}

verifyFamous().catch(console.error);
