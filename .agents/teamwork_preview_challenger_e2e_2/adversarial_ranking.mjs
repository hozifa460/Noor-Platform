/**
 * Adversarial Deep-Dive: Ranking Inversion & Premature Break Exploration
 */
import { searchAcrossAllBooks, loadHadithMicroIndex } from '../../src/lib/hadith-engine.ts';

const queriesToTest = [
  'الصلاة', 'الزكاة', 'الصوم', 'الحج', 'الجهاد', 'العلم', 'الفتن', 'الرقاق',
  'التوبة', 'الذكر', 'الدعاء', 'الجنة', 'النار', 'الوضوء', 'التيمم', 'الجنائز',
  'النكاح', 'البيوع', 'الأدب', 'الإيمان', 'الإسلام', 'الإحسان', 'التقوى', 'الصبر',
  'الصدقة', 'الوالدين', 'بر الوالدين', 'وبالوالدين', 'الأعمال', 'بالنيات'
];

console.log('Testing Sahihayn Top Ranking for 30 Common Queries...');
let bukhariOrMuslimTopCount = 0;
let failedQueries = [];

for (const q of queriesToTest) {
  const results = await searchAcrossAllBooks(q, 10);
  if (results.length > 0) {
    const topBook = results[0].book.id;
    const isSahihayn = topBook === 'bukhari' || topBook === 'muslim';
    if (isSahihayn) {
      bukhariOrMuslimTopCount++;
    } else {
      failedQueries.push({ query: q, topBook, hadithId: results[0].hadith.idInBook });
    }
  }
}

console.log(`\nSahihayn Top Ranking Pass: ${bukhariOrMuslimTopCount}/${queriesToTest.length}`);
console.log('Failed Queries (Non-Sahihayn ranked #1 despite Bukhari/Muslim having matches):');
console.table(failedQueries);
