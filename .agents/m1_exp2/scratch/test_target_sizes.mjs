import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../../src/lib/hadith-data.ts';

const HF_SUNNAH_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

function normalizeArabicText(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/\uFDFA/g, ' صلى الله عليه وسلم ')
    .replace(/\uFDFB/g, ' جل جلاله ')
    .replace(/\uFDFD/g, ' بسم الله الرحمن الرحيم ')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '')
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'«»“”‏]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractHadithMatn(rawArabic) {
  if (!rawArabic) return '';
  const norm = normalizeArabicText(rawArabic);
  if (norm.length <= 60) return norm;

  let cleaned = norm.replace(
    /\s*(?:رواه|اخرجه|خرجه|متفق عليه|قال الترمذي|قال ابو داود|قال الشيخ الالباني|صحيح البخاري|صحيح مسلم|في صحيحهما|في سننه|قال ابو عيسي|وفي الباب عن).*$/i,
    ''
  ).trim();
  if (cleaned.length < 20) cleaned = norm;

  const speechTransitions = [
    /(?:قال|يقول|سمعت)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهي|امر|قضي|رخص)\s*[:\s]+(.*)$/,
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
    /سمعت\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|:\s*)?\s*(.*)$/,
  ];

  for (const regex of speechTransitions) {
    const m = cleaned.match(regex);
    if (m && m[1] && m[1].trim().length >= 15) {
      return m[1].trim();
    }
  }

  const narrativeTransitions = [
    /(?:ان\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s+(كان|نهي|امر|قضي|رخص|توضا|صلي|سجد|خطب|بعث|سال|سئل|دخل|خرج|رايته|مر|قدم|اعطي|نزل|صام|حج|افتتح|افتخر|استعاذ|استغفر|علمنا|اخذ|اتي|قام)(.*)$/,
    /كان\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(.*)$/,
    /(?:بينما|بينا)\s+نحن\s+(?:جلوس\s+)?(?:عند\s+|مع\s+)(?:رسول\s+الله|النبي)(.*)$/,
    /(?:سال|جاء|اتي)\s+رجل\s+(?:الي\s+)?(?:رسول\s+الله|النبي)(.*)$/,
    /(?:كنا\s+مع|خرجنا\s+مع|غزونا\s+مع)\s+(?:رسول\s+الله|النبي)(.*)$/,
  ];

  for (const regex of narrativeTransitions) {
    const m = cleaned.match(regex);
    if (m) {
      const extracted = m[0].trim();
      if (extracted.length >= 20) {
        return extracted;
      }
    }
  }

  if (/^(?:حدثنا|حدثني|اخبرنا|اخبرني|انبان|انبانا|عن|روي|وحدثني|وحدثنا)\s+/i.test(cleaned)) {
    const sahabiMatch = cleaned.match(/(?:رضي\s+الله\s+عن[ههمماا]+)\s+(?:قال|قالت|يقول|تقول|ان|انه|انها|:\s*)?\s*(.*)$/);
    if (sahabiMatch && sahabiMatch[1] && sahabiMatch[1].trim().length >= 15) {
      return sahabiMatch[1].trim();
    }

    const words = cleaned.split(/\s+/);
    const maxScan = Math.min(Math.floor(words.length * 0.45), 25);
    let lastQal = -1;
    for (let i = 0; i < maxScan; i++) {
      if (['قال', 'قالت', 'سمعت', 'يقول'].includes(words[i])) {
        lastQal = i;
      }
    }
    if (lastQal > 1 && lastQal < words.length - 4) {
      const candidate = words.slice(lastQal + 1).join(' ');
      if (candidate.length >= 20) {
        return candidate;
      }
    }
  }

  return cleaned;
}

async function testTargetSizes() {
  console.log('Testing exact snippet sizes for < 3MB target...\n');

  const books = HADITH_BOOKS_LIST.map(b => b.id);
  const grades = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];
  const testLengths = [15, 18, 20, 22, 25, 28, 30];
  const itemsByLen = {};
  testLengths.forEach(l => itemsByLen[l] = []);

  for (let bIdx = 0; bIdx < HADITH_BOOKS_LIST.length; bIdx++) {
    const book = HADITH_BOOKS_LIST[bIdx];
    const res = await fetch(`${HF_SUNNAH_BASE}/${book.fileName}`);
    const data = await res.json();
    if (!data || !data.hadiths) continue;

    for (const h of data.hadiths) {
      const matn = extractHadithMatn(h.arabic);
      const gradeIdx = (book.id === 'bukhari' || book.id === 'muslim' || book.id === 'nawawi40') ? 0 : 4;

      for (const len of testLengths) {
        itemsByLen[len].push([
          bIdx,
          h.idInBook,
          h.chapterId,
          matn.slice(0, len),
          gradeIdx
        ]);
      }
    }
  }

  console.log(`\n================ SIZE ANALYSIS (Strict < 3,000,000 bytes) ================`);
  for (const len of testLengths) {
    const payload = { books, grades, items: itemsByLen[len] };
    const jsonStr = JSON.stringify(payload);
    const bytes = Buffer.byteLength(jsonStr, 'utf-8');
    const mb = (bytes / (1024 * 1024)).toFixed(3);
    const pass = bytes < 3000000 ? '✅ UNDER 3MB' : '❌ OVER 3MB';
    console.log(`Len = ${len.toString().padStart(2, ' ')} chars | Bytes: ${bytes.toLocaleString().padStart(9, ' ')} (${mb} MB) -> ${pass}`);
  }
}

testTargetSizes().catch(console.error);
