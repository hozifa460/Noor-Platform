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

async function runDeepAnalysis() {
  const report = {
    catalogDifferences: [],
    chapterIntegrity: [],
    idIntegrity: [],
    gradesAnalysis: [],
    isnadPatterns: [],
    sizeProjections: {},
    matnExtractionSamples: []
  };

  console.log('Fetching all 17 books once into memory...');
  const booksData = [];
  for (const book of HADITH_BOOKS_LIST) {
    process.stdout.write(`Fetching ${book.id}... `);
    const data = await fetchBook(book.fileName);
    booksData.push({ book, data });
    console.log('done.');
  }

  console.log('\nAnalyzing catalog, chapter integrity, ID integrity, grades, and isnad patterns...');

  for (let bIdx = 0; bIdx < booksData.length; bIdx++) {
    const { book, data } = booksData[bIdx];
    const hadiths = data.hadiths || [];
    const chapters = data.chapters || [];

    // 1. Catalog differences
    if (book.hadithCount !== hadiths.length) {
      report.catalogDifferences.push({
        id: book.id,
        nameAr: book.nameAr,
        catalogCount: book.hadithCount,
        actualCount: hadiths.length,
        diff: hadiths.length - book.hadithCount
      });
    }

    // 2. Chapter integrity
    const chapterIdSet = new Set(chapters.map((c) => c.id));
    let unmappedChapterHadiths = 0;
    const missingChapterIds = [];
    for (const h of hadiths) {
      if (!chapterIdSet.has(h.chapterId)) {
        unmappedChapterHadiths++;
        if (!missingChapterIds.includes(h.chapterId)) missingChapterIds.push(h.chapterId);
      }
    }
    report.chapterIntegrity.push({
      id: book.id,
      totalChapters: chapters.length,
      chapterIdRange: chapterIdSet.size > 0 ? [Math.min(...chapterIdSet), Math.max(...chapterIdSet)] : [],
      unmappedChapterHadiths,
      missingChapterIds
    });

    // 3. ID integrity
    const idSet = new Set();
    const idInBookSet = new Set();
    let duplicateIds = 0;
    let duplicateIdInBooks = 0;
    for (const h of hadiths) {
      if (idSet.has(h.id)) duplicateIds++;
      idSet.add(h.id);
      if (idInBookSet.has(h.idInBook)) duplicateIdInBooks++;
      idInBookSet.add(h.idInBook);
    }
    report.idIntegrity.push({
      id: book.id,
      duplicateIds,
      duplicateIdInBooks,
      idRange: [Math.min(...idSet), Math.max(...idSet)],
      idInBookRange: [Math.min(...idInBookSet), Math.max(...idInBookSet)]
    });

    // 4. Grades analysis
    let hasAnyGradeField = false;
    for (const h of hadiths) {
      if (h.grade || h.grades || h.gradeInfo || h.status) {
        hasAnyGradeField = true;
        break;
      }
    }
    report.gradesAnalysis.push({
      id: book.id,
      hasGradesInRawJson: hasAnyGradeField
    });

    // 5. Isnad analysis
    let startsWithHaddathana = 0;
    let startsWithAkhbarana = 0;
    let startsWithAn = 0;
    let startsWithQala = 0;
    let otherStart = 0;

    for (const h of hadiths) {
      const norm = normalizeArabic(h.arabic || '').trim();
      if (norm.startsWith('حدثنا')) startsWithHaddathana++;
      else if (norm.startsWith('اخبرنا')) startsWithAkhbarana++;
      else if (norm.startsWith('عن')) startsWithAn++;
      else if (norm.startsWith('قال')) startsWithQala++;
      else otherStart++;
    }

    report.isnadPatterns.push({
      id: book.id,
      total: hadiths.length,
      startsWithHaddathana,
      startsWithAkhbarana,
      startsWithAn,
      startsWithQala,
      otherStart,
      isnadBoilerplatePct: (
        ((startsWithHaddathana + startsWithAkhbarana + startsWithAn + startsWithQala) / hadiths.length) *
        100
      ).toFixed(1) + '%'
    });

    // Matn sample
    if (hadiths[0]) {
      report.matnExtractionSamples.push({
        bookId: book.id,
        originalArabic: hadiths[0].arabic.slice(0, 150),
        normalized: normalizeArabic(hadiths[0].arabic).slice(0, 150)
      });
    }
  }

  // 6. Size projections
  console.log('Calculating size projections in memory...');
  const booksList = HADITH_BOOKS_LIST.map((b) => b.id);
  const gradesList = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];

  // Normalized text lengths:
  for (const textLen of [25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 100, 150, 200, 450]) {
    const items = [];
    for (let bIdx = 0; bIdx < booksData.length; bIdx++) {
      const { book, data } = booksData[bIdx];
      const hadiths = data.hadiths || [];

      for (const h of hadiths) {
        const norm = normalizeArabic(h.arabic || '').replace(/\s+/g, ' ').trim();
        let gradeIdx = (book.id === 'bukhari' || book.id === 'muslim' || book.id === 'nawawi40' || book.id === 'riyad_assalihin') ? 0 : 4;
        items.push([bIdx, h.idInBook, h.chapterId || 0, norm.slice(0, textLen), gradeIdx]);
      }
    }
    const payload = { books: booksList, grades: gradesList, items };
    const jsonStr = JSON.stringify(payload);
    const bytes = Buffer.byteLength(jsonStr, 'utf-8');
    report.sizeProjections[`tuple_textLen_${textLen}`] = {
      bytes,
      mb: (bytes / (1024 * 1024)).toFixed(3),
      under3MB: bytes < 3000000,
      under2MB: bytes < 2000000,
      under1_5MB: bytes < 1500000
    };
  }

  // Also test object schema {b, i, c, t, g} for comparison
  for (const textLen of [40, 50, 450]) {
    const items = [];
    for (let bIdx = 0; bIdx < booksData.length; bIdx++) {
      const { book, data } = booksData[bIdx];
      const hadiths = data.hadiths || [];

      for (const h of hadiths) {
        const norm = normalizeArabic(h.arabic || '').replace(/\s+/g, ' ').trim();
        const g = (book.id === 'bukhari' || book.id === 'muslim' || book.id === 'nawawi40' || book.id === 'riyad_assalihin') ? 'صحيح' : 'مقبول';
        items.push({
          b: book.id,
          i: h.idInBook,
          c: h.chapterId || 0,
          t: norm.slice(0, textLen),
          g
        });
      }
    }
    const jsonStr = JSON.stringify(items);
    const bytes = Buffer.byteLength(jsonStr, 'utf-8');
    report.sizeProjections[`legacy_object_textLen_${textLen}`] = {
      bytes,
      mb: (bytes / (1024 * 1024)).toFixed(3),
      under3MB: bytes < 3000000
    };
  }

  fs.writeFileSync(
    path.join(process.cwd(), '.agents', 'm1_exp1', 'deep_analysis_report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('\nDeep analysis completed successfully! Saved to deep_analysis_report.json');
}

runDeepAnalysis().catch(console.error);
