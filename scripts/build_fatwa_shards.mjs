import fs from 'fs';
import path from 'path';

const SHARDS_DIR = path.join(process.cwd(), 'public', 'data', 'shards');
if (!fs.existsSync(SHARDS_DIR)) {
  fs.mkdirSync(SHARDS_DIR, { recursive: true });
}

// Read current manifest and seed
const manifestPath = path.join(process.cwd(), 'public', 'data', 'fatwas_manifest.json');
const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Group into shards by category
const shards = {
  salah: [],
  zakah: [],
  muamalat: [],
  aqeedah: [],
  family: [],
  contemporary: [],
};

for (const item of manifestData) {
  const cat = item.category || 'contemporary';
  if (shards[cat]) {
    shards[cat].push(item);
  } else {
    shards.contemporary.push(item);
  }
}

// Write individual category shards
for (const [catName, items] of Object.entries(shards)) {
  const shardPath = path.join(SHARDS_DIR, `${catName}.json`);
  fs.writeFileSync(shardPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`  📦 Generated shard [${catName}.json] with ${items.length} items`);
}

// Master index with metadata
const masterManifest = {
  version: '2.0.0',
  totalCount: manifestData.length,
  updatedAt: new Date().toISOString(),
  categories: Object.keys(shards).map((key) => ({
    id: key,
    count: shards[key].length,
    shardFile: `/data/shards/${key}.json`,
  })),
  items: manifestData,
};

fs.writeFileSync(
  path.join(SHARDS_DIR, 'manifest_index.json'),
  JSON.stringify(masterManifest, null, 2),
  'utf8'
);

console.log(`\n✅ Generated Master Manifest with ${manifestData.length} items in ${SHARDS_DIR}`);
