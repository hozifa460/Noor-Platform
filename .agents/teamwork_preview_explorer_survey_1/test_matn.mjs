import { HADITH_BOOKS_LIST } from '../../src/lib/hadith-data.ts';
import { normalizeArabic, tokenizeArabic } from '../../src/lib/arabic-normalizer.ts';

function extractHadithMatn(normalizedText) {
  if (!normalizedText) return '';

  // Common transition markers where Matn starts after the isnad
  const markers = [
    'قال رسول الله صلي الله عليه وسلم',
    'ان رسول الله صلي الله عليه وسلم قال',
    'عن النبي صلي الله عليه وسلم قال',
    'سمعت رسول الله صلي الله عليه وسلم يقول',
    'سمعت النبي صلي الله عليه وسلم يقول',
    'عن النبي صلي الله عليه وسلم انه قال',
    'عن النبي صلي الله عليه وسلم',
    'رسول الله صلي الله عليه وسلم يقول',
    'رسول الله صلي الله عليه وسلم قال',
    'رسول الله صلي الله عليه وسلم',
    'النبي صلي الله عليه وسلم قال',
    'النبي صلي الله عليه وسلم',
    'قال قال',
    'يقول'
  ];

  for (const m of markers) {
    const idx = normalizedText.indexOf(m);
    if (idx !== -1 && idx + m.length + 5 < normalizedText.length) {
      const matnCandidate = normalizedText.slice(idx + m.length).trim();
      if (matnCandidate.length >= 10) {
        return matnCandidate;
      }
    }
  }

  // If no marker found, return the text itself
  return normalizedText;
}

// Let's test on Bukhari Hadith 1
const b1 = "حدثنا الحميدي عبد الله بن الزبير قال حدثنا سفيان قال حدثنا يحيي بن سعيد الانصاري قال اخبرني محمد بن ابراهيم التيمي انه سمع علقمه بن وقاص الليثي يقول سمعت عمر بن الخطاب رضي الله عنه علي المنبر قال سمعت رسول الله صلي الله عليه وسلم يقول انما الاعمال بالنيات وانما لكل امري ما نوي فمن كانت هجرته الي دنيا يصيبها او الي امراه ينكحها فهجرته الي ما هاجر اليه";
console.log('Extracted Matn:', extractHadithMatn(b1));
