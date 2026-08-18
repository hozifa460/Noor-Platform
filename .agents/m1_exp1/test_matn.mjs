import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic } from '../../src/lib/arabic-normalizer.ts';

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function fetchBook(fileName) {
  const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', fileName);
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  }
  const url = `${HF_SUNNAH_BASE}/All_hadith_books/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
  return await res.json();
}

/**
 * Matn extraction: strips standard isnad prefixes
 * Examples of isnad separators in classical hadith:
 * - "قال رسول الله صلى الله عليه وسلم"
 * - "عن النبي صلى الله عليه وسلم قال"
 * - "ان رسول الله صلى الله عليه وسلم قال"
 * - "يقول سمعت رسول الله صلى الله عليه وسلم يقول"
 */
function extractMatn(normalizedText) {
  if (!normalizedText) return '';
  
  // Look for prophet attribution markers
  const markers = [
    /رسول الله صلي الله عليه وسلم (?:قال|يقول|نهي|امر|خطب|بعث|سئل|كان)?\s*(.*)/,
    /عن النبي صلي الله عليه وسلم (?:قال|يقول|نهي|امر)?\s*(.*)/,
    /ان النبي صلي الله عليه وسلم (?:قال|يقول)?\s*(.*)/,
    /النبي صلي الله عليه وسلم\s*(.*)/,
    /سمعت رسول الله\s*(.*)/,
  ];

  for (const regex of markers) {
    const match = normalizedText.match(regex);
    if (match && match[1] && match[1].trim().length > 10) {
      return match[1].trim();
    }
  }

  // Fallback: if starts with standard haddathana chain, try to find "قال:" or last "قال"
  return normalizedText;
}

async function testMatnAndSizing() {
  console.log('Loading books for Matn extraction & sizing tests...');
  const booksData = [];
  for (const book of HADITH_BOOKS_LIST) {
    const data = await fetchBook(book.fileName);
    booksData.push({ book, data });
  }

  const booksList = HADITH_BOOKS_LIST.map((b) => b.id);
  const gradesList = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];

  console.log('\n--- Matn Extraction Success Rate ---');
  let totalHadiths = 0;
  let matnExtractedCount = 0;

  for (const { book, data } of booksData) {
    let bookExtracted = 0;
    for (const h of (data.hadiths || [])) {
      totalHadiths++;
      const norm = normalizeArabic(h.arabic || '').replace(/\s+/g, ' ').trim();
      const matn = extractMatn(norm);
      if (matn !== norm) {
        matnExtractedCount++;
        bookExtracted++;
      }
    }
    console.log(`${book.id}: ${bookExtracted} / ${data.hadiths?.length} (${((bookExtracted / (data.hadiths?.length || 1)) * 100).toFixed(1)}%)`);
  }
  console.log(`\nTotal Matn extracted: ${matnExtractedCount} / ${totalHadiths} (${((matnExtractedCount / totalHadiths) * 100).toFixed(1)}%)\n`);

  console.log('--- Size Tests for Tuple Format [bIdx, idInBook, chapterId, textPreview, gradeIdx] ---');
  for (const len of [10, 12, 15, 18, 20, 22, 23, 24, 25]) {
    const items = [];
    for (let bIdx = 0; bIdx < booksData.length; bIdx++) {
      const { book, data } = booksData[bIdx];
      for (const h of (data.hadiths || [])) {
        const norm = normalizeArabic(h.arabic || '').replace(/\s+/g, ' ').trim();
        const matn = extractMatn(norm);
        const snippet = matn.slice(0, len);
        let gradeIdx = (book.id === 'bukhari' || book.id === 'muslim' || book.id === 'nawawi40' || book.id === 'riyad_assalihin') ? 0 : 4;
        items.push([bIdx, h.idInBook, h.chapterId || 0, snippet, gradeIdx]);
      }
    }
    const payload = { books: booksList, grades: gradesList, items };
    const str = JSON.stringify(payload);
    const bytes = Buffer.byteLength(str, 'utf-8');
    console.log(`Length ${len.toString().padStart(2)}: ${bytes.toLocaleString()} bytes (${(bytes / (1024 * 1024)).toFixed(3)} MB) -> Under 3MB? ${bytes < 3000000 ? '✅ YES' : '❌ NO'}`);
  }

  // Also test sample hadiths with Matn extraction
  console.log('\n--- Famous Hadith Matn Extraction Samples ---');
  // 1. Bukhari #1 (Intentions)
  const bukhari1 = booksData[0].data.hadiths[0];
  const b1Norm = normalizeArabic(bukhari1.arabic).replace(/\s+/g, ' ').trim();
  console.log('Bukhari #1 Raw Snippet:', bukhari1.arabic.slice(0, 100));
  console.log('Bukhari #1 Norm Snippet:', b1Norm.slice(0, 100));
  console.log('Bukhari #1 Matn Extracted:', extractMatn(b1Norm).slice(0, 100));

  // 2. Nawawi 40 #1
  const nawawi = booksData.find((b) => b.book.id === 'nawawi40').data.hadiths[0];
  const n1Norm = normalizeArabic(nawawi.arabic).replace(/\s+/g, ' ').trim();
  console.log('\nNawawi 40 #1 Norm:', n1Norm.slice(0, 100));
  console.log('Nawawi 40 #1 Matn:', extractMatn(n1Norm).slice(0, 100));
}

testMatnAndSizing().catch(console.error);
