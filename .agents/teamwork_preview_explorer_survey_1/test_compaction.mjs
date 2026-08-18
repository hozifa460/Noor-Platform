import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../../src/lib/arabic-normalizer.ts';

async function testCompaction() {
  const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
  const rawData = JSON.parse(fs.readFileSync(p, 'utf8'));

  const bookIdToIdx = {};
  HADITH_BOOKS_LIST.forEach((b, idx) => { bookIdToIdx[b.id] = idx; });
  const gradeToCode = { 'صحيح': 0, 'حسن': 1, 'ضعيف': 2, 'موضوع': 3, 'مقبول': 4 };

  for (const len of [60, 50, 40, 30, 25, 20]) {
    const list = rawData.map(h => [
      bookIdToIdx[h.b] ?? 0,
      h.i,
      h.c,
      (h.t || '').slice(0, len),
      gradeToCode[h.g] ?? 0
    ]);
    const str = JSON.stringify(list);
    const mb = (Buffer.byteLength(str, 'utf8') / (1024 * 1024)).toFixed(2);
    console.log(`Preview ${len} chars: ${mb} MB (${Buffer.byteLength(str, 'utf8').toLocaleString()} bytes)`);
  }

  // Also test inverted index structure with stem tokens:
  // e.g. { "نيات": [[0,1,1], [1,1,1]], ... }
}

testCompaction().catch(console.error);
