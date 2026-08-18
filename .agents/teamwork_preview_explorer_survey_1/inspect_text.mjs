import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function inspectHadithText() {
  const url = `${HF_SUNNAH_BASE}/All_hadith_books/nawawi40.json`;
  const res = await fetch(url);
  const json = await res.json();
  
  console.log('--- Nawawi 40 Hadith 1 ---');
  console.log('Raw:', json.hadiths[0].arabic);
  console.log('Normalized:', normalizeArabic(json.hadiths[0].arabic));
  
  const bUrl = `${HF_SUNNAH_BASE}/All_hadith_books/bukhari.json`;
  const bRes = await fetch(bUrl);
  const bJson = await bRes.json();
  console.log('\n--- Bukhari Hadith 1 ---');
  console.log('Raw:', bJson.hadiths[0].arabic);
  console.log('Normalized:', normalizeArabic(bJson.hadiths[0].arabic));

  // Let's test finding "النيات" in Bukhari Hadith 1
  const norm1 = normalizeArabic(bJson.hadiths[0].arabic);
  console.log('\nIndex of "النيات" (norm: "النيات" -> "النيات" or "بالنيات"):', norm1.indexOf('بالنيات'), norm1.indexOf('النيات'));
  console.log('Length of Bukhari Hadith 1:', norm1.length);
}

inspectHadithText().catch(console.error);
