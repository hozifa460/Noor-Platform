import { normalizeArabic } from '../../src/lib/arabic-normalizer.ts';

function stemArabicWord(word) {
  let norm = normalizeArabic(word);
  if (!norm || norm.length <= 2) return norm;

  // Prefixes with Al: بال، فال، وال، كال، لل، ال
  if (norm.startsWith('بال') || norm.startsWith('فال') || norm.startsWith('وال') || norm.startsWith('كال')) {
    if (norm.length > 4) norm = norm.slice(3);
  } else if (norm.startsWith('لل')) {
    if (norm.length > 3) norm = norm.slice(2);
  } else if (norm.startsWith('ال')) {
    if (norm.length > 3) norm = norm.slice(2);
  } else if ((norm.startsWith('و') || norm.startsWith('ف') || norm.startsWith('ب') || norm.startsWith('ل')) && norm.length > 3) {
    // single letter prefix
    norm = norm.slice(1);
  }

  return norm;
}

const tests = ['بالنيات', 'النيات', 'نيات', 'للصلاة', 'والصلاة', 'بالوضوء', 'الوضوء', 'والايمان', 'بالوالدين', 'الوالدين'];
for (const t of tests) {
  console.log(`${t.padEnd(12)} -> ${stemArabicWord(t)}`);
}
