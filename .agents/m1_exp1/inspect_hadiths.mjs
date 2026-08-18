import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function fetchBook(fileName) {
  const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', fileName);
  if (fs.existsSync(localPath)) {
    const raw = fs.readFileSync(localPath, 'utf-8');
    return { data: JSON.parse(raw), sizeBytes: Buffer.byteLength(raw, 'utf-8'), source: 'local' };
  }
  const url = `${HF_SUNNAH_BASE}/All_hadith_books/${fileName}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
  const text = await res.text();
  return { data: JSON.parse(text), sizeBytes: Buffer.byteLength(text, 'utf-8'), source: 'remote' };
}

async function run() {
  const results = [];
  let totalHadiths = 0;
  let totalRawSizeBytes = 0;

  console.log(`Starting analysis of ${HADITH_BOOKS_LIST.length} Hadith collections...\n`);

  for (const book of HADITH_BOOKS_LIST) {
    process.stdout.write(`Analyzing ${book.id} (${book.fileName})... `);
    try {
      const { data, sizeBytes, source } = await fetchBook(book.fileName);
      totalRawSizeBytes += sizeBytes;
      const hadiths = data.hadiths || [];
      const chapters = data.chapters || [];
      const metadata = data.metadata || {};

      totalHadiths += hadiths.length;

      // Analyze fields across all hadiths in this book
      const hadithKeys = new Set();
      let nullChapterIds = 0;
      let zeroChapterIds = 0;
      let emptyArabic = 0;
      let minIdInBook = Infinity;
      let maxIdInBook = -Infinity;
      let minChapterId = Infinity;
      let maxChapterId = -Infinity;
      let hasGradesInHadiths = 0;
      let hasEnglish = 0;
      let minArabicLen = Infinity;
      let maxArabicLen = -Infinity;
      let totalArabicLen = 0;

      for (let idx = 0; idx < hadiths.length; idx++) {
        const h = hadiths[idx];
        for (const k of Object.keys(h)) hadithKeys.add(k);

        if (h.chapterId === null || h.chapterId === undefined) nullChapterIds++;
        if (h.chapterId === 0) zeroChapterIds++;
        if (h.chapterId !== null && h.chapterId !== undefined) {
          if (h.chapterId < minChapterId) minChapterId = h.chapterId;
          if (h.chapterId > maxChapterId) maxChapterId = h.chapterId;
        }

        if (h.idInBook !== null && h.idInBook !== undefined) {
          if (h.idInBook < minIdInBook) minIdInBook = h.idInBook;
          if (h.idInBook > maxIdInBook) maxIdInBook = h.idInBook;
        }

        if (h.grade || h.grades || h.status) hasGradesInHadiths++;
        if (h.english && (h.english.text || h.english.narrator)) hasEnglish++;

        const arLen = (h.arabic || '').length;
        if (!h.arabic || arLen === 0) emptyArabic++;
        totalArabicLen += arLen;
        if (arLen < minArabicLen) minArabicLen = arLen;
        if (arLen > maxArabicLen) maxArabicLen = arLen;
      }

      const chapterKeys = new Set();
      for (const ch of chapters) {
        for (const k of Object.keys(ch)) chapterKeys.add(k);
      }

      const avgArabicLen = hadiths.length > 0 ? (totalArabicLen / hadiths.length).toFixed(1) : 0;

      const info = {
        id: book.id,
        nameAr: book.nameAr,
        nameEn: book.nameEn,
        fileName: book.fileName,
        source,
        sizeBytes,
        sizeMB: (sizeBytes / (1024 * 1024)).toFixed(2),
        catalogHadithCount: book.hadithCount,
        actualHadithCount: hadiths.length,
        diffCount: hadiths.length - book.hadithCount,
        chapterCount: chapters.length,
        topLevelKeys: Object.keys(data),
        metadataKeys: Object.keys(metadata),
        metadataTitleAr: metadata.arabic?.title,
        metadataAuthorAr: metadata.arabic?.author,
        chapterKeys: Array.from(chapterKeys),
        hadithKeys: Array.from(hadithKeys),
        sampleHadith: hadiths[0] ? {
          id: hadiths[0].id,
          idInBook: hadiths[0].idInBook,
          chapterId: hadiths[0].chapterId,
          bookId: hadiths[0].bookId,
          arabicSnippet: (hadiths[0].arabic || '').slice(0, 100) + '...',
          hasEnglish: !!hadiths[0].english
        } : null,
        stats: {
          minIdInBook,
          maxIdInBook,
          minChapterId: minChapterId === Infinity ? null : minChapterId,
          maxChapterId: maxChapterId === -Infinity ? null : maxChapterId,
          nullChapterIds,
          zeroChapterIds,
          emptyArabic,
          hasGradesInRawData: hasGradesInHadiths > 0,
          hadithsWithEnglishCount: hasEnglish,
          minArabicLen: minArabicLen === Infinity ? 0 : minArabicLen,
          maxArabicLen: maxArabicLen === -Infinity ? 0 : maxArabicLen,
          avgArabicLen: parseFloat(avgArabicLen)
        }
      };

      results.push(info);
      console.log(`✅ ${hadiths.length} hadiths, ${chapters.length} chapters, ${info.sizeMB} MB`);
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({
        id: book.id,
        fileName: book.fileName,
        error: err.message
      });
    }
  }

  const summary = {
    totalCollections: results.length,
    totalHadiths,
    totalRawSizeBytes,
    totalRawSizeMB: (totalRawSizeBytes / (1024 * 1024)).toFixed(2),
    books: results
  };

  fs.writeFileSync(
    path.join(process.cwd(), '.agents', 'm1_exp1', 'hadith_collections_survey.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  console.log('\n======================================================');
  console.log(`Total Hadith Collections Analyzed: ${results.length}`);
  console.log(`Total Hadiths Count: ${totalHadiths.toLocaleString()}`);
  console.log(`Total Raw Size: ${(totalRawSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Results saved to .agents/m1_exp1/hadith_collections_survey.json`);
  console.log('======================================================\n');
}

run().catch(console.error);
