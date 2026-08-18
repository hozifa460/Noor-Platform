import { normalizeArabic } from '../../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

async function testSpecific() {
  const resBukhari = await fetch(`${HF_SUNNAH_BASE}/bukhari.json`);
  const bukhari = await resBukhari.json();

  console.log('=== Bukhari Hadith 1 ===');
  console.log('Raw:', bukhari.hadiths[0].arabic);

  const resNawawi = await fetch(`${HF_SUNNAH_BASE}/nawawi40.json`);
  const nawawi = await resNawawi.json();

  console.log('\n=== Nawawi Hadith 1 ===');
  console.log('Raw:', nawawi.hadiths[0].arabic);
}

testSpecific();
