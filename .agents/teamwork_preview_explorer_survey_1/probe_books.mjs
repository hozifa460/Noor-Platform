import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function probe() {
  console.log(`Checking ${HADITH_BOOKS_LIST.length} Hadith collections on Hugging Face...\n`);
  let totalBytes = 0;
  for (const b of HADITH_BOOKS_LIST) {
    const url = `${HF_SUNNAH_BASE}/All_hadith_books/${b.fileName}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const lenStr = res.headers.get('content-length');
      const len = lenStr ? parseInt(lenStr, 10) : 0;
      totalBytes += len;
      const mb = len ? (len / 1024 / 1024).toFixed(2) + ' MB' : 'unknown';
      console.log(`[${res.status}] ${b.id.padEnd(23)} | ${b.nameAr.padEnd(28)} | ${b.fileName.padEnd(26)} | size: ${mb.padStart(8)} | catalogCount: ${b.hadithCount}`);
    } catch (e) {
      console.log(`[ERR] ${b.id}: ${e.message}`);
    }
  }
  console.log(`\nTotal Remote Size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

probe().catch(console.error);
