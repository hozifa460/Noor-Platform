import fs from 'node:fs';

const p = 'public/data/hadith/hadiths_micro_index.json';
const data = JSON.parse(fs.readFileSync(p, 'utf-8'));

const bookOrder = [
  'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah',
  'malik', 'ahmed', 'darimi', 'riyad_assalihin', 'bulugh_almaram',
  'aladab_almufrad', 'shamail_muhammadiyah', 'mishkat_almasabih',
  'nawawi40', 'qudsi40', 'shahwaliullah40'
];
const bookMap = {};
bookOrder.forEach((b, idx) => { bookMap[b] = idx; });

const gradeOrder = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];
const gradeMap = {
  'صحيح': 0,
  'حسن': 1,
  'ضعيف': 2,
  'موضوع': 3,
  'مقبول': 4
};

let bookIdxBytes = 0;
let hadithIdBytes = 0;
let chapterIdBytes = 0;
let gradeIdxBytes = 0;
let structuralDelimBytes = 0; // [ , , , "" , ] ,

data.forEach((item, idx) => {
  const bIdx = bookMap[item.b] ?? 0;
  const hId = item.i ?? 0;
  const cId = item.c ?? 0;
  const gIdx = gradeMap[item.g] ?? 4;

  bookIdxBytes += String(bIdx).length;
  hadithIdBytes += String(hId).length;
  chapterIdBytes += String(cId).length;
  gradeIdxBytes += String(gIdx).length;
  // Delimiters per item: [ , , , "" , ]
  // [ (1) + , (1) + , (1) + , (1) + " (1) + " (1) + , (1) + ] (1) = 8 bytes
  // If not the last item, trailing comma ',' (1 byte)
  structuralDelimBytes += (idx < data.length - 1) ? 9 : 8;
});

const totalFixedMetadataBytes = bookIdxBytes + hadithIdBytes + chapterIdBytes + gradeIdxBytes + structuralDelimBytes;

// Header size: {"books":[...],"grades":[...],"items":[]}
const headerObj = {
  books: bookOrder,
  grades: gradeOrder,
  items: []
};
const headerTemplate = JSON.stringify(headerObj); // '{"books":[...],"grades":[...],"items":[]}'
const headerPrefixBytes = Buffer.byteLength('{"books":' + JSON.stringify(bookOrder) + ',"grades":' + JSON.stringify(gradeOrder) + ',"items":[', 'utf-8');
const headerSuffixBytes = 2; // ']}'

const totalHeaderBytes = headerPrefixBytes + headerSuffixBytes;
const totalOverheadWithoutText = totalFixedMetadataBytes + totalHeaderBytes;

console.log('=== Exact Byte Budget Breakdown for 50,884 Items ===\n');
console.log(`Total Hadith Records: ${data.length.toLocaleString()}`);
console.log(`- bookIdx bytes:       ${bookIdxBytes.toLocaleString()} B (${(bookIdxBytes / data.length).toFixed(2)} B/item)`);
console.log(`- hadithId bytes:      ${hadithIdBytes.toLocaleString()} B (${(hadithIdBytes / data.length).toFixed(2)} B/item)`);
console.log(`- chapterId bytes:     ${chapterIdBytes.toLocaleString()} B (${(chapterIdBytes / data.length).toFixed(2)} B/item)`);
console.log(`- gradeIdx bytes:      ${gradeIdxBytes.toLocaleString()} B (${(gradeIdxBytes / data.length).toFixed(2)} B/item)`);
console.log(`- JSON delimiters:     ${structuralDelimBytes.toLocaleString()} B (${(structuralDelimBytes / data.length).toFixed(2)} B/item)`);
console.log(`- Outer header/footer: ${totalHeaderBytes.toLocaleString()} B`);
console.log('--------------------------------------------------');
console.log(`Total Fixed Metadata & Syntax: ${totalOverheadWithoutText.toLocaleString()} B (${(totalOverheadWithoutText / 1024 / 1024).toFixed(3)} MB, avg ${(totalOverheadWithoutText / data.length).toFixed(2)} B/item)\n`);

const MAX_TARGET_BYTES = 3000000; // 3 MB strict limit
const IDEAL_TARGET_BYTES = 2500000; // 2.5 MB ideal target
const LOW_TARGET_BYTES = 2000000; // 2.0 MB low target

const remainingFor3MB = MAX_TARGET_BYTES - totalOverheadWithoutText;
const remainingFor2_5MB = IDEAL_TARGET_BYTES - totalOverheadWithoutText;
const remainingFor2MB = LOW_TARGET_BYTES - totalOverheadWithoutText;

console.log(`Remaining Budget for textPreview strings:`);
console.log(`- For 3.00 MB limit (3,000,000 B): ${remainingFor3MB.toLocaleString()} B total -> ${(remainingFor3MB / data.length).toFixed(2)} B/item (~${(remainingFor3MB / data.length / 1.85).toFixed(1)} Arabic chars)`);
console.log(`- For 2.50 MB target (2,500,000 B): ${remainingFor2_5MB.toLocaleString()} B total -> ${(remainingFor2_5MB / data.length).toFixed(2)} B/item (~${(remainingFor2_5MB / data.length / 1.85).toFixed(1)} Arabic chars)`);
console.log(`- For 2.00 MB target (2,000,000 B): ${remainingFor2_5MB.toLocaleString()} B total -> ${(remainingFor2MB / data.length).toFixed(2)} B/item (~${(remainingFor2MB / data.length / 1.85).toFixed(1)} Arabic chars)`);
