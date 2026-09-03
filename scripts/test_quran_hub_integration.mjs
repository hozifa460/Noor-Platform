import assert from 'assert';
import { ALL_SURAHS, QIRAAT_LIST } from '../src/lib/quran/data.ts';
import { SUPPORTED_TAFSIRS, fetchAyahTafsir } from '../src/lib/quran/tafsir-engine.ts';
import { SUPPORTED_EERAB_BOOKS } from '../src/lib/quran/eerab-engine.ts';
import { getAyahTranslation, getSurahTranslationsMap } from '../src/lib/quran/translation-engine.ts';
import { loadMp3QuranReciters, getRecitersForRiwayah } from '../src/lib/quran/mp3quran-engine.ts';
import { useQuranStore, QURAN_RECITERS } from '../src/stores/quran-store.ts';

console.log('📖 Starting Comprehensive Holy Quran, Qira\'at, Multilingual & Audio Tests...\n');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`, err.message);
  }
}

async function asyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`, err.message);
  }
}

async function runAllTests() {
  // Suite 1: 114 Surahs Verification
  console.log('--- Test Suite 1: Complete 114 Quranic Surahs Verification ---');
  test('Contains exactly 114 Surahs', () => {
    assert.strictEqual(ALL_SURAHS.length, 114);
  });

  test('Surah 1 is Al-Fatihah with 7 Ayahs (Meccan)', () => {
    const fatihah = ALL_SURAHS[0];
    assert.strictEqual(fatihah.number, 1);
    assert.strictEqual(fatihah.nameAr, 'الفاتحة');
    assert.strictEqual(fatihah.numberOfAyahs, 7);
  });

  test('Surah 114 is An-Nas with 6 Ayahs (Meccan)', () => {
    const nas = ALL_SURAHS[113];
    assert.strictEqual(nas.number, 114);
    assert.strictEqual(nas.nameAr, 'الناس');
    assert.strictEqual(nas.numberOfAyahs, 6);
  });

  // Suite 2: Qira'at & Narrations Catalog Verification
  console.log('\n--- Test Suite 2: Qira\'at & Narrations Catalog Verification ---');
  test('Contains 19 verified Qira\'at and Narrations Mus-hafs', () => {
    assert.strictEqual(QIRAAT_LIST.length, 19);
  });

  test('Default Qiraah is Hafs an Aasim', () => {
    const hafs = QIRAAT_LIST[0];
    assert.strictEqual(hafs.id, 'hafs');
    assert.ok(hafs.name.includes('حفص عن عاصم'));
  });

  // Suite 3: Multilingual Translations Engine (French, German, Spanish, Urdu, etc.)
  console.log('\n--- Test Suite 3: Multilingual Translations Engine ---');
  await asyncTest('Loads French Montada Translation (fr-montada)', async () => {
    const res = await getAyahTranslation('fr-montada', 1, 1);
    assert.ok(res.text.length > 0);
    assert.strictEqual(res.direction, 'ltr');
  });

  await asyncTest('Loads Urdu Junagarhi Translation (ur-junagarhi)', async () => {
    const res = await getAyahTranslation('ur-junagarhi', 1, 1);
    assert.ok(res.text.length > 0);
    assert.strictEqual(res.direction, 'rtl');
  });

  await asyncTest('Loads Spanish Garcia Translation (es-garcia)', async () => {
    const res = await getAyahTranslation('es-garcia', 1, 1);
    assert.ok(res.text.length > 0);
    assert.strictEqual(res.direction, 'ltr');
  });

  await asyncTest('Loads German Bubenheim Translation (de-bubenheim)', async () => {
    const res = await getAyahTranslation('de-bubenheim', 1, 1);
    assert.ok(res.text.length > 0);
    assert.strictEqual(res.direction, 'ltr');
  });

  await asyncTest('Loads Turkish Rwwad Translation (tr-rwwad)', async () => {
    const res = await getAyahTranslation('tr-rwwad', 1, 1);
    assert.ok(res.text.length > 0);
  });

  await asyncTest('Loads Indonesian Affairs Translation (id-affairs)', async () => {
    const res = await getAyahTranslation('id-affairs', 1, 1);
    assert.ok(res.text.length > 0);
  });

  await asyncTest('Generates translation map for Al-Fatihah in French', async () => {
    const map = await getSurahTranslationsMap('fr-montada', 1);
    assert.ok(map instanceof Map);
  });

  // Suite 4: Multi-Tafsir & Asbab al-Nuzul Engine
  console.log('\n--- Test Suite 4: Multi-Tafsir & Asbab al-Nuzul Engine ---');
  test('Configured authoritative Tafsirs (expanded classical editions)', () => {
    assert.ok(SUPPORTED_TAFSIRS.length >= 7);
  });

  test('Configured authoritative Quranic I\'rab books (4 editions)', () => {
    assert.strictEqual(SUPPORTED_EERAB_BOOKS.length, 4);
    assert.ok(SUPPORTED_EERAB_BOOKS.some((b) => b.id === 'i-rab-al-quran-li-al-darwish'));
    assert.ok(SUPPORTED_EERAB_BOOKS.some((b) => b.id === 'al-jadwal-fi-i-rab-al-quran'));
  });

  await asyncTest('Fetches and formats Tafsir Muyassar for Al-Fatihah 1:1', async () => {
    const tafsir = await fetchAyahTafsir(16, 1, 1);
    assert.ok(tafsir.text.length > 0);
    assert.strictEqual(tafsir.tafsirName, 'التفسير الميسر');
  });

  // Suite 5: MP3Quran 240+ Reciters & Riwayaat Catalog
  console.log('\n--- Test Suite 5: MP3Quran.net 240+ Reciters & Riwayaat Catalog ---');
  await asyncTest('Loads reciters from MP3Quran catalog', async () => {
    const reciters = await loadMp3QuranReciters();
    assert.ok(Array.isArray(reciters));
  });

  await asyncTest('Finds verified reciters for Warsh an Nafea', async () => {
    const warshReciters = await getRecitersForRiwayah('warsh');
    assert.ok(Array.isArray(warshReciters));
  });

  await asyncTest('Finds verified reciters for Qaloon an Nafea', async () => {
    const qaloonReciters = await getRecitersForRiwayah('qaloon');
    assert.ok(Array.isArray(qaloonReciters));
  });

  await asyncTest('Finds verified reciters for Al-Duri (aldori-abu-amr)', async () => {
    const doriReciters = await getRecitersForRiwayah('aldori-abu-amr');
    assert.ok(Array.isArray(doriReciters));
  });

  test('Configured 28 verified Ayah-level reciters in QURAN_RECITERS', () => {
    assert.strictEqual(QURAN_RECITERS.length, 28);
    assert.ok(QURAN_RECITERS.some((r) => r.id === 'minshawi_murattal'));
    assert.ok(QURAN_RECITERS.some((r) => r.id === 'husary_murattal'));
    assert.ok(QURAN_RECITERS.some((r) => r.id === 'alafasy'));
    assert.ok(QURAN_RECITERS.some((r) => r.id === 'muaiqly'));
    assert.ok(QURAN_RECITERS.some((r) => r.id === 'dossari'));
  });

  // Suite 6: Quran Store State & Real Mushaf Mode
  console.log('\n--- Test Suite 6: Quran Store State & Real Mushaf Mode ---');
  test('Store defaults to Real Mushaf page mode', () => {
    const state = useQuranStore.getState();
    assert.strictEqual(state.viewMode, 'mushaf-real');
    assert.strictEqual(state.activeQiraah.id, 'hafs');
  });

  test('Store allows switching active Qiraah smoothly', () => {
    const warsh = QIRAAT_LIST.find((q) => q.id === 'warsh');
    if (warsh) {
      useQuranStore.getState().setActiveQiraah(warsh);
      assert.strictEqual(useQuranStore.getState().activeQiraah.id, 'warsh');
    }
  });

  console.log('\n========================================');
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log('========================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
