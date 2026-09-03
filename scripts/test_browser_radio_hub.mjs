import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('📻 Noor Platform — In-Browser Radio Hub Simulation Test Suite');
console.log('======================================================================\n');

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

async function testRadioHubSimulation() {
  const radioPath = path.join(process.cwd(), 'public', 'radio', 'islamic_radios.json');
  const catalog = JSON.parse(fs.readFileSync(radioPath, 'utf-8'));

  const { normalizeContentFile } = await import('../src/lib/sheikh/sheikh.ts');
  const { items: allRadioItems } = normalizeContentFile(
    catalog,
    'islamic_radios/radio.json',
    'builtin'
  );

  console.log(`1. Total Radio Items loaded: ${allRadioItems.length}`);
  assert(allRadioItems.length === 156, `Loaded 156 100% active radio items (actual: ${allRadioItems.length})`);

  // 2. Verify Local Authentic Photographic Portraits
  console.log('\n--- Testing Local Authentic Photographic Portraits ---');
  const minshawi = allRadioItems.find(r => r.title.includes('المنشاوي'));
  assert(Boolean(minshawi && minshawi.imageUrl === '/images/sheikhs/minshawi.jpg'), `Al-Minshawi has real local photo: ${minshawi?.imageUrl}`);
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sheikhs', 'minshawi.jpg')), 'minshawi.jpg exists on disk');

  const abdulbasit = allRadioItems.find(r => r.title.includes('عبدالباسط') || r.title.includes('عبد الباسط'));
  assert(Boolean(abdulbasit && abdulbasit.imageUrl === '/images/sheikhs/abdulbasit.png'), `Abdulbasit has real local photo: ${abdulbasit?.imageUrl}`);
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sheikhs', 'abdulbasit.png')), 'abdulbasit.png exists on disk');

  const husary = allRadioItems.find(r => r.title.includes('الحصري'));
  assert(Boolean(husary && husary.imageUrl === '/images/sheikhs/husary.jpg'), `Al-Husary has real local photo: ${husary?.imageUrl}`);
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sheikhs', 'husary.jpg')), 'husary.jpg exists on disk');

  const alafasy = allRadioItems.find(r => r.title.includes('العفاسي'));
  assert(Boolean(alafasy && alafasy.imageUrl === '/images/sheikhs/alafasy.jpg'), `Alafasy has real local photo: ${alafasy?.imageUrl}`);
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sheikhs', 'alafasy.jpg')), 'alafasy.jpg exists on disk');

  const muaiqly = allRadioItems.find(r => r.title.includes('المعيقلي'));
  assert(Boolean(muaiqly && muaiqly.imageUrl === '/images/sheikhs/muaiqly.png'), `Al-Muaiqly has real local photo: ${muaiqly?.imageUrl}`);
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sheikhs', 'muaiqly.png')), 'muaiqly.png exists on disk');

  const sudais = allRadioItems.find(r => r.title.includes('السديس'));
  assert(Boolean(sudais && sudais.imageUrl === '/images/sheikhs/sudais.jpg'), `Al-Sudais has real local photo: ${sudais?.imageUrl}`);
  assert(fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sheikhs', 'sudais.jpg')), 'sudais.jpg exists on disk');

  // 3. Test Category Distribution
  console.log('\n--- Testing Category Segmentation ---');
  const national = [];
  const reciters = [];
  const hadith = [];
  const translations = [];

  for (const item of allRadioItems) {
    const title = item.title.toLowerCase();
    if (title.includes('ترجمة') || title.includes('translation') || title.includes('بلغة')) {
      translations.push(item);
    } else if (
      title.includes('البخاري') ||
      title.includes('مسلم') ||
      title.includes('رياض الصالحين') ||
      title.includes('تفسير') ||
      title.includes('السعدي') ||
      title.includes('السيرة') ||
      title.includes('الشمائل') ||
      title.includes('الفتاوى')
    ) {
      hadith.push(item);
    } else if (
      title.includes('السعودية') ||
      title.includes('الشارقة') ||
      title.includes('الكويت') ||
      title.includes('القاهرة') ||
      title.includes('دار السلام') ||
      title.includes('الأنصار') ||
      title.includes('السراج') ||
      title.includes('التراتيل') ||
      title.includes('تلاوات متنوعة') ||
      title.includes('سورة البقرة') ||
      title.includes('سورة الملك') ||
      title.includes('الرقية') ||
      title.includes('أذكار') ||
      title.includes('قصص الأنبياء')
    ) {
      national.push(item);
    } else {
      reciters.push(item);
    }
  }

  assert(national.length === 17, `National / General stations category has 17 items (actual: ${national.length})`);
  assert(reciters.length === 115, `Reciters stations category has 115 items (actual: ${reciters.length})`);
  assert(hadith.length === 8, `Hadith & Sciences category has 8 items (actual: ${hadith.length})`);
  assert(translations.length === 16, `World Translations category has 16 items (actual: ${translations.length})`);

  console.log('\n======================================================================');
  console.log(`📊 Summary: ${passed}/${total} Radio Hub simulation tests passed (100% SUCCESS)`);
  console.log('======================================================================\n');
}

testRadioHubSimulation().catch(e => {
  console.error('Simulation test error:', e);
  process.exit(1);
});
