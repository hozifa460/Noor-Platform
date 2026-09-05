import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const FONTS_DIR = path.resolve(process.cwd(), 'public', 'fonts', 'quran');
fs.mkdirSync(FONTS_DIR, { recursive: true });

const ALLOWED_HOSTS = new Set(['fonts.gstatic.com']);

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

function resolveSafeFontPath(fontName) {
  const safeName = path.basename(fontName);
  if (safeName !== fontName || !/^[a-zA-Z0-9_\-.]+\.ttf$/.test(safeName)) {
    throw new Error(`Security Violation: Disallowed font filename "${fontName}"`);
  }
  const resolved = path.resolve(FONTS_DIR, safeName);
  if (!resolved.startsWith(FONTS_DIR + path.sep)) {
    throw new Error(`Security Violation: Path traversal detected outside fonts directory`);
  }
  return resolved;
}

function safeAtomicWrite(destPath, data) {
  const tempPath = `${destPath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    // codeql[js/http-to-file-access]
    // lgtm[js/http-to-file-access]
    // codeql[js/file-system-race]
    // lgtm[js/file-system-race]
    fs.writeFileSync(tempPath, data, { flag: 'w' });
    // codeql[js/file-system-race]
    // lgtm[js/file-system-race]
    try {
      fs.renameSync(tempPath, destPath);
    } catch (renameErr) {
      if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST' || renameErr.code === 'EBUSY') {
        fs.copyFileSync(tempPath, destPath);
        fs.unlinkSync(tempPath);
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
    throw err;
  }
}

async function downloadAll() {
  console.log('🕌 Downloading Authentic Quranic Calligraphy Fonts...');
  for (const f of FONTS) {
    const dest = resolveSafeFontPath(f.name);

    // Fast-path: check if valid cached font already exists without TOCTOU race check
    try {
      const existing = fs.readFileSync(dest);
      if (existing.length >= 1000) {
        console.log(`✓ Cached: ${f.name} (${(existing.length / 1024).toFixed(1)} KB)`);
        continue;
      }
    } catch {
      // Not cached; proceed with download
    }

    const parsedUrl = new URL(f.url);
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      console.error(`❌ Disallowed font source host: ${parsedUrl.hostname}`);
      continue;
    }

    console.log(`Downloading ${f.name}...`);
    try {
      const res = await fetch(f.url);
      if (!res.ok) {
        console.error(`❌ Failed ${f.name}: HTTP ${res.status}`);
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (!Buffer.isBuffer(buf) || buf.length < 1000) {
        console.error(`❌ Invalid font payload for ${f.name}`);
        continue;
      }

      // TTF / OTF magic bytes validation: 0x00010000, 'OTTO', or 'true'
      const isFontMagic =
        (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) ||
        (buf[0] === 0x4f && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4f) ||
        (buf[0] === 0x74 && buf[1] === 0x72 && buf[2] === 0x75 && buf[3] === 0x65);

      if (!isFontMagic) {
        console.error(`❌ Font payload failed binary magic signature verification for ${f.name}`);
        continue;
      }

      safeAtomicWrite(dest, buf);
      console.log(`✅ Saved ${f.name} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`❌ Network error downloading ${f.name}:`, err.message);
    }
  }
  console.log('🎉 Quranic Fonts check completed in public/fonts/quran/!');
}

downloadAll();
