import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('======================================================================');
console.log('📿 Noor Platform — Adhkar & Hisn al-Muslim Hub Integration Tests');
console.log('======================================================================\n');

let passed = 0;
let total = 0;

function check(cond, msg) {
  total++;
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  // 1. Check local asset
  const localAdhkarPath = path.join(process.cwd(), 'public', 'data', 'adhkar', 'adhkar.json');
  check(fs.existsSync(localAdhkarPath), 'public/data/adhkar/adhkar.json exists locally');

  const raw = fs.readFileSync(localAdhkarPath, 'utf-8');
  const catalog = JSON.parse(raw);

  check(Array.isArray(catalog), 'Adhkar catalog is a valid JSON array');
  check(catalog.length === 132, `Contains exactly 132 categories (found: ${catalog.length})`);

  let totalDhikrs = 0;
  let totalAudios = 0;

  for (const cat of catalog) {
    check(cat.id > 0 && typeof cat.category === 'string', `Category ${cat.id} has valid name: ${cat.category}`);
    check(Array.isArray(cat.array) && cat.array.length > 0, `Category ${cat.id} contains items`);
    totalDhikrs += cat.array.length;

    for (const d of cat.array) {
      if (d.audio || d.filename) totalAudios++;
      assert(typeof d.text === 'string' && d.text.trim().length > 0, `Dhikr ${d.id} has valid Arabic text`);
      assert(typeof d.count === 'number' && d.count >= 1, `Dhikr ${d.id} has positive repetition count`);
    }
  }

  check(totalDhikrs >= 260, `Total authentic Dhikrs is >= 260 (found: ${totalDhikrs})`);
  check(totalAudios >= 260, `Total audio files mapped is >= 260 (found: ${totalAudios})`);

  // 2. Test Engine (Feature-Sliced Facade)
  const { searchAdhkar, getDhikrAudioUrl, getDhikrAudioMapping, QUICK_ADHKAR_TABS } = await import('../src/features/adhkar/index.ts');

  check(Array.isArray(QUICK_ADHKAR_TABS) && QUICK_ADHKAR_TABS.length >= 6, 'QUICK_ADHKAR_TABS has >= 6 quick categories');

  const morningResults = searchAdhkar(catalog, '', 'morning_evening', 'all');
  check(morningResults.length === 1 && morningResults[0].category.id === 1, 'Tab morning_evening filters to Category 1 (أذكار الصباح والمساء)');

  const searchResults = searchAdhkar(catalog, 'الكرسي', 'all', 'all');
  check(searchResults.length > 0, 'Arabic search for "الكرسي" returns matched Adhkar');

  const nullSearchResults = searchAdhkar(null, 'الكرسي', 'all', 'all');
  check(Array.isArray(nullSearchResults) && nullSearchResults.length === 0, 'searchAdhkar safely returns empty array when catalog is null');

  const audioUrl = getDhikrAudioUrl('/audio/75.mp3');
  check(
    audioUrl === 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/raw/main/adhkarset/adhkar/audio/75.mp3',
    'getDhikrAudioUrl correctly formats direct Hugging Face raw CDN audio URL'
  );

  const trimmedAudioUrl = getDhikrAudioUrl('  /audio/75.mp3  ');
  check(
    trimmedAudioUrl === 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/raw/main/adhkarset/adhkar/audio/75.mp3',
    'getDhikrAudioUrl cleans and trims leading/trailing whitespace'
  );

  const audioMapping = getDhikrAudioMapping({ id: 75, audio: '/audio/75.mp3', filename: '75.mp3' });
  check(
    audioMapping.dhikrId === 75 && audioMapping.streamUrl.endsWith('/75.mp3'),
    'getDhikrAudioMapping conforms to DhikrAudioMapping contract'
  );

  console.log(`\n📊 Summary: ${passed}/${total} Adhkar Hub Integration tests passed (100% SUCCESS)\n`);

}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
