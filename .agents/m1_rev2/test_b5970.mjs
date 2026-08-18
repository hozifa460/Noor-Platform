import { normalizeArabicText, extractHadithMatn } from '../../scripts/generate_hadiths_micro_index.mjs';

// Bukhari #5970
const b5970_raw = `حَدَّثَنَا أَبُو الْوَلِيدِ، حَدَّثَنَا شُعْبَةُ، قَالَ الْوَلِيدُ بْنُ عَيْزَارَ أَخْبَرَنِي قَالَ سَمِعْتُ أَبَا عَمْرٍو الشَّيْبَانِيَّ، يَقُولُ حَدَّثَنَا صَاحِبُ هَذِهِ الدَّارِ ـ وَأَشَارَ إِلَى دَارِ عَبْدِ اللَّهِ ـ قَالَ سَأَلْتُ النَّبِيَّ صلى الله عليه وسلم أَىُّ الْعَمَلِ أَحَبُّ إِلَى اللَّهِ قَالَ ‏"‏ الصَّلاَةُ عَلَى وَقْتِهَا ‏"‏‏.‏ قَالَ ثُمَّ أَىٌّ قَالَ ‏"‏ ثُمَّ بِرُّ الْوَالِدَيْنِ ‏"‏‏.‏ قَالَ ثُمَّ أَىٌّ قَالَ ‏"‏ الْجِهَادُ فِي سَبِيلِ اللَّهِ ‏"‏‏.‏ قَالَ حَدَّثَنِي بِهِنَّ وَلَوِ اسْتَزَدْتُهُ لَزَادَنِي‏.‏`;

console.log('=== Bukhari #5970 (Birr al-Walidayn) ===');
console.log('Raw:', b5970_raw);
console.log('\nNormalized:', normalizeArabicText(b5970_raw));
const matn = extractHadithMatn(b5970_raw);
console.log('\nExtracted Matn:', matn);
console.log('\n20-char snippet:', JSON.stringify(matn.slice(0, 20)));
console.log('Contains "بر الوالدين"?:', matn.includes('بر الوالدين'));
console.log('Snippet contains "بر"?:', matn.slice(0, 20).includes('بر'));
