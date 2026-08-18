import { normalizeArabicText, extractHadithMatn } from '../../scripts/generate_hadiths_micro_index.mjs';

const testCases = [
  {
    name: 'Bukhari #10 (Muslim is he from whose tongue...)',
    raw: `حَدَّثَنَا سَعِيدُ بْنُ يَحْيَى بْنِ سَعِيدٍ الْقُرَشِيِّ، قَالَ حَدَّثَنَا أَبِي قَالَ، حَدَّثَنَا أَبُو بُرْدَةَ بْنُ عَبْدِ اللَّهِ بْنِ أَبِي بُرْدَةَ، عَنْ أَبِي بُرْدَةَ، عَنْ أَبِي مُوسَى، قَالَ قَالُوا يَا رَسُولَ اللَّهِ أَىُّ الإِسْلاَمِ أَفْضَلُ قَالَ ‏"‏ مَنْ سَلَمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ ‏"‏‏.‏`,
    expectedCore: 'من سلم المسلمون من لسانه',
  },
  {
    name: 'Bukhari #48 (Abusing a Muslim is sin...)',
    raw: `حَدَّثَنَا مُحَمَّدُ بْنُ عَرْعَرَةَ، قَالَ حَدَّثَنَا شُعْبَةُ، عَنْ زُبَيْدٍ، قَالَ سَأَلْتُ أَبَا وَائِلٍ عَنِ الْمُرْجِئَةِ، فَقَالَ حَدَّثَنِي عَبْدُ اللَّهِ، أَنَّ النَّبِيَّ صلى الله عليه وسلم قَالَ ‏"‏ سِبَابُ الْمُسْلِمِ فُسُوقٌ، وَقِتَالُهُ كُفْرٌ ‏"‏‏.‏`,
    expectedCore: 'سباب المسلم فسوق',
  },
  {
    name: 'Muslim #1 (Jibreel Hadith - Islam, Iman, Ihsan)',
    raw: `حَدَّثَنِي أَبُو خَيْثَمَةَ زُهَيْرُ بْنُ حَرْبٍ، حَدَّثَنَا وَكِيعٌ، عَنْ كَهْمَسٍ، عَنْ عَبْدِ اللَّهِ بْنِ بُرَيْدَةَ، عَنْ يَحْيَى بْنِ يَعْمَرَ، ... عَنْ عُمَرَ بْنِ الْخَطَّابِ، قَالَ بَيْنَمَا نَحْنُ عِنْدَ رَسُولِ اللَّهِ صلى الله عليه وسلم ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ ...`,
    expectedCore: 'بينما نحن عند رسول الله',
  },
  {
    name: 'Tirmidhi #2317 (From perfection of ones Islam is leaving what does not concern him)',
    raw: `حَدَّثَنَا قُتَيْبَةُ حَدَّثَنَا مَالِكُ بْنُ أَنَسٍ عَنِ الزُّهْرِيِّ عَنْ عَلِيِّ بْنِ حُسَيْنٍ قَالَ قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ مِنْ حُسْنِ إِسْلَامِ الْمَرْءِ تَرْكُهُ مَا لَا يَعْنِيهِ`,
    expectedCore: 'من حسن اسلام المرء',
  },
  {
    name: 'Ibn Majah #224 (Seeking knowledge is obligation)',
    raw: `حَدَّثَنَا هِشَامُ بْنُ عَمَّارٍ حَدَّثَنَا حَفْصُ بْنُ سُلَيْمَانَ حَدَّثَنَا كَثِيرُ بْنُ شِنْظِيرٍ عَنْ مُحَمَّدِ بْنِ سِيرِينَ عَنْ أَنَسِ بْنِ مَالِكٍ قَالَ قَالَ رَسُولُ اللَّهِ ـ صلى الله عليه وسلم ـ ‏ "‏ طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ ‏"‏`,
    expectedCore: 'طلب العلم فريضه',
  },
];

console.log('=== TESTING FAMOUS CORE HADITHS WITH 20-CHAR SNIPPET ===\n');

for (const tc of testCases) {
  const norm = normalizeArabicText(tc.raw);
  const matn = extractHadithMatn(tc.raw);
  const snippet20 = matn.slice(0, 20);
  const snippet44 = matn.slice(0, 44);

  const matched = matn.includes(normalizeArabicText(tc.expectedCore));
  const snippetHasIt = snippet20.includes(normalizeArabicText(tc.expectedCore)) || snippet44.includes(normalizeArabicText(tc.expectedCore));

  console.log(`Hadith: ${tc.name}`);
  console.log(`  Extracted Matn: "${matn.slice(0, 60)}..."`);
  console.log(`  20-char Snippet: "${snippet20}"`);
  console.log(`  44-char Snippet: "${snippet44}"`);
  console.log(`  Matn contains core: ${matched ? '✅' : '❌'}`);
  console.log(`  Snippet contains core: ${snippetHasIt ? '✅' : '❌'}\n`);
}
