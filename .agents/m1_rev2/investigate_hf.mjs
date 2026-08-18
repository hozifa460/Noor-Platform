import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabicText, extractHadithMatn } from '../../scripts/generate_hadiths_micro_index.mjs';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

async function fetchBook(name) {
  const p = path.join(process.cwd(), 'public', 'data', 'hadith', name);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  const res = await fetch(`${HF_SUNNAH_BASE}/${name}`);
  return await res.json();
}

async function investigate() {
  console.log('--- Fetching Bukhari and Malik ---');
  const bukhari = await fetchBook('bukhari.json');
  const malik = await fetchBook('malik.json');

  console.log('\n=== Bukhari #26 Analysis ===');
  const b26 = bukhari.hadiths.find(h => h.idInBook === 26);
  console.log('Raw:', b26.arabic);
  console.log('Norm:', normalizeArabicText(b26.arabic));
  console.log('Extracted:', extractHadithMatn(b26.arabic));

  console.log('\n=== Bukhari #28 Analysis ===');
  const b28 = bukhari.hadiths.find(h => h.idInBook === 28);
  console.log('Raw:', b28.arabic);
  console.log('Norm:', normalizeArabicText(b28.arabic));
  console.log('Extracted:', extractHadithMatn(b28.arabic));

  console.log('\n=== Malik Empty Hadiths Analysis ===');
  for (const id of [35, 237, 239, 332, 386]) {
    const h = malik.hadiths.find(x => x.idInBook === id);
    console.log(`\nMalik #${id}:`);
    console.log('Raw:', JSON.stringify(h ? h.arabic : 'NOT FOUND'));
    console.log('Norm:', JSON.stringify(h ? normalizeArabicText(h.arabic) : ''));
    console.log('Extracted:', JSON.stringify(h ? extractHadithMatn(h.arabic) : ''));
  }
}

investigate().catch(console.error);
