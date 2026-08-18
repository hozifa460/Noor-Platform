import fs from 'fs';
import path from 'path';

const REPO_BASE = 'https://huggingface.co/datasets/hozifa1/fatawaset/resolve/main';
const SHARDS_DIR = path.join(process.cwd(), 'public', 'data', 'shards');

if (!fs.existsSync(SHARDS_DIR)) {
  fs.mkdirSync(SHARDS_DIR, { recursive: true });
}

// All major datasets from Hugging Face
const TARGET_FILES = [
  'fatawa/fatawa_binbaz.json',
  'fatawa/فتاوى_JSON/فتاوى_الشيخ_صالح_الفوزان.json',
  'fatawa/فتاوى_JSON/فتاوى_الشيخ_محمد_بن_عثيمين.json',
  'fatawa/فتاوى_JSON/فتاوى_دار_الإفتاء_المصرية.json',
  'fatawa/فتاوى_JSON/فتاوى_دار_الإفتاء_الأردنية.json',
  'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_قسم_ابن_باز.json',
  'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_قسم_الفوزان.json',
  'fatawa/fatawa_islamqa1.json',
  'fatawa/nur_ealaa_aldarb1.json',
  'fatawa/nur_ealaa_aldarb2.json',
  'fatawa/nur_ealaa_aldarb3.json',
  'fatawa/fatawaa_aljamie_alkabir.json',
  'fatawa/fatawa_01_1.json',
  'fatawa/fatawa_02_2.json',
  'fatawa/fatawa_Islamic_Q_and_A_1.json',
  'fatawa/fatawa_Islamic_Q_and_A_2.json',
  'fatawa/فتاوى_JSON/فتاوى_إسلام_أونلاين.json',
  'fatawa/فتاوى_JSON/موسوعة_الفتاوى_الجزء_الأول.json',
  'fatawa/فتاوى_JSON/موسوعة_الفتاوى_الجزء_الثاني.json',
];

const CATEGORY_KEYWORDS = {
  salah: ['صلاة', 'طهارة', 'وضوء', 'غسل', 'جماعة', 'سجود', 'جمعة', 'وتر', 'نية', 'مسح', 'خفين', 'جورب', 'قصر', 'طائرة', 'قطار', 'سهو', 'شك', 'جنابة', 'حيض', 'استحاضة', 'قبلة', 'اذان', 'اقامة', 'ركوع', 'تراويح', 'سنة', 'نافلة'],
  zakah: ['صيام', 'رمضان', 'زكاة', 'صدقة', 'حج', 'عمرة', 'ذهب', 'فطر', 'سفر', 'بخاخ', 'ربو', 'قطرة', 'فلوس', 'اسهم', 'اضحية', 'كفارة', 'اعتكاف', 'مناسك', 'طواف', 'سعي', 'احرام', 'عرفة', 'مزدلفة'],
  muamalat: ['بيع', 'ربا', 'قرض', 'تجارة', 'عقد', 'شراء', 'معاملات', 'بنك', 'تقسيط', 'تمويل', 'فوائد', 'مرابحة', 'شقة', 'بيت', 'سيارة', 'بورصة', 'سلفة', 'تأمين', 'احتكار', 'غش', 'عملات', 'بيتكوين', 'ايجار', 'ضمان', 'رهن', 'شركة'],
  aqeedah: ['عقيدة', 'توحيد', 'ايمان', 'شرك', 'بدعة', 'توسل', 'ابراج', 'موسيقى', 'رقية', 'سحر', 'عين', 'حسد', 'تنجيم', 'قدر', 'نفاق', 'رياء', 'وسواس', 'اسماء', 'صفات', 'صحابة', 'كفر', 'ردة', 'بعث'],
  family: ['نكاح', 'زواج', 'طلاق', 'رضاع', 'حضانة', 'نفقة', 'ميراث', 'حجاب', 'نقاب', 'غضب', 'زوجة', 'خلع', 'تركة', 'موت', 'وفاة', 'ولد', 'بنت', 'مهر', 'عقد', 'عدة', 'تعدد', 'ولي', 'وصية', 'والدين'],
  contemporary: ['معاصرة', 'طبية', 'انترنت', 'تقنية', 'تأمين', 'نوازل', 'رقمية', 'بيتكوين', 'تدخين', 'سجائر', 'شيشة', 'فيب', 'دخان', 'تجميل', 'تبرع', 'اعضاء', 'استنساخ', 'اجهاض', 'ذكاء', 'صورة', 'العاب', 'تلفاز'],
};

