import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

async function survey() {
  console.log('--- SURVEYING ALL 17 HADITH BOOKS ---');
  const results = [];

  for (const b of HADITH_BOOKS_LIST) {
    const url = `${HF_SUNNAH_BASE}/All_hadith_books/${b.fileName}`;
    const start = Date.now();
    try {
      const res = await fetch(url);
      const text = await res.text();
      const fetchTime = Date.now() - start;
      const sizeBytes = Buffer.byteLength(text, 'utf-8');
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      
      const json = JSON.parse(text);
      const hadithCount = json.hadiths ? json.hadiths.length : 0;
      const chapterCount = json.chapters ? json.chapters.length : 0;
      const meta = json.metadata || {};
      
      // Sample first hadith to inspect schema
      const sample = json.hadiths && json.hadiths.length > 0 ? json.hadiths[0] : null;
      const sampleFields = sample ? Object.keys(sample) : [];
      const hasEnglish = sample && Boolean(sample.english);
      const hasArabic = sample && Boolean(sample.arabic);
      const hasChapterId = sample && ('chapterId' in sample);
      const hasIdInBook = sample && ('idInBook' in sample);

      results.push({
        id: b.id,
        nameAr: b.nameAr,
        nameEn: b.nameEn,
        fileName: b.fileName,
        catalogCount: b.hadithCount,
        actualCount: hadithCount,
        chapterCount,
        sizeBytes,
        sizeMB,
        fetchTimeMs: fetchTime,
        sampleFields,
        hasEnglish,
        hasArabic,
        hasChapterId,
        hasIdInBook,
        metadataTitle: meta.arabic ? meta.arabic.title : undefined,
      });

      console.log(`[OK] ${b.id.padEnd(23)} | Actual Hadiths: ${String(hadithCount).padStart(5)} | Chapters: ${String(chapterCount).padStart(3)} | Size: ${sizeMB.padStart(6)} MB`);
    } catch (e) {
      console.error(`[FAIL] ${b.id}: ${e.message}`);
      results.push({
        id: b.id,
        nameAr: b.nameAr,
        fileName: b.fileName,
        error: e.message,
      });
    }
  }

  // Also check HadeethEnc Sharh
  console.log('\n--- Checking HadeethEnc Sharh Dataset ---');
  try {
    const sharhUrl = `${HF_SUNNAH_BASE}/HadeethEnc_Sharh/hadeethenc_sharh.json`;
    const res = await fetch(sharhUrl);
    const sharhText = await res.text();
    const sharhSizeMB = (Buffer.byteLength(sharhText, 'utf-8') / (1024 * 1024)).toFixed(2);
    const sharhJson = JSON.parse(sharhText);
    console.log(`HadeethEnc Sharh: ${sharhJson.length} explanations, ${sharhSizeMB} MB`);
  } catch (e) {
    console.error('HadeethEnc Sharh error:', e.message);
  }

  fs.writeFileSync(
    path.join(process.cwd(), '.agents', 'teamwork_preview_explorer_survey_1', 'survey_results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log('\nSaved survey results to survey_results.json');
}

survey().catch(console.error);
