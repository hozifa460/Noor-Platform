import fs from 'fs';
import path from 'path';

const QURAN_DIR = path.join(process.cwd(), 'public', 'data', 'quran');
if (!fs.existsSync(QURAN_DIR)) {
  fs.mkdirSync(QURAN_DIR, { recursive: true });
}

async function fetchAndCacheReciters() {
  console.log('🎙️ Fetching 240+ Quran Reciters from MP3Quran API v3...');
  try {
    const res = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    console.log(`✅ Received ${data.reciters.length} reciters. Processing metadata...`);
    
    const reciters = data.reciters.map((r) => ({
      id: r.id,
      name: r.name,
      letter: r.letter,
      moshaf: (r.moshaf || []).map((m) => ({
        id: m.id,
        name: m.name,
        server: m.server.endsWith('/') ? m.server : `${m.server}/`,
        surahTotal: m.surah_total,
        surahList: (m.surah_list || '').split(',').map((s) => Number(s.trim())).filter(Boolean),
      })),
    }));

    const outputPath = path.join(QURAN_DIR, 'mp3quran_reciters.json');
    fs.writeFileSync(outputPath, JSON.stringify(reciters, null, 2), 'utf8');
    console.log(`🎉 Saved ${reciters.length} reciters to public/data/quran/mp3quran_reciters.json!`);
  } catch (err) {
    console.error('❌ Failed to fetch MP3Quran reciters:', err.message);
  }
}

fetchAndCacheReciters();
