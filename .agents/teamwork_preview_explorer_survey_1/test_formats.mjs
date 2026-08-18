import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';

const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
const bookMap = Object.fromEntries(HADITH_BOOKS_LIST.map((b, i) => [b.id, i]));
const gradeMap = { 'صحيح': 0, 'حسن': 1, 'ضعيف': 2, 'موضوع': 3, 'مقبول': 4 };

// Format 1: [bookIdx, hadithId, chapterId, textPreview, gradeCode]
const f1 = raw.map(h => [bookMap[h.b] ?? 0, h.i, h.c, (h.t || '').slice(0, 24), gradeMap[h.g] ?? 0]);
const s1 = (Buffer.byteLength(JSON.stringify(f1), 'utf8') / (1024 * 1024)).toFixed(2);
console.log(`Format 1 [bIdx, hid, cid, text(24), gCode]: ${s1} MB`);

// Format 2: [bookIdStr, hadithId, chapterId, textPreview, gradeStr]
const f2 = raw.map(h => [h.b, h.i, h.c, (h.t || '').slice(0, 24), h.g]);
const s2 = (Buffer.byteLength(JSON.stringify(f2), 'utf8') / (1024 * 1024)).toFixed(2);
console.log(`Format 2 [bStr, hid, cid, text(24), gStr]: ${s2} MB`);

// Format 3: Object with books header + items
const f3 = {
  books: HADITH_BOOKS_LIST.map(b => b.id),
  grades: ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'],
  items: f1
};
const s3 = (Buffer.byteLength(JSON.stringify(f3), 'utf8') / (1024 * 1024)).toFixed(2);
console.log(`Format 3 { books, grades, items: [[...]] } (24 chars): ${s3} MB`);