function classifyCategory(title, desc, tags) {
  const haystack = `${title || ''} ${desc || ''} ${(tags || []).join(' ')}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        return cat;
      }
    }
  }
  return 'contemporary';
}

function normalizeTitle(t) {
  if (!t || typeof t !== 'string') return '';
  return t
    .replace(/^س:\s*/, '')
    .replace(/^سؤال:\s*/, '')
    .replace(/^السؤال:\s*/, '')
    .replace(/^فتوى رقم\s*\d+\s*:\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRawJsonOrJsonl(rawText) {
  const items = [];
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (typeof parsed === 'object') return Object.values(parsed);
  } catch {
    const lines = rawText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const obj = JSON.parse(trimmed);
        items.push(obj);
      } catch {
        /* skip */
      }
    }
  }
  return items;
}

function extractScholar(fileName, raw) {
  if (raw.sheikh) return raw.sheikh;
  if (raw.scholar) return raw.scholar;
  if (raw.mufti) return raw.mufti;
  if (fileName.includes('binbaz') || fileName.includes('ابن_باز')) return 'الشيخ عبد العزيز بن باز';
  if (fileName.includes('عثيمين') || fileName.includes('othaymeen')) return 'الشيخ محمد بن صالح العثيمين';
  if (fileName.includes('fawzan') || fileName.includes('الفوزان')) return 'الشيخ صالح بن فوزان الفوزان';
  if (fileName.includes('المصرية')) return 'دار الإفتاء المصرية';
  if (fileName.includes('الأردنية')) return 'دار الإفتاء الأردنية';
  if (fileName.includes('السعودية')) return 'اللجنة الدائمة للإفتاء';
  if (fileName.includes('islamqa') || fileName.includes('Islamic_Q_and_A')) return 'الإسلام سؤال وجواب';
  if (fileName.includes('إسلام_أونلاين')) return 'إسلام أون لاين';
  if (fileName.includes('موسوعة')) return 'موسوعة الفتاوى الإسلامية';
  return 'كبار العلماء ودور الإفتاء';
}

async function runIndexer() {
  console.log('⚡ Starting Ultra-Lightweight Massive Fatwa Indexing Pipeline...\n');

  const shards = {
    salah: [],
    zakah: [],
    muamalat: [],
    aqeedah: [],
    family: [],
    contemporary: [],
  };

  const masterItems = [];
  const seenTitles = new Set();
  let totalIndexed = 0;

  for (const relativePath of TARGET_FILES) {
    const encodedPath = relativePath.split('/').map(encodeURIComponent).join('/');
    const url = `${REPO_BASE}/${encodedPath}`;
    console.log(`⏳ Fetching [${relativePath}]...`);

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      if (!res.ok) {
        console.warn(`  ⚠️ Skipping ${relativePath} (HTTP ${res.status})`);
        continue;
      }

      const text = await res.text();
      const rawRecords = parseRawJsonOrJsonl(text);
      console.log(`  📄 Found ${rawRecords.length} records in [${relativePath}].`);

      let countForFile = 0;
      for (let idx = 0; idx < rawRecords.length; idx++) {
        const raw = rawRecords[idx];
        if (!raw) continue;

        const title = normalizeTitle(raw.title || raw.question || raw.name || raw.text || raw.Subject);
        if (!title || title.length < 6) continue;
        if (seenTitles.has(title)) continue;
        seenTitles.add(title);

        const id = `hf-${path.basename(relativePath, '.json')}-${idx}`;
        const question = normalizeTitle(raw.question || raw.description || raw.body || raw.Question || title);
        const scholar = extractScholar(relativePath, raw);
        const tags = Array.isArray(raw.tags) ? raw.tags : Array.isArray(raw.categories) ? raw.categories : [];
        const category = classifyCategory(title, question, tags);
        const answer = (raw.answer || raw.reply || raw.fatwa || raw.Answer || '').trim();
        const audioUrl = raw.audio_url || raw.audio || raw.url || undefined;

        // Ultra-Lightweight Representation
        const entry = {
          id,
          title: title.slice(0, 140),
          question: question !== title ? question.slice(0, 200) : title.slice(0, 140),
          scholar,
          category,
          tags: tags.slice(0, 3),
          sourceFile: relativePath,
          idx,
          hasAnswer: Boolean(answer && answer.length > 5),
          // Keep top answers inline for top 10k fatwas, others on-demand
          answer: totalIndexed < 10000 && answer ? answer.slice(0, 800) : undefined,
          audioUrl,
        };

        shards[category].push(entry);
        masterItems.push(entry);
        countForFile++;
        totalIndexed++;
      }

      console.log(`  ✅ Added ${countForFile} indexed fatwas from [${relativePath}]. (Cumulative: ${masterItems.length})`);
    } catch (err) {
      console.warn(`  ⚠️ Error indexing ${relativePath}:`, err.message);
    }
  }

  // Write Shard files
  console.log('\n💾 Writing ultra-lightweight category shards to disk...');
  for (const [catName, items] of Object.entries(shards)) {
    const shardPath = path.join(SHARDS_DIR, `${catName}.json`);
    fs.writeFileSync(shardPath, JSON.stringify(items), 'utf8'); // Minified JSON
    const sizeKB = (fs.statSync(shardPath).size / 1024).toFixed(1);
    console.log(`  📁 [${catName}.json] -> ${items.length} fatwas (${sizeKB} KB)`);
  }

  // Write Minified Master Manifest
  const manifestPath = path.join(process.cwd(), 'public', 'data', 'fatwas_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(masterItems), 'utf8');
  const manifestSizeMB = (fs.statSync(manifestPath).size / (1024 * 1024)).toFixed(2);

  // Master index summary
  const masterManifest = {
    version: '4.0.0',
    totalCount: masterItems.length,
    updatedAt: new Date().toISOString(),
    categories: Object.keys(shards).map((key) => ({
      id: key,
      count: shards[key].length,
      shardFile: `/data/shards/${key}.json`,
    })),
  };

  fs.writeFileSync(
    path.join(SHARDS_DIR, 'manifest_index.json'),
    JSON.stringify(masterManifest, null, 2),
    'utf8'
  );

  console.log(`\n🎉 DONE! Total indexed database: ${masterItems.length} verified fatwas (${manifestSizeMB} MB minified) across 6 category shards.`);
}

runIndexer().catch((err) => {
  console.error('Fatal indexer error:', err);
  process.exit(1);
});
