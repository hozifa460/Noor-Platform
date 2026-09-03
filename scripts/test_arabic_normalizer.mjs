import {
  normalizeArabic,
  tokenizeArabic,
  arabicSearchMatch,
  arabicSearchScore,
  stripTashkeel,
  stripHarakat,
  TASHKEEL_REGEX,
} from '../src/lib/arabic-normalizer.ts';
import {
  getMorphologicalVariants,
  ISLAMIC_ROOT_VARIANTS,
} from '../src/lib/arabic-dictionary.ts';

async function runArabicNormalizerTests() {
  console.log('🕌 Starting Arabic Search & Normalizer Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // 1. Tashkeel Removal
  console.log('--- Test Suite 1: Diacritics & Tashkeel Stripping ---');
  const t1 = normalizeArabic('قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ');
  assert(t1 === 'قال رسول الله صلي الله عليه وسلم', 'Strips complete Arabic Tashkeel & Tanween');

  // 2. Alef Normalization
  console.log('\n--- Test Suite 2: Alef Forms Normalization ---');
  const a1 = normalizeArabic('إسلام');
  const a2 = normalizeArabic('اسلام');
  const a3 = normalizeArabic('أحمد');
  const a4 = normalizeArabic('آيات');
  assert(a1 === 'اسلام', 'Normalizes Kasra Alef (إ -> ا)');
  assert(a2 === 'اسلام', 'Preserves plain Alef (ا)');
  assert(a3 === 'احمد', 'Normalizes Fatha Alef (أ -> ا)');
  assert(a4 === 'ايات', 'Normalizes Madda Alef (آ -> ا)');

  // 3. Taa Marbuta & Yaa Normalization
  console.log('\n--- Test Suite 3: Taa Marbuta & Yaa Normalization ---');
  const ty1 = normalizeArabic('الصلاة');
  const ty2 = normalizeArabic('الصلاه');
  assert(ty1 === 'الصلاه' && ty2 === 'الصلاه', 'Normalizes Taa Marbuta (ة -> ه)');

  const y1 = normalizeArabic('علي');
  const y2 = normalizeArabic('على');
  assert(y1 === 'علي' && y2 === 'علي', 'Normalizes Alef Maksura (ى -> ي)');

  // 4. Tatweel Stripping
  console.log('\n--- Test Suite 4: Tatweel (Kashida) Stripping ---');
  const tat = normalizeArabic('مـــنــصـــة الــــنــــور');
  assert(tat === 'منصه النور', 'Strips Kashida / Tatweel correctly');

  // 5. Search Matching with / without Al- (التعريف)
  console.log('\n--- Test Suite 5: Flexible Search Query Matching ---');
  assert(arabicSearchMatch('تفسير سورة الفاتحة', 'الفاتحة') === true, 'Matches exact search');
  assert(arabicSearchMatch('تفسير سورة الفاتحة', 'فاتحة') === true, 'Matches without Al- prefix');
  assert(arabicSearchMatch('تفسير سورة البقرة', 'بقره') === true, 'Matches with Taa/Haa difference');
  assert(arabicSearchMatch('فتاوى الشيخ ابن عثيمين رحمه الله', 'ابن عثيمين') === true, 'Matches multi-word query');
  assert(arabicSearchMatch('الشيخ عبد العزيز بن باز', 'ابن باز') === true, 'Matches Ibn / Bin interchangeably');
  assert(arabicSearchMatch('شرح صحيح البخاري', 'البخاري شرح') === true, 'Matches unordered multi-word tokens');
  assert(arabicSearchMatch('شرح صحيح البخاري', 'مسلم') === false, 'Rejects non-matching query');

  // 6. Ranking Scores
  console.log('\n--- Test Suite 6: Search Ranking Score ---');
  const s1 = arabicSearchScore('صحيح البخاري', 'صحيح البخاري');
  const s2 = arabicSearchScore('مختصر صحيح البخاري', 'صحيح البخاري');
  assert(s1 > s2, 'Exact match scores higher than partial substring');

  // 7. Canonical Tashkeel Stripping Functions
  console.log('\n--- Test Suite 7: Canonical Tashkeel & Harakat Stripping ---');
  const withTashkeel = 'بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ';
  const strippedT = stripTashkeel(withTashkeel);
  assert(!TASHKEEL_REGEX.test(strippedT), 'TASHKEEL_REGEX leaves no diacritics');
  const withTatweel = 'صَـــلَاةٌ';
  const strippedH = stripHarakat(withTatweel);
  assert(!strippedH.includes('ـ') && strippedH === 'صلاة', 'stripHarakat strips both tashkeel and tatweel');

  // 8. Canonical Morphological Root Dictionary & Prefix Expansions
  console.log('\n--- Test Suite 8: Canonical Morphological Variants & Compound Prefixes ---');
  const prayerDirect = getMorphologicalVariants('صلاة');
  assert(prayerDirect.length >= 10, `Direct root "صلاة" returns >= 10 variants (got: ${prayerDirect.length})`);
  const prayerCompound = getMorphologicalVariants('بالصلاة');
  assert(prayerCompound.length >= 10, `Compound prefix "بالصلاة" returns >= 10 variants (got: ${prayerCompound.length})`);
  const fastingCompound = getMorphologicalVariants('والصوم');
  assert(fastingCompound.length >= 8, `Compound prefix "والصوم" returns >= 8 variants (got: ${fastingCompound.length})`);
  const unvocalizedNiyyah = getMorphologicalVariants('نيه');
  assert(unvocalizedNiyyah.length >= 5, `Unvocalized "نيه" returns >= 5 variants (got: ${unvocalizedNiyyah.length})`);
  const parents = getMorphologicalVariants('والدين');
  assert(parents.includes('والد') && parents.includes('والدة'), 'Parents root preserves authentic derivations');
  assert(ISLAMIC_ROOT_VARIANTS['صيام'] !== undefined, 'Canonical ISLAMIC_ROOT_VARIANTS has authentic roots');

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runArabicNormalizerTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
