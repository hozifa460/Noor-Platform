import fs from 'fs';
import path from 'path';

const TRANSLATIONS_DIR = path.join(process.cwd(), 'public', 'data', 'quran', 'translations');
if (!fs.existsSync(TRANSLATIONS_DIR)) {
  fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
}

const HF_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/quran_tafsir_multilingual';

const TRANSLATION_FILES = [
  { code: 'en-saheeh', file: 'quran_en_english_saheeh.json' },
  { code: 'fr-montada', file: 'quran_fr_french_montada.json' },
  { code: 'ur-junagarhi', file: 'quran_ur_urdu_junagarhi.json' },
  { code: 'es-garcia', file: 'quran_es_spanish_garcia.json' },
  { code: 'de-bubenheim', file: 'quran_de_german_bubenheim.json' },
  { code: 'tr-rwwad', file: 'quran_tr_turkish_rwwad.json' },
  { code: 'id-affairs', file: 'quran_id_indonesian_affairs.json' },
  { code: 'zh-makin', file: 'quran_zh_chinese_makin.json' },
  { code: 'ru-kuliev', file: 'islamhouse_quran_ru.json' },
];

async function downloadTranslations() {
  console.log('🌍 Downloading Top 9 World Quran Translations from Hugging Face...');
  for (const item of TRANSLATION_FILES) {
    const dest = path.join(TRANSLATIONS_DIR, `${item.code}.json`);
    console.log(`Fetching ${item.code} (${item.file})...`);
    try {
      const res = await fetch(`${HF_BASE}/${item.file}`);
      if (res.ok) {
        const data = await res.json();
        fs.writeFileSync(dest, JSON.stringify(data), 'utf8');
        console.log(`✅ Saved ${item.code}.json`);
      } else {
        console.warn(`⚠️ Failed ${item.code}: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`⚠️ Error ${item.code}:`, err.message);
    }
  }
  console.log('🎉 All Multilingual Translations successfully cached locally!');
}

downloadTranslations();
