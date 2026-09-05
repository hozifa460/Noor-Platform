import fs from 'fs';
import path from 'path';

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts', 'quran');
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

const FONTS = [
  {
    name: 'amiri_quran.ttf',
    url: 'https://fonts.gstatic.com/s/amiriquran/v19/_Xmo-Hk0rD6DbUL4_vH8Zq5t.ttf',
  },
  {
    name: 'scheherazade_new.ttf',
    url: 'https://fonts.gstatic.com/s/scheherazadenew/v21/4UaZrFhTvxVnHDvUkUiHg8jprP4DCwM.ttf',
  },
  {
    name: 'scheherazade_bold.ttf',
    url: 'https://fonts.gstatic.com/s/scheherazadenew/v21/4UaerFhTvxVnHDvUkUiHg8jprP4DM79DHlY.ttf',
  },
];

async function downloadAll() {
  console.log('🕌 Downloading Authentic Quranic Calligraphy Fonts...');
  for (const f of FONTS) {
    const dest = path.join(FONTS_DIR, f.name);
    console.log(`Downloading ${f.name}...`);
    const res = await fetch(f.url);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(dest, buf);
      console.log(`✅ Saved ${f.name} (${(buf.length / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`❌ Failed ${f.name}: HTTP ${res.status}`);
    }
  }
  console.log('🎉 Quranic Fonts successfully cached locally in public/fonts/quran/!');
}

downloadAll();
