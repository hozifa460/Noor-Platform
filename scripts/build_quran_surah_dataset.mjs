import fs from 'fs';
import path from 'path';

const QURAN_DIR = path.join(process.cwd(), 'public', 'data', 'quran');
const SURAHS_DIR = path.join(QURAN_DIR, 'surahs');

if (!fs.existsSync(SURAHS_DIR)) {
  fs.mkdirSync(SURAHS_DIR, { recursive: true });
}

const QURAN_URL = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/quranset/quran_dataset.json';

async function buildQuranDataset() {
  console.log('📖 Downloading Full Holy Quran Dataset from Hugging Face...');
  const res = await fetch(QURAN_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch quran dataset: HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log(`📦 Loaded ${data.length} total Ayahs. Partitioning into 114 Surahs...`);

  // Group by surah_no
  const surahsMap = new Map();

  for (const item of data) {
    const sNo = item.surah_no;
    if (!surahsMap.has(sNo)) {
      surahsMap.set(sNo, {
        surahNo: sNo,
        nameAr: item.surah_name_ar,
        nameEn: item.surah_name_en,
        nameRoman: item.surah_name_roman,
        placeOfRevelation: item.place_of_revelation,
        totalAyahs: item.total_ayah_surah,
        ayahs: [],
      });
    }

    const surah = surahsMap.get(sNo);
    surah.ayahs.push({
      ayahNo: item.ayah_no_surah,
      ayahNoQuran: item.ayah_no_quran,
      textAr: item.ayah_ar,
      textEn: item.ayah_en,
      juz: item.juz_no,
      manzil: item.manzil_no,
      ruku: item.ruko_no,
      hizbQuarter: item.hizb_quarter,
      isSajdah: Boolean(item.sajah_ayah && item.sajah_ayah !== false && item.sajah_ayah !== 'false'),
    });
  }

  // Write 114 Surah JSON files
  for (const [sNo, surah] of surahsMap.entries()) {
    const filePath = path.join(SURAHS_DIR, `${sNo}.json`);
    fs.writeFileSync(filePath, JSON.stringify(surah), 'utf8');
  }

  console.log(`🎉 Successfully created 114 Surah JSON files in public/data/quran/surahs/!`);
}

buildQuranDataset().catch(console.error);
