import fs from 'node:fs';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

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
  let matn = text;
  for (const pat of ISNAD_PATTERNS) {
    const match = text.match(pat);
    if (match && match[1] && match[1].trim().length >= 10) {
      matn = match[1].trim();
      break;
    }
  }
  return matn;
}

const bookOrder = [
  'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah',
  'malik', 'ahmed', 'darimi', 'riyad_assalihin', 'bulugh_almaram',
  'aladab_almufrad', 'shamail_muhammadiyah', 'mishkat_almasabih',
  'nawawi40', 'qudsi40', 'shahwaliullah40'
];
const bookMap = {};
bookOrder.forEach((b, idx) => { bookMap[b] = idx; });

const gradeMap = { 'صحيح': 0, 'حسن': 1, 'ضعيف': 2, 'موضوع': 3, 'مقبول': 4 };

const strategies = [
  {
    name: '1. Fixed Char Limit 18',
    fn: (matn) => matn.slice(0, 18).trim()
  },
  {
    name: '2. Fixed Char Limit 20',
    fn: (matn) => matn.slice(0, 20).trim()
  },
  {
    name: '3. Fixed Char Limit 22',
    fn: (matn) => matn.slice(0, 22).trim()
  },
  {
    name: '4. Word Limit 3 words',
    fn: (matn) => matn.split(/\s+/).slice(0, 3).join(' ')
  },
  {
    name: '5. Word Limit 4 words',
    fn: (matn) => matn.split(/\s+/).slice(0, 4).join(' ')
  },
  {
    name: '6. Word Limit 4 words capped at 22 chars',
    fn: (matn) => matn.split(/\s+/).slice(0, 4).join(' ').slice(0, 22).trim()
  },
  {
    name: '7. Word Limit 4 words capped at 20 chars',
    fn: (matn) => matn.split(/\s+/).slice(0, 4).join(' ').slice(0, 20).trim()
  },
  {
    name: '8. Word Limit 5 words capped at 22 chars',
    fn: (matn) => matn.split(/\s+/).slice(0, 5).join(' ').slice(0, 22).trim()
  }
];

console.log('=== Strategy Comparison: Size & Safety Headroom ===\n');

for (const strat of strategies) {
  const items = data.map(item => {
    const matn = extractMatn(item.t);
    const textPreview = strat.fn(matn);
    return [
      bookMap[item.b],
      item.i,
      item.c,
      textPreview,
      gradeMap[item.g || 'مقبول']
    ];
  });

  const payload = { books: bookOrder, grades: ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'], items };
  const json = JSON.stringify(payload);
  const bytes = Buffer.byteLength(json, 'utf-8');
  const mb = (bytes / (1024 * 1024)).toFixed(3);
  const headroom = 3000000 - bytes;
  const headroomKB = (headroom / 1024).toFixed(1);
  const pass = bytes < 3000000;

  console.log(`${strat.name.padEnd(42)} | ${bytes.toLocaleString().padStart(9)} B | ${mb} MB | Headroom: ${headroomKB.padStart(6)} KB | ${pass ? '✅ SAFE' : '❌ OVER'}`);
}
