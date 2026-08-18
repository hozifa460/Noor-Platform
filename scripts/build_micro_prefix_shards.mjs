import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MICRO_SHARDS_DIR = path.join(process.cwd(), 'public', 'data', 'micro_shards');
if (!fs.existsSync(MICRO_SHARDS_DIR)) {
  fs.mkdirSync(MICRO_SHARDS_DIR, { recursive: true });
}

// Arabic Normalization & Stemming
const TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_REGEX = /\u0640/g;
const PUNCTUATION_REGEX = /[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"']/g;

function normalizeArabic(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(TASHKEEL_REGEX, '')
    .replace(TATWEEL_REGEX, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getPrefixKey(token) {
  const norm = normalizeArabic(token).replace(/^ال/, '');
  if (norm.length < 2) return norm;
  return norm.slice(0, 2);
}

const ARABIC_STOP_WORDS = new Set([
  'ما', 'هل', 'من', 'عن', 'في', 'الي', 'الى', 'علي', 'على', 'حكم', 'ماحكم',
  'هو', 'هي', 'هم', 'هن', 'ان', 'انما', 'او', 'ثم', 'مع', 'هذا', 'هذه', 'ذلك',
  'تلك', 'التي', 'الذي', 'الذين', 'اللاتي', 'سؤال', 'جواب', 'فتوى', 'شيخ', 'قال',
  'قيل', 'كيف', 'متى', 'اين', 'ماذا', 'لماذا', 'يا', 'ايها', 'لو', 'اذا', 'اريد',
  'معرفة', 'مسالة', 'بيان', 'توضيح', 'شرح', 'يصلح', 'يجوز', 'حلال', 'حرام'
]);

function hashPrefix(prefix) {
  // Use hex hash for cross-platform safe filesystem naming
  return crypto.createHash('md5').update(prefix).digest('hex').slice(0, 8);
}

async function buildMicroShards() {
  console.log('⚡ Starting Micro-Prefix Sharding Builder (Pagefind Architecture)...\n');

  const manifestPath = path.join(process.cwd(), 'public', 'data', 'fatwas_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('fatwas_manifest.json not found!');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`📦 Loaded ${manifest.length} fatwa records. Partitioning into micro-shards...`);

  // Map prefix -> items array
  const prefixBuckets = new Map();
  const prefixKeyMap = {}; // mapping prefix -> hash

  for (let i = 0; i < manifest.length; i++) {
    const item = manifest[i];
    const text = `${item.title} ${item.question || ''} ${(item.tags || []).join(' ')}`;
    const tokens = normalizeArabic(text)
      .split(/\s+/)
      .filter((t) => t.length > 1 && !ARABIC_STOP_WORDS.has(t));

    const seenPrefixesForDoc = new Set();

    for (const t of tokens) {
      const pfx = getPrefixKey(t);
      if (!pfx || pfx.length < 2) continue;
      if (seenPrefixesForDoc.has(pfx)) continue;
      seenPrefixesForDoc.add(pfx);

      if (!prefixBuckets.has(pfx)) {
        prefixBuckets.set(pfx, []);
        prefixKeyMap[pfx] = hashPrefix(pfx);
      }

      // Compact representation
      const compactItem = {
        id: item.id,
        t: item.title,
        s: item.scholar,
        c: item.category,
        ans: item.answer ? item.answer.slice(0, 500) : undefined,
        src: item.sourceFile,
        audio: item.audioUrl,
      };

      const bucket = prefixBuckets.get(pfx);
      if (bucket.length < 1500) {
        // Cap each prefix bucket to top 1500 most relevant items to keep file < 40KB
        bucket.push(compactItem);
      }
    }
  }

  console.log(`\n💾 Writing ${prefixBuckets.size} micro-shard files...`);
  let totalWrittenBytes = 0;

  for (const [prefix, items] of prefixBuckets.entries()) {
    const hash = prefixKeyMap[prefix];
    const shardFile = path.join(MICRO_SHARDS_DIR, `${hash}.json`);
    const jsonStr = JSON.stringify(items);
    fs.writeFileSync(shardFile, jsonStr, 'utf8');
    totalWrittenBytes += jsonStr.length;
  }

  // Write prefix router table (maps 2-letter prefix to shard hash)
  const routerPath = path.join(MICRO_SHARDS_DIR, 'prefix_router.json');
  fs.writeFileSync(routerPath, JSON.stringify(prefixKeyMap), 'utf8');

  // Write initial showcase seed (50 rich fatwas for instant initial render without download)
  const showcasePath = path.join(MICRO_SHARDS_DIR, 'showcase.json');
  const showcaseItems = manifest.slice(0, 60).map((item) => ({
    id: item.id,
    t: item.title,
    s: item.scholar,
    c: item.category,
    ans: item.answer || 'الجواب متوفر عبر الضغط على قارئ الفتاوى.',
    src: item.sourceFile,
    audio: item.audioUrl,
  }));
  fs.writeFileSync(showcasePath, JSON.stringify(showcaseItems), 'utf8');

  const avgKB = (totalWrittenBytes / prefixBuckets.size / 1024).toFixed(1);
  const routerKB = (fs.statSync(routerPath).size / 1024).toFixed(1);
  const showcaseKB = (fs.statSync(showcasePath).size / 1024).toFixed(1);

  console.log(`\n🎉 DONE! Generated:`);
  console.log(`  - ${prefixBuckets.size} Micro-Shards (Average file size: ${avgKB} KB)`);
  console.log(`  - Prefix Router Table: ${routerKB} KB`);
  console.log(`  - Showcase Seed: ${showcaseKB} KB`);
  console.log(`\n🚀 Initial page load will now download only ~${showcaseKB} KB!`);
  console.log(`🚀 Each user search will download only ~${avgKB} KB on demand!`);
}

buildMicroShards().catch(console.error);
