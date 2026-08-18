import { normalizeArabic, tokenizeArabic, arabicSearchMatch } from '../../src/lib/arabic-normalizer.ts';

const textBukhari = "حدثنا ابو الوليد قال سالت النبي صلي الله عليه وسلم اي العمل احب الي الله قال الصلاه علي وقتها قال ثم اي قال ثم بر الوالدين قال ثم اي قال الجهاد في سبيل الله";
console.log('Match "بر الوالدين":', arabicSearchMatch(textBukhari, 'بر الوالدين'));
console.log('Match "النيات":', arabicSearchMatch(textBukhari, 'النيات'));
console.log('Match "الصلاة":', arabicSearchMatch(textBukhari, 'الصلاة'));
console.log('Match "الجهاد":', arabicSearchMatch(textBukhari, 'الجهاد'));
