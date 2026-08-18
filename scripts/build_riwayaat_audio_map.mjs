import fs from 'fs';
import path from 'path';

const reciters = JSON.parse(fs.readFileSync('public/data/quran/mp3quran_reciters.json', 'utf8'));

// Map our Qira'ah IDs to MP3Quran reciters
const RIWAYAH_MATCHERS = [
  { id: 'hafs', name: 'حفص عن عاصم', keywords: ['حفص عن عاصم'] },
  { id: 'warsh', name: 'ورش عن نافع', keywords: ['ورش عن نافع', 'الأزرق', 'الأصبهاني'] },
  { id: 'qaloon', name: 'قالون عن نافع', keywords: ['قالون عن نافع', 'أبي نشيط'] },
  { id: 'shoaba', name: 'شعبة عن عاصم', keywords: ['شعبة', 'شعبة  عن عاصم'] },
  { id: 'alsosi', name: 'السوسي عن أبي عمرو', keywords: ['السوسي'] },
  { id: 'aldori-alkesaei', name: 'الدوري عن الكسائي', keywords: ['الدوري عن الكسائي'] },
  { id: 'aldori-abu-amr', name: 'الدوري عن أبي عمرو', keywords: ['الدوري عن أبي عمرو'] },
  { id: 'bizey', name: 'البزي عن ابن كثير', keywords: ['البزي', 'البزي وقنبل'] },
  { id: 'qunble', name: 'قنبل عن ابن كثير', keywords: ['قنبل', 'البزي وقنبل'] },
  { id: 'khalaf', name: 'خلف عن حمزة', keywords: ['خلف عن حمزة'] },
  { id: 'khalad', name: 'خلاد عن حمزة', keywords: ['خلاد عن حمزة', 'حمزة'] },
  { id: 'hisham', name: 'هشام عن ابن عامر', keywords: ['هشام'] },
  { id: 'ibn-zakwan', name: 'ابن ذكوان عن ابن عامر', keywords: ['ابن ذكوان'] },
  { id: 'ibn-wardan', name: 'ابن وردان عن أبي جعفر', keywords: ['ابن وردان', 'أبي جعفر'] },
  { id: 'ibn-jammaz', name: 'ابن جماز عن أبي جعفر', keywords: ['ابن جماز'] },
  { id: 'roways', name: 'رويس عن يعقوب', keywords: ['رويس', 'يعقوب'] },
  { id: 'roh', name: 'روح عن يعقوب', keywords: ['روح', 'يعقوب'] },
];

const riwayaatCatalog = {};

for (const riw of RIWAYAH_MATCHERS) {
  riwayaatCatalog[riw.id] = [];

  for (const r of reciters) {
    for (const m of r.moshaf) {
      const match = riw.keywords.some((k) => m.name.includes(k));
      if (match) {
        riwayaatCatalog[riw.id].push({
          reciterId: r.id,
          reciterName: r.name,
          moshafId: m.id,
          moshafName: m.name,
          server: m.server,
          surahTotal: m.surahTotal,
          surahList: m.surahList,
        });
      }
    }
  }

  console.log(`✅ ${riw.name} (${riw.id}): ${riwayaatCatalog[riw.id].length} reciters found`);
}

const outputPath = path.join(process.cwd(), 'public', 'data', 'quran', 'riwayaat_reciters_map.json');
fs.writeFileSync(outputPath, JSON.stringify(riwayaatCatalog, null, 2), 'utf8');
console.log(`🎉 Saved complete Riwayaat Reciters Catalog to ${outputPath}!`);
