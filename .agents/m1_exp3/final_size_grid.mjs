import fs from 'node:fs';
import { normalizeArabic } from '../../src/lib/arabic-normalizer.ts';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

const CONTROL_MARKS_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF\uFFF0-\uFFFF\u00AD\u061C]/g;
const EXTRA_PUNCTUATION_REGEX = /[«»“”"''`~@#$%^&*()_+=\[\]{}|\\:;?/><.,،؛ـ]/g;

function cleanArabicText(text) {
  if (!text) return '';
  return normalizeArabic(text)
    .replace(CONTROL_MARKS_REGEX, '')
    .replace(EXTRA_PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ISNAD_PATTERNS = [
  /صلي الله عليه وسلم (?:يقول|قال|قالت|انه قال|انها قالت|فقال|انه|ان)\s*:?\s*(.*)/i,
  /عن النبي صلي الله عليه وسلم (?:قال|انه قال|يقول)\s*:?\s*(.*)/i,
  /سمعت رسول الله صلي الله عليه وسلم (?:يقول|قال)\s*:?\s*(.*)/i,
  /قال رسول الله صلي الله عليه وسلم\s*:?\s*(.*)/i,
  /رسول الله صلي الله عليه وسلم\s*:?\s*(.*)/i,
  /عن [^:]+? قال\s*:?\s*(.*)/i,
];

function extractMatn(text) {
  if (!text) return '';
  const cleaned = cleanArabicText(text);
  for (const pat of ISNAD_PATTERNS) {
    const match = cleaned.match(pat);
    if (match && match[1] && match[1].trim().length >= 10) {
      return match[1].trim();
    }
  }
  return cleaned;
}

const bookOrder = [
  'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah',
  'malik', 'ahmed', 'darimi', 'riyad_assalihin', 'bulugh_almaram',
  'aladab_almufrad', 'shamail_muhammadiyah', 'mishkat_almasabih',
  'nawawi40', 'qudsi40', 'shahwaliullah40'
];
const bookMap = {};
bookOrder.forEach((b, idx) => { bookMap[b] = idx; });

const gradeOrder = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];
const gradeMap = { 'صحيح': 0, 'حسن': 1, 'ضعيف': 2, 'موضوع': 3, 'مقبول': 4 };

console.log('=== Final Architecture Size Grid (Cleaned Matn + Tuple Schema) ===\n');

const testConfigs = [
  { name: '12 chars prefix', fn: (m) => m.slice(0, 12).trim() },
  { name: '15 chars prefix', fn: (m) => m.slice(0, 15).trim() },
  { name: '18 chars prefix', fn: (m) => m.slice(0, 18).trim() },
  { name: '20 chars prefix', fn: (m) => m.slice(0, 20).trim() },
  { name: '22 chars prefix', fn: (m) => m.slice(0, 22).trim() },
  { name: '24 chars prefix', fn: (m) => m.slice(0, 24).trim() },
  { name: '3 words (unconstrained)', fn: (m) => m.split(/\s+/).slice(0, 3).join(' ') },
  { name: '4 words (unconstrained)', fn: (m) => m.split(/\s+/).slice(0, 4).join(' ') },
  { name: '4 words (capped at 20 chars)', fn: (m) => m.split(/\s+/).slice(0, 4).join(' ').slice(0, 20).trim() },
  { name: '4 words (capped at 22 chars)', fn: (m) => m.split(/\s+/).slice(0, 4).join(' ').slice(0, 22).trim() },
  { name: '5 words (capped at 20 chars)', fn: (m) => m.split(/\s+/).slice(0, 5).join(' ').slice(0, 20).trim() },
  { name: '5 words (capped at 22 chars)', fn: (m) => m.split(/\s+/).slice(0, 5).join(' ').slice(0, 22).trim() },
];

for (const cfg of testConfigs) {
  const items = data.map(item => {
    const matn = extractMatn(item.t);
    const snippet = cfg.fn(matn);
    return [
      bookMap[item.b] ?? 0,
      item.i,
      item.c,
      snippet,
      gradeMap[item.g || 'مقبول'] ?? 4
    ];
  });

  const payload = { books: bookOrder, grades: gradeOrder, items };
  const json = JSON.stringify(payload);
  const bytes = Buffer.byteLength(json, 'utf-8');
  const mb = (bytes / (1024 * 1024)).toFixed(3);
  const headroomKB = ((3000000 - bytes) / 1024).toFixed(1);
  const status = bytes < 3000000 ? '✅ STRICT PASS' : '❌ OVER LIMIT';

  console.log(`${cfg.name.padEnd(32)} | ${bytes.toLocaleString().padStart(9)} B | ${mb} MB | Headroom: ${headroomKB.padStart(7)} KB | ${status}`);
}
