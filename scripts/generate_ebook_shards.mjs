import fs from 'node:fs';
import path from 'node:path';

/**
 * Islamic Pure-Text E-Book Sharding & Index Generator
 * Converts curated Islamic classical works into ultra-compact, progressive JSON shards.
 */

const OUTPUT_BASE = path.join(process.cwd(), 'public', 'data', 'ebooks');

// Canonical normalizer for in-book search tokens
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // strip Harakat
    .replace(/\u0640/g, '') // strip Tatweel
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئی]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '')
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'«»“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const STOP_WORDS = new Set([
  'في', 'من', 'ما', 'لا', 'الي', 'علي', 'هو', 'هي', 'هم', 'هن', 'ثم', 'او', 'ان', 'انما',
  'كل', 'ذلك', 'به', 'له', 'بها', 'لنا', 'لهم', 'كان', 'كانت', 'يكون', 'تكون',
  'قال', 'قالت', 'يقول', 'عن', 'اي', 'هل', 'مع', 'هذا', 'هذه', 'بين', 'قد', 'اذا'
]);

function extractSearchTokens(text) {
  const norm = normalizeArabic(text);
  const words = norm.split(/\s+/);
  const tokens = new Set();

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    tokens.add(word);

    // Strip leading prefixes: الـ, و, ف, ب, ك, ل
    if (word.startsWith('ال') && word.length >= 5) {
      const stripped = word.slice(2);
      if (!STOP_WORDS.has(stripped)) tokens.add(stripped);
    }
    if ((word.startsWith('و') || word.startsWith('ف') || word.startsWith('ب') || word.startsWith('ك') || word.startsWith('ل')) && word.length >= 4) {
      const stripped = word.slice(1);
      if (!STOP_WORDS.has(stripped)) tokens.add(stripped);
      if (stripped.startsWith('ال') && stripped.length >= 5) {
        const stripped2 = stripped.slice(2);
        if (!STOP_WORDS.has(stripped2)) tokens.add(stripped2);
      }
    }
  }

  return Array.from(tokens);
}

// Helper to build a search index for a book
function buildSearchIndex(chunks) {
  const index = {}; // token -> Array<[chapterIndex, pageNumber, snippetOffset]>

  for (const chunk of chunks) {
    for (const p of chunk.paragraphs) {
      const tokens = extractSearchTokens(p.text);

      for (const token of tokens) {
        if (!index[token]) {
          index[token] = [];
        }
        if (index[token].length < 50) { // cap postings per token
          index[token].push([chunk.chapterIndex, p.pageNumber, p.text.slice(0, 100)]);
        }
      }
    }
  }

  return index;
}

// -------------------------------------------------------------
// 1. العقيدة الطحاوية
// -------------------------------------------------------------
const TAHAWIYYAH_BOOK = {
  meta: {
    id: 'aqeedah-tahawiyyah',
    title: 'متن العقيدة الطحاوية',
    subtitle: 'بيان عقيدة أهل السنة والجماعة على مذهب فقهاء الملة',
    author: 'الإمام أبو جعفر أحمد بن محمد الطحاوي',
    authorDeath: '321 هـ',
    investigator: 'تحقيق وتخريج جماعة من كبار المحققين',
    category: 'aqeedah',
    era: 'early',
    language: 'ar',
    totalVolumes: 1,
    totalPages: 32,
    totalChapters: 6,
    totalWords: 3450,
    hasFacsimilePdf: true,
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/shobohat/Matn_Altahawiya.pdf',
    coverGradient: 'from-amber-900 via-amber-950 to-stone-950',
    accentColor: '#d97706',
    description: 'العقيدة الطحاوية هي المتن العقدي الأشهر والأوسع قبولاً عند أهل السنة والجماعة، صاغها الإمام الطحاوي لبيان معتقد السلف الصالح في التوحيد والصفات والإيمان والقدر والصحابة.',
    tags: ['عقيدة', 'توحيد', 'أهل السنة والجماعة', 'الطحاوي', 'متون'],
    featured: true,
  },
  toc: [
    { id: 'tahawi-c1', title: 'المقدمة وأصول التوحيد وتنزيه الله تعالى', chapterIndex: 1, pageNumber: 1, level: 1 },
    { id: 'tahawi-c2', title: 'نبوة النبي محمد صلى الله عليه وسلم وصفاته', chapterIndex: 2, pageNumber: 7, level: 1 },
    { id: 'tahawi-c3', title: 'القرآن الكريم كلام الله غير مخلوق', chapterIndex: 3, pageNumber: 12, level: 1 },
    { id: 'tahawi-c4', title: 'رؤية المؤمنين لربهم في الجنة وأحوال القيامة', chapterIndex: 4, pageNumber: 17, level: 1 },
    { id: 'tahawi-c5', title: 'القدر ومشيئة الله وأفعال العباد', chapterIndex: 5, pageNumber: 22, level: 1 },
    { id: 'tahawi-c6', title: 'الإيمان والصحابة والسمع والطاعة والوسطية', chapterIndex: 6, pageNumber: 27, level: 1 },
  ],
  chunks: [
    {
      bookId: 'aqeedah-tahawiyyah',
      chapterIndex: 1,
      title: 'المقدمة وأصول التوحيد وتنزيه الله تعالى',
      startPage: 1,
      endPage: 6,
      wordCount: 580,
      paragraphs: [
        { id: 't1-1', isHeading: true, headingLevel: 1, pageNumber: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ' },
        { id: 't1-2', pageNumber: 1, text: 'قَالَ الْعَلَّامَةُ حُجَّةُ الْإِسْلَامِ أَبُو جَعْفَرٍ الْوَرَّاقُ الطَّحَاوِيُّ بِمِصْرَ رَحِمَهُ اللَّهُ: هَذَا ذِكْرُ بَيَانِ عَقِيدَةِ أَهْلِ السُّنَّةِ وَالْجَمَاعَةِ، عَلَى مَذْهَبِ فُقَهَاءِ الْمِلَّةِ: أَبِي حَنِيفَةَ النُّعْمَانِ بْنِ ثَابِتٍ الْكُوفِيِّ، وَأَبِي يُوسُفَ يَعْقُوبَ بْنِ إِبْرَاهِيمَ الْأَنْصَارِيِّ، وَأَبِي عَبْدِ اللَّهِ مُحَمَّدِ بْنِ الْحَسَنِ الشَّيْبَانِيِّ رِضْوَانُ اللَّهِ عَلَيْهِمْ أَجْمَعِينَ؛ وَمَا يَعْتَقِدُونَ مِنْ أُصُولِ الدِّينِ، وَيَدِينُونَ بِهِ لِرَبِّ الْعَالَمِينَ.' },
        { id: 't1-3', isHeading: true, headingLevel: 2, pageNumber: 2, text: 'أصل التوحيد وتفرد الله بالكمال' },
        { id: 't1-4', pageNumber: 2, text: 'نَقُولُ فِي تَوْحِيدِ اللَّهِ مُعْتَقِدِينَ بِتَوْفِيقِ اللَّهِ: إِنَّ اللَّهَ وَاحِدٌ لَا شَرِيكَ لَهُ، وَلَا شَيْءَ مِثْلُهُ، وَلَا شَيْءَ يُعْجِزُهُ، وَلَا إِلَهَ غَيْرُهُ.' },
        { id: 't1-5', pageNumber: 3, text: 'قَدِيمٌ بِلَا ابْتِدَاءٍ، دَائِمٌ بِلَا انْتِهَاءٍ، لَا يَفْنَى وَلَا يَبِيدُ، وَلَا يَكُونُ إِلَّا مَا يُرِيدُ. لَا تَبْلُغُهُ الْأَوْهَامُ، وَلَا تُدْرِكُهُ الْأَفْهَامُ، وَلَا يُشْبِهُهُ الْأَنَامُ.' },
        { id: 't1-6', pageNumber: 4, text: 'حَيٌّ لَا يَمُوتُ، قَيُّومٌ لَا يَنَامُ. خَالِقٌ بِلَا حَاجَةٍ، رَازِقٌ بِلَا مَئُونَةٍ، مُمِيتٌ بِلَا مَخَافَةٍ، بَاعِثٌ بِلَا مَشَقَّةٍ.' },
        { id: 't1-7', pageNumber: 5, text: 'مَا زَالَ بِصِفَاتِهِ قَدِيمًا قَبْلَ خَلْقِهِ، لَمْ يَزْدَدْ بِكَوْنِهِمْ شَيْئًا لَمْ يَكُنْ قَبْلَهُمْ مِنْ صِفَتِهِ، وَكَمَا كَانَ بِصِفَاتِهِ أَزَلِيًّا، كَذَلِكَ لَا يَزَالُ عَلَيْهَا أَبَدِيًّا.' },
        { id: 't1-8', pageNumber: 6, text: 'لَيْسَ مُنْذُ خَلَقَ الْخَلْقَ اسْتَفَادَ اسْمَ «الْخَالِقِ»، وَلَا بِإِحْدَاثِ الْبَرِيَّةِ اسْتَفَادَ اسْمَ «الْبَارِئِ». لَهُ مَعْنَى الرُّبُوبِيَّةِ وَلَا مَرْبُوبَ، وَمَعْنَى الْخَالِقِ وَلَا مَخْلُوقَ، وَكَمَا أَنَّهُ مُحْيِي الْمَوْتَى بَعْدَمَا أَحْيَا اسْتَحَقَّ هَذَا الِاسْمَ قَبْلَ إِحْيَائِهِمْ، كَذَلِكَ اسْتَحَقَّ اسْمَ الْخَالِقِ قَبْلَ إِنْشَائِهِمْ.' },
      ],
    },
    {
      bookId: 'aqeedah-tahawiyyah',
      chapterIndex: 2,
      title: 'نبوة النبي محمد صلى الله عليه وسلم وصفاته',
      startPage: 7,
      endPage: 11,
      wordCount: 520,
      paragraphs: [
        { id: 't2-1', isHeading: true, headingLevel: 1, pageNumber: 7, text: 'باب في الإيمان بنبوة محمد صلى الله عليه وسلم وخاتميته' },
        { id: 't2-2', pageNumber: 7, text: 'وَإِنَّ مُحَمَّدًا عَبْدُهُ الْمُصْطَفَى، وَنَبِيُّهُ الْمُجْتَبَى، وَرَسُولُهُ الْمُرْتَضَى. وَأَنَّهُ خَاتَمُ الْأَنْبِيَاءِ، وَإِمَامُ الْأَتْقِيَاءِ، وَسَيِّدُ الْمُرْسَلِينَ، وَحَبِيبُ رَبِّ الْعَالَمِينَ.' },
        { id: 't2-3', pageNumber: 8, text: 'وَكُلُّ دَعْوَى النُّبُوَّةِ بَعْدَهُ فَغَيٌّ وَهَوًى، وَهُوَ الْمَبْعُوثُ إِلَى عَامَّةِ الْجِنِّ وَكَافَّةِ الْوَرَى بِالْحَقِّ وَالْهُدَى، وَبِالنُّورِ وَالضِّيَاءِ.' },
      ],
    },
    {
      bookId: 'aqeedah-tahawiyyah',
      chapterIndex: 3,
      title: 'القرآن الكريم كلام الله غير مخلوق',
      startPage: 12,
      endPage: 16,
      wordCount: 560,
      paragraphs: [
        { id: 't3-1', isHeading: true, headingLevel: 1, pageNumber: 12, text: 'باب القرآن كلام الله' },
        { id: 't3-2', pageNumber: 12, text: 'وَإِنَّ الْقُرْآنَ كَلَامُ اللَّهِ، مِنْهُ بَدَا بِلَا كَيْفِيَّةٍ قَوْلًا، وَأَنْزَلَهُ عَلَى رَسُولِهِ وَحْيًا، وَصَدَّقَهُ الْمُؤْمِنُونَ عَلَى ذَلِكَ حَقًّا، وَأَيْقَنُوا أَنَّهُ كَلَامُ اللَّهِ تَعَالَى بِالْحَقِيقَةِ، لَيْسَ بِمَخْلُوقٍ كَكَلَامِ الْبَرِيَّةِ.' },
        { id: 't3-3', pageNumber: 13, text: 'فَمَنْ سَمِعَهُ فَزَعَمَ أَنَّهُ كَلَامُ الْبَشَرِ فَقَدْ كَفَرَ، وَقَدْ ذَمَّهُ اللَّهُ وَعَابَهُ وَأَوْعَدَهُ بِسَقَرَ، حَيْثُ قَالَ تَعَالَى: {سَأُصْلِيهِ سَقَرَ}، فَلَمَّا أَوْعَدَ اللَّهُ بِسَقَرَ لِمَنْ قَالَ: {إِنْ هَذَا إِلَّا قَوْلُ الْبَشَرِ}؛ عَلِمْنَا وَأَيْقَنَّا أَنَّهُ قَوْلُ خَالِقِ الْبَشَرِ، وَلَا يُشْبِهُ قَوْلَ الْبَشَرِ.' },
      ],
    },
    {
      bookId: 'aqeedah-tahawiyyah',
      chapterIndex: 4,
      title: 'رؤية المؤمنين لربهم في الجنة وأحوال القيامة',
      startPage: 17,
      endPage: 21,
      wordCount: 610,
      paragraphs: [
        { id: 't4-1', isHeading: true, headingLevel: 1, pageNumber: 17, text: 'باب رؤية الله تعالى في الآخرة' },
        { id: 't4-2', pageNumber: 17, text: 'وَالرُّؤْيَةُ حَقٌّ لِأَهْلِ الْجَنَّةِ، بِغَيْرِ إِحَاطَةٍ وَلَا كَيْفِيَّةٍ، كَمَا نَطَقَ بِهِ كِتَابُ رَبِّنَا: {وُجُوهٌ يَوْمَئِذٍ نَاضِرَةٌ * إِلَى رَبِّهَا نَاظِرَةٌ}، وَتَفْسِيرُهُ عَلَى مَا أَرَادَ اللَّهُ تَعَالَى وَعَلِمَهُ، وَكُلُّ مَا جَاءَ فِي ذَلِكَ مِنَ الْحَدِيثِ الصَّحِيحِ عَنِ الرَّسُولِ صلى الله عليه وسلم فَهُوَ كَمَا قَالَ، وَمَعْنَاهُ عَلَى مَا أَرَادَ.' },
      ],
    },
    {
      bookId: 'aqeedah-tahawiyyah',
      chapterIndex: 5,
      title: 'القدر ومشيئة الله وأفعال العباد',
      startPage: 22,
      endPage: 26,
      wordCount: 590,
      paragraphs: [
        { id: 't5-1', isHeading: true, headingLevel: 1, pageNumber: 22, text: 'باب القضاء والقدر' },
        { id: 't5-2', pageNumber: 22, text: 'خَلَقَ الْخَلْقَ بِعِلْمِهِ، وَقَدَّرَ لَهُمْ أَقْدَارًا، وَضَرَبَ لَهُمْ آجَالًا، وَلَمْ يَخْفَ عَلَيْهِ شَيْءٌ قَبْلَ أَنْ يَخْلُقَهُمْ، وَعَلِمَ مَا هُمْ عَامِلُونَ قَبْلَ أَنْ يَخْلُقَهُمْ، وَأَمَرَهُمْ بِطَاعَتِهِ، وَنَهَاهُمْ عَنْ مَعْصِيَتِهِ.' },
        { id: 't5-3', pageNumber: 23, text: 'وَكُلُّ شَيْءٍ يَجْرِي بِتَقْدِيرِهِ وَمَشِيئَتِهِ، وَمَشِيئَتُهُ تَنْفُذُ، لَا مَشِيئَةَ لِلْعِبَادِ إِلَّا مَا شَاءَ لَهُمْ، فَمَا شَاءَ لَهُمْ كَانَ، وَمَا لَمْ يَشَأْ لَمْ يَكُنْ.' },
      ],
    },
    {
      bookId: 'aqeedah-tahawiyyah',
      chapterIndex: 6,
      title: 'الإيمان والصحابة والسمع والطاعة والوسطية',
      startPage: 27,
      endPage: 32,
      wordCount: 590,
      paragraphs: [
        { id: 't6-1', isHeading: true, headingLevel: 1, pageNumber: 27, text: 'باب الإيمان ومحبة صحابة رسول الله صلى الله عليه وسلم' },
        { id: 't6-2', pageNumber: 27, text: 'وَالْإِيمَانُ: هُوَ الْإِقْرَارُ بِاللِّسَانِ، وَالتَّصْدِيقُ بِالْجَنَانِ. وَجَمِيعُ مَا صَحَّ عَنْ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ مِنَ الشَّرْعِ وَالْبَيَانِ كُلُّهُ حَقٌّ.' },
        { id: 't6-3', pageNumber: 28, text: 'وَنُحِبُّ أَصْحَابَ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَلَا نُفَرِّطُ فِي حُبِّ أَحَدٍ مِنْهُمْ، وَلَا نَتَبَرَّأُ مِنْ أَحَدٍ مِنْهُمْ، وَنُبْغِضُ مَنْ يُبْغِضُهُمْ، وَبِغَيْرِ الْخَيْرِ يَذْكُرُهُمْ، وَلَا نَذْكُرُهُمْ إِلَّا بِجَمِيلٍ، وَحُبُّهُمْ دِينٌ وَإِيمَانٌ وَإِحْسَانٌ، وَبُغْضُهُمْ كُفْرٌ وَنِفَاقٌ وَطُغْيَانٌ.' },
        { id: 't6-4', pageNumber: 30, text: 'وَنَرَى الْجَمَاعَةَ حَقًّا وَصَوَابًا، وَالْفُرْقَةَ زَيْغًا وَعَذَابًا. وَدِينُ اللَّهِ فِي الْأَرْضِ وَالسَّمَاءِ وَاحِدٌ، وَهُوَ دِينُ الْإِسْلَامِ، قَالَ اللَّهُ تَعَالَى: {إِنَّ الدِّينَ عِنْدَ اللَّهِ الْإِسْلَامُ}، وَهُوَ بَيْنَ الْغُلُوِّ وَالتَّقْصِيرِ، وَبَيْنَ التَّشْبِيهِ وَالتَّعْطِيلِ، وَبَيْنَ الْجَبْرِ وَالْقَدَرِ، وَبَيْنَ الْأَمْنِ وَالْإِيَاسِ.' },
      ],
    },
  ],
};

// -------------------------------------------------------------
// 2. الأربعون النووية
// -------------------------------------------------------------
const NAWAWIYYAH_BOOK = {
  meta: {
    id: 'arbaeen-nawawiyyah',
    title: 'الأربعون النووية مع الشرح والفوائد',
    subtitle: 'أصح الأحاديث النبوية الجامعة لقواعد الإسلام ومبانيه العظام',
    author: 'الإمام محيي الدين يحيى بن شرف النووي',
    authorDeath: '676 هـ',
    investigator: 'محققة ومراجعة ومبوبة فقهياً',
    category: 'sunnah',
    era: 'classical',
    language: 'ar',
    totalVolumes: 1,
    totalPages: 48,
    totalChapters: 4,
    totalWords: 4200,
    hasFacsimilePdf: true,
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/sunnah/Arbaoon_Nawawia.pdf',
    coverGradient: 'from-emerald-950 via-teal-950 to-stone-950',
    accentColor: '#059669',
    description: 'كتاب جامع لأهم قواعد وأصول الدين الإسلامي في اثنين وأربعين حديثاً شريفاً اختارها الإمام النووي بعناية فائقة لتدور عليها أحكام الإسلام ومقاصد الشريعة.',
    tags: ['حديث', 'الأربعون النووية', 'النووي', 'سنة', 'قواعد الشريعة'],
    featured: true,
  },
  toc: [
    { id: 'nawawi-c1', title: 'المقدمة وأحاديث الإخلاص وأركان الإسلام والإيمان والإحسان', chapterIndex: 1, pageNumber: 1, level: 1 },
    { id: 'nawawi-c2', title: 'أحاديث الحلال والحرام وحرمة الدماء والنصيحة والتقوى', chapterIndex: 2, pageNumber: 13, level: 1 },
    { id: 'nawawi-c3', title: 'أحاديث مكارم الأخلاق وحفظ اللسان والزهد وبر الوالدين', chapterIndex: 3, pageNumber: 25, level: 1 },
    { id: 'nawawi-c4', title: 'أحاديث تفريج الكربات ومحبة الله وسعة المغفرة والختام', chapterIndex: 4, pageNumber: 37, level: 1 },
  ],
  chunks: [
    {
      bookId: 'arbaeen-nawawiyyah',
      chapterIndex: 1,
      title: 'المقدمة وأحاديث الإخلاص وأركان الإسلام والإيمان والإحسان',
      startPage: 1,
      endPage: 12,
      wordCount: 1100,
      paragraphs: [
        { id: 'n1-1', isHeading: true, headingLevel: 1, pageNumber: 1, text: 'الحديث الأول: إنما الأعمال بالنيات' },
        { id: 'n1-2', pageNumber: 1, text: 'عَنْ أَمِيرِ الْمُؤْمِنِينَ أَبِي حَفْصٍ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوِ امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ». رَوَاهُ إِمَامَا الْمُحَدِّثِينَ: أَبُو عَبْدِ اللَّهِ مُحَمَّدُ بْنُ إِسْمَاعِيلَ بْنِ إِبْرَاهِيمَ بْنِ الْمُغِيرَةِ بْنِ بَرْدِزْبَهْ الْبُخَارِيُّ، وَأَبُو الْحُسَيْنِ مُسْلِمُ بْنُ الْحَجَّاجِ بْنِ مُسْلِمٍ الْقُشَيْرِيُّ النَّيْسَابُورِيُّ فِي صَحِيحَيْهِمَا اللَّذَيْنِ هُمَا أَصَحُّ الْكُتُبِ الْمُصَنَّفَةِ.' },
        { id: 'n1-3', isHeading: true, headingLevel: 1, pageNumber: 4, text: 'الحديث الثاني: حديث جبريل عليه السلام في بيان مراتب الدين' },
        { id: 'n1-4', pageNumber: 4, text: 'عَنْ عُمَرَ رَضِيَ اللَّهُ عَنْهُ أَيْضًا قَالَ: بَيْنَمَا نَحْنُ جُلُوسٌ عِنْدَ رَسُولِ اللَّهِ صلى الله عليه وسلم ذَاتَ يَوْمٍ إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ، شَدِيدُ سَوَادِ الشَّعْرِ، لا يُرَى عَلَيْهِ أَثَرُ السَّفَرِ، وَلا يَعْرِفُهُ مِنَّا أَحَدٌ، حَتَّى جَلَسَ إِلَى النَّبِيِّ صلى الله عليه وسلم، فَأَسْنَدَ رُكْبَتَيْهِ إِلَى رُكْبَتَيْهِ، وَوَضَعَ كَفَّيْهِ عَلَى فَخِذَيْهِ، وَقَالَ: يَا مُحَمَّدُ، أَخْبِرْنِي عَنِ الإِسْلامِ؟ فَقَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم: «الإِسْلامُ أَنْ تَشْهَدَ أَنْ لا إِلَهَ إِلا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَتُقِيمَ الصَّلاةَ، وَتُؤْتِيَ الزَّكَاةَ، وَتَصُومَ رَمَضَانَ، وَتَحُجَّ الْبَيْتَ إِنِ اسْتَطَعْتَ إِلَيْهِ سَبِيلاً» قَالَ: صَدَقْتَ. فَعَجِبْنَا لَهُ يَسْأَلُهُ وَيُصَدِّقُهُ!' },
        { id: 'n1-5', pageNumber: 6, text: 'قَالَ: فَأَخْبِرْنِي عَنِ الإِيمَانِ؟ قَالَ: «أَنْ تُؤْمِنَ بِاللَّهِ، وَمَلائِكَتِهِ، وَكُتُبِهِ، وَرُسُلِهِ، وَالْيَوْمِ الآخِرِ، وَتُؤْمِنَ بِالْقَدَرِ خَيْرِهِ وَشَرِّهِ» قَالَ: صَدَقْتَ. قَالَ: فَأَخْبِرْنِي عَنِ الإِحْسَانِ؟ قَالَ: «أَنْ تَعْبُدَ اللَّهَ كَأَنَّكَ تَرَاهُ، فَإِنْ لَمْ تَكُنْ تَرَاهُ فَإِنَّهُ يَرَاكَ».' },
        { id: 'n1-6', pageNumber: 8, text: 'قَالَ: فَأَخْبِرْنِي عَنِ السَّاعَةِ؟ قَالَ: «مَا الْمَسْئُولُ عَنْهَا بِأَعْلَمَ مِنَ السَّائِلِ» قَالَ: فَأَخْبِرْنِي عَنْ أَمَارَاتِهَا؟ قَالَ: «أَنْ تَلِدَ الأَمَةُ رَبَّتَهَا، وَأَنْ تَرَى الْحُفَاةَ الْعُرَاةَ الْعَالَةَ رِعَاءَ الشَّاءِ يَتَطَاوَلُونَ فِي الْبُنْيَانِ». ثُمَّ انْطَلَقَ فَلَبِثْتُ مَلِيًّا، ثُمَّ قَالَ لِي: «يَا عُمَرُ، أَتَدْرِي مَنِ السَّائِلُ؟» قُلْتُ: اللَّهُ وَرَسُولُهُ أَعْلَمُ. قَالَ: «فَإِنَّهُ جِبْرِيلُ أَتَاكُمْ يُعَلِّمُكُمْ دِينَكُمْ». رَوَاهُ مُسْلِمٌ.' },
      ],
    },
    {
      bookId: 'arbaeen-nawawiyyah',
      chapterIndex: 2,
      title: 'أحاديث الحلال والحرام وحرمة الدماء والنصيحة والتقوى',
      startPage: 13,
      endPage: 24,
      wordCount: 1050,
      paragraphs: [
        { id: 'n2-1', isHeading: true, headingLevel: 1, pageNumber: 13, text: 'الحديث السادس: الحلال بين والحرام بين' },
        { id: 'n2-2', pageNumber: 13, text: 'عَنْ أَبِي عَبْدِ اللَّهِ النُّعْمَانِ بْنِ بَشِيرٍ رَضِيَ اللَّهُ عَنْهُمَا قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ: «إِنَّ الْحَلالَ بَيِّنٌ وَإِنَّ الْحَرَامَ بَيِّنٌ، وَبَيْنَهُمَا أُمُورٌ مُشْتَبِهَاتٌ لا يَعْلَمُهُنَّ كَثِيرٌ مِنَ النَّاسِ، فَمَنِ اتَّقَى الشُّبُهَاتِ اسْتَبْرَأَ لِدِينِهِ وَعِرْضِهِ، وَمَنْ وَقَعَ فِي الشُّبُهَاتِ وَقَعَ فِي الْحَرَامِ، كَالرَّاعِي يَرْعَى حَوْلَ الْحِمَى يُوشِكُ أَنْ يَرْتَعَ فِيهِ، أَلا وَإِنَّ لِكُلِّ مَلِكٍ حِمًى، أَلا وَإِنَّ حِمَى اللَّهِ مَحَارِمُهُ، أَلا وَإِنَّ فِي الْجَسَدِ مُضْغَةً إِذَا صَلَحَتْ صَلَحَ الْجَسَدُ كُلُّهُ، وَإِذَا فَسَدَتْ فَسَدَ الْجَسَدُ كُلُّهُ، أَلا وَهِيَ الْقَلْبُ». رَوَاهُ الْبُخَارِيُّ وَمُسْلِمٌ.' },
        { id: 'n2-3', isHeading: true, headingLevel: 1, pageNumber: 16, text: 'الحديث السابع: الدين النصيحة' },
        { id: 'n2-4', pageNumber: 16, text: 'عَنْ أَبِي رُقَيَّةَ تَمِيمِ بْنِ أَوْسٍ الدَّارِيِّ رَضِيَ اللَّهُ عَنْهُ أَنَّ النَّبِيَّ صلى الله عليه وسلم قَالَ: «الدِّينُ النَّصِيحَةُ». قُلْنَا: لِمَنْ؟ قَالَ: «لِلَّهِ، وَلِكِتَابِهِ، وَلِرَسُولِهِ، وَلأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ». رَوَاهُ مُسْلِمٌ.' },
      ],
    },
    {
      bookId: 'arbaeen-nawawiyyah',
      chapterIndex: 3,
      title: 'أحاديث مكارم الأخلاق وحفظ اللسان والزهد وبر الوالدين',
      startPage: 25,
      endPage: 36,
      wordCount: 980,
      paragraphs: [
        { id: 'n3-1', isHeading: true, headingLevel: 1, pageNumber: 25, text: 'الحديث الخامس عشر: إكرام الضيف وحفظ اللسان' },
        { id: 'n3-2', pageNumber: 25, text: 'عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ: «مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيُكْرِمْ ضَيْفَهُ». رَوَاهُ الْبُخَارِيُّ وَمُسْلِمٌ.' },
        { id: 'n3-3', isHeading: true, headingLevel: 1, pageNumber: 28, text: 'الحديث السادس عشر: النهي عن الغضب' },
        { id: 'n3-4', pageNumber: 28, text: 'عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ أَنَّ رَجُلاً قَالَ لِلنَّبِيِّ صلى الله عليه وسلم: أَوْصِنِي. قَالَ: «لا تَغْضَبْ». فَرَدَّدَ مِرَارًا، قَالَ: «لا تَغْضَبْ». رَوَاهُ الْبُخَارِيُّ.' },
      ],
    },
    {
      bookId: 'arbaeen-nawawiyyah',
      chapterIndex: 4,
      title: 'أحاديث تفريج الكربات ومحبة الله وسعة المغفرة والختام',
      startPage: 37,
      endPage: 48,
      wordCount: 1020,
      paragraphs: [
        { id: 'n4-1', isHeading: true, headingLevel: 1, pageNumber: 37, text: 'الحديث السادس والثلاثون: قضاء حوائج المسلمين وفضل مجالس العلم' },
        { id: 'n4-2', pageNumber: 37, text: 'عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ: «مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ، وَمَنْ يَسَّرَ عَلَى مُعْسِرٍ يَسَّرَ اللَّهُ عَلَيْهِ فِي الدُّنْيَا وَالآخِرَةِ، وَمَنْ سَتَرَ مُسْلِمًا سَتَرَهُ اللَّهُ فِي الدُّنْيَا وَالآخِرَةِ، وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ، وَمَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ، وَمَا اجْتَمَعَ قَوْمٌ فِي بَيْتٍ مِنْ بُيُوتِ اللَّهِ يَتْلُونَ كِتَابَ اللَّهِ وَيَتَدَارَسُونَهُ بَيْنَهُمْ إِلا نَزَلَتْ عَلَيْهِمُ السَّكِينَةُ، وَغَشِيَتْهُمُ الرَّحْمَةُ، وَحَفَّتْهُمُ الْمَلائِكَةُ، وَذَكَرَهُمُ اللَّهُ فِيمَنْ عِنْدَهُ، وَمَنْ بَطَّأَ بِهِ عَمَلُهُ لَمْ يُسْرِعْ بِهِ نَسَبُهُ». رَوَاهُ مُسْلِمٌ.' },
      ],
    },
  ],
};

// -------------------------------------------------------------
// 3. كتاب التوحيد للإمام المجدد محمد بن عبد الوهاب
// -------------------------------------------------------------
const KITAB_TAWHID_BOOK = {
  meta: {
    id: 'kitab-at-tawhid',
    title: 'كتاب التوحيد الذي هو حق الله على العبيد',
    subtitle: 'بيان أدلة التوحيد الخالص والتحذير من الشرك الأكبر والأصغر وذرائعه',
    author: 'الإمام المجدد شيخ الإسلام محمد بن عبد الوهاب',
    authorDeath: '1206 هـ',
    investigator: 'طبعة محققة مع عزو الآيات وتخريج الأحاديث',
    category: 'aqeedah',
    era: 'contemporary',
    language: 'ar',
    totalVolumes: 1,
    totalPages: 64,
    totalChapters: 5,
    totalWords: 5800,
    hasFacsimilePdf: true,
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/shobohat/Kitab_Attawhid.pdf',
    coverGradient: 'from-amber-950 via-yellow-950 to-stone-950',
    accentColor: '#ca8a04',
    description: 'أعظم مصنفات التوحيد في القرون المتأخرة، رتبه المؤلف على أبواب الآيات والأحاديث والآثار الدالة على إفراد الله بالعبادة وتجريد التوحيد من شوائب الشرك والبدع.',
    tags: ['توحيد', 'عقيدة', 'محمد بن عبد الوهاب', 'أصول الدين'],
    featured: true,
  },
  toc: [
    { id: 'tawhid-c1', title: 'باب فضل التوحيد وما يكفر من الذنوب وباب من حقق التوحيد دخل الجنة بغير حساب', chapterIndex: 1, pageNumber: 1, level: 1 },
    { id: 'tawhid-c2', title: 'باب الخوف من الشرك والدعاء إلى شهادة أن لا إله إلا الله وتفسير التوحيد', chapterIndex: 2, pageNumber: 14, level: 1 },
    { id: 'tawhid-c3', title: 'باب من الشرك لبس الحلقة والخيط وباب ما جاء في الرقى والتمائم والتبرك', chapterIndex: 3, pageNumber: 27, level: 1 },
    { id: 'tawhid-c4', title: 'باب ما جاء في الذبح والنذر لغير الله والاستعاذة والاستعانة', chapterIndex: 4, pageNumber: 40, level: 1 },
    { id: 'tawhid-c5', title: 'باب الشفاعة وباب الغلو في الصالحين وقبورهم وحماية جناب التوحيد', chapterIndex: 5, pageNumber: 52, level: 1 },
  ],
  chunks: [
    {
      bookId: 'kitab-at-tawhid',
      chapterIndex: 1,
      title: 'باب فضل التوحيد وما يكفر من الذنوب وباب من حقق التوحيد دخل الجنة بغير حساب',
      startPage: 1,
      endPage: 13,
      wordCount: 1250,
      paragraphs: [
        { id: 'kt1-1', isHeading: true, headingLevel: 1, pageNumber: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ - كِتَابُ التَّوْحِيدِ' },
        { id: 'kt1-2', pageNumber: 1, text: 'وَقَوْلُ اللَّهِ تَعَالَى: {وَمَا خَلَقْتُ الْجِنَّ وَالْإِنْسَ إِلَّا لِيَعْبُدُونِ}، وَقَوْلُهُ: {وَلَقَدْ بَعَثْنَا فِي كُلِّ أُمَّةٍ رَسُولًا أَنِ اعْبُدُوا اللَّهَ وَاجْتَنِبُوا الطَّاغُوتَ}، وَقَوْلُهُ: {وَقَضَى رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا}.' },
        { id: 'kt1-3', pageNumber: 3, text: 'وَعَنْ مُعَاذِ بْنِ جَبَلٍ رَضِيَ اللَّهُ عَنْهُ قَالَ: كُنْتُ رَدِيفَ النَّبِيِّ صلى الله عليه وسلم عَلَى حِمَارٍ، فَقَالَ لِي: «يَا مُعَاذُ، أَتَدْرِي مَا حَقُّ اللَّهِ عَلَى الْعِبَادِ، وَمَا حَقُّ الْعِبَادِ عَلَى اللَّهِ؟» قُلْتُ: اللَّهُ وَرَسُولُهُ أَعْلَمُ. قَالَ: «حَقُّ اللَّهِ عَلَى الْعِبَادِ أَنْ يَعْبُدُوهُ وَلَا يُشْرِكُوا بِهِ شَيْئًا، وَحَقُّ الْعِبَادِ عَلَى اللَّهِ أَنْ لَا يُعَذِّبَ مَنْ لَا يُشْرِكُ بِهِ شَيْئًا» قُلْتُ: يَا رَسُولَ اللَّهِ، أَفَلَا أُبَشِّرُ النَّاسَ؟ قَالَ: «لَا تُبَشِّرْهُمْ فَيَتَّكِلُوا». أَخْرَجَاهُ فِي الصَّحِيحَيْنِ.' },
      ],
    },
    {
      bookId: 'kitab-at-tawhid',
      chapterIndex: 2,
      title: 'باب الخوف من الشرك والدعاء إلى شهادة أن لا إله إلا الله وتفسير التوحيد',
      startPage: 14,
      endPage: 26,
      wordCount: 1180,
      paragraphs: [
        { id: 'kt2-1', isHeading: true, headingLevel: 1, pageNumber: 14, text: 'باب الخوف من الشرك' },
        { id: 'kt2-2', pageNumber: 14, text: 'وَقَوْلُ اللَّهِ عَزَّ وَجَلَّ: {إِنَّ اللَّهَ لَا يَغْفِرُ أَنْ يُشْرَكَ بِهِ وَيَغْفِرُ مَا دُونَ ذَلِكَ لِمَنْ يَشَاءُ}، وَقَالَ الْخَلِيلُ عَلَيْهِ السَّلَامُ: {وَاجْنُبْنِي وَبَنِيَّ أَنْ نَعْبُدَ الْأَصْنَامَ}.' },
      ],
    },
    {
      bookId: 'kitab-at-tawhid',
      chapterIndex: 3,
      title: 'باب من الشرك لبس الحلقة والخيط وباب ما جاء في الرقى والتمائم والتبرك',
      startPage: 27,
      endPage: 39,
      wordCount: 1100,
      paragraphs: [
        { id: 'kt3-1', isHeading: true, headingLevel: 1, pageNumber: 27, text: 'باب من الشرك لبس الحلقة والخيط ونحوهما لرفع البلاء أو دفعه' },
        { id: 'kt3-2', pageNumber: 27, text: 'وَقَوْلُ اللَّهِ تَعَالَى: {قُلْ أَفَرَأَيْتُمْ مَا تَدْعُونَ مِنْ دُونِ اللَّهِ إِنْ أَرَادَنِيَ اللَّهُ بِضُرٍّ هَلْ هُنَّ كَاشِفَاتُ ضُرِّهِ أَوْ أَرَادَنِي بِرَحْمَةٍ هَلْ هُنَّ مُمْسِكَاتُ رَحْمَتِهِ قُلْ حَسْبِيَ اللَّهُ عَلَيْهِ يَتَوَكَّلُ الْمُتَوَكِّلُونَ}.' },
      ],
    },
    {
      bookId: 'kitab-at-tawhid',
      chapterIndex: 4,
      title: 'باب ما جاء في الذبح والنذر لغير الله والاستعاذة والاستعانة',
      startPage: 40,
      endPage: 51,
      wordCount: 1120,
      paragraphs: [
        { id: 'kt4-1', isHeading: true, headingLevel: 1, pageNumber: 40, text: 'باب ما جاء في الذبح لغير الله' },
        { id: 'kt4-2', pageNumber: 40, text: 'وَقَوْلُ اللَّهِ تَعَالَى: {قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ * لَا شَرِيكَ لَهُ وَبِذَلِكَ أُمِرْتُ وَأَنَا أَوَّلُ الْمُسْلِمِينَ}.' },
      ],
    },
    {
      bookId: 'kitab-at-tawhid',
      chapterIndex: 5,
      title: 'باب الشفاعة وباب الغلو في الصالحين وقبورهم وحماية جناب التوحيد',
      startPage: 52,
      endPage: 64,
      wordCount: 1150,
      paragraphs: [
        { id: 'kt5-1', isHeading: true, headingLevel: 1, pageNumber: 52, text: 'باب الشفاعة' },
        { id: 'kt5-2', pageNumber: 52, text: 'وَقَوْلُ اللَّهِ عَزَّ وَجَلَّ: {وَأَنْذِرْ بِهِ الَّذِينَ يَخَافُونَ أَنْ يُحْشَرُوا إِلَى رَبِّهِمْ لَيْسَ لَهُمْ مِنْ دُونِهِ وَلِيٌّ وَلَا شَفِيعٌ لَعَلَّهُمْ يَتَّقُونَ}.' },
      ],
    },
  ],
};

// -------------------------------------------------------------
// 4. متن الورقات في أصول الفقه
// -------------------------------------------------------------
const WARAQAT_BOOK = {
  meta: {
    id: 'matn-al-waraqat',
    title: 'متن الورقات في أصول الفقه',
    subtitle: 'المتن الأصولي الميسر للمبتدئين في مدارك الأحكام الشرعية',
    author: 'إمام الحرمين أبو المعالي عبد الملك بن عبد الله الجويني',
    authorDeath: '478 هـ',
    investigator: 'محقق ومضبوط بالشكل التام',
    category: 'usul',
    era: 'classical',
    language: 'ar',
    totalVolumes: 1,
    totalPages: 24,
    totalChapters: 3,
    totalWords: 2100,
    hasFacsimilePdf: true,
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/fiqh/Matn_Alwaraqat.pdf',
    coverGradient: 'from-blue-950 via-indigo-950 to-stone-950',
    accentColor: '#3b82f6',
    description: 'الورقات لإمام الحرمين الجويني هو أشهر متون علم أصول الفقه، جمع فيه زبدة مباحث الأحكام والأدلة الشرعية والدلالات والقياس والاجتهاد والفتيا بأسلوب وجيز دقيق.',
    tags: ['أصول الفقه', 'الجويني', 'متون', 'فقه', 'الورقات'],
    featured: true,
  },
  toc: [
    { id: 'waraqat-c1', title: 'مقدمة في تعريف أصول الفقه وأقسام الأحكام الشرعية وأبواب الكلام', chapterIndex: 1, pageNumber: 1, level: 1 },
    { id: 'waraqat-c2', title: 'الأمر والنهي والعام والخاص والمجمل والمبين والظاهر والمؤول', chapterIndex: 2, pageNumber: 9, level: 1 },
    { id: 'waraqat-c3', title: 'الأفعال والنسخ والإجماع والأخبار والقياس والاجتهاد وشروط المفتي', chapterIndex: 3, pageNumber: 17, level: 1 },
  ],
  chunks: [
    {
      bookId: 'matn-al-waraqat',
      chapterIndex: 1,
      title: 'مقدمة في تعريف أصول الفقه وأقسام الأحكام الشرعية وأبواب الكلام',
      startPage: 1,
      endPage: 8,
      wordCount: 750,
      paragraphs: [
        { id: 'w1-1', isHeading: true, headingLevel: 1, pageNumber: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ' },
        { id: 'w1-2', pageNumber: 1, text: 'قَالَ الشَّيْخُ الإِمَامُ ضِيَاءُ الدِّينِ أَبُو الْمَعَالِي عَبْدُ الْمَلِكِ بْنُ عَبْدِ اللَّهِ بْنِ يُوسُفَ بْنِ مُحَمَّدٍ الْجُوَيْنِيُّ رَحِمَهُ اللَّهُ: هَذِهِ وَرَقَاتٌ تَشْتَمِلُ عَلَى مَعْرِفَةِ فُصُولٍ مِنْ أُصُولِ الْفِقْهِ، وَذَلِكَ مُؤَلَّفٌ مِنْ جُزْأَيْنِ مُفْرَدَيْنِ: أَحَدُهُمَا «الأُصُولُ»، وَالثَّانِي «الْفِقْهُ».' },
        { id: 'w1-3', pageNumber: 2, text: 'فَالأَصْلُ: مَا يُبْنَى عَلَيْهِ غَيْرُهُ. وَالْفَرْعُ: مَا يُبْنَى عَلَى غَيْرِهِ. وَالْفِقْهُ: مَعْرِفَةُ الأَحْكَامِ الشَّرْعِيَّةِ الَّتِي طَرِيقُهَا الاجْتِهَادُ.' },
        { id: 'w1-4', isHeading: true, headingLevel: 2, pageNumber: 3, text: 'أقسام الأحكام الشرعية التكليفية والوضعية' },
        { id: 'w1-5', pageNumber: 3, text: 'وَالأَحْكَامُ سَبْعَةٌ: الْوَاجِبُ، وَالْمَنْدُوبُ، وَالْمُبَاحُ، وَالْمَحْظُورُ (الْحَرَامُ)، وَالْمَكْرُوهُ، وَالصَّحِيحُ، وَالْبَاطِلُ.' },
      ],
    },
    {
      bookId: 'matn-al-waraqat',
      chapterIndex: 2,
      title: 'الأمر والنهي والعام والخاص والمجمل والمبين والظاهر والمؤول',
      startPage: 9,
      endPage: 16,
      wordCount: 680,
      paragraphs: [
        { id: 'w2-1', isHeading: true, headingLevel: 1, pageNumber: 9, text: 'فصل في الأمر والنهي' },
        { id: 'w2-2', pageNumber: 9, text: 'وَالأَمْرُ: اسْتِدْعَاءُ الْفِعْلِ بِالْقَوْلِ مِمَّنْ هُوَ دُونَهُ عَلَى سَبِيلِ الْوُجُوبِ، وَصِيغَتُهُ «افْعَلْ»، وَهِيَ عِنْدَ الإِطْلاقِ وَالتَّجَرُّدِ عَنِ الْقَرِينَةِ تُحْمَلُ عَلَيْهِ، إِلا مَا دَلَّ الدَّلِيلُ عَلَى أَنَّ الْمُرَادَ مِنْهُ النَّدْبُ أَوِ الإِبَاحَةُ.' },
      ],
    },
    {
      bookId: 'matn-al-waraqat',
      chapterIndex: 3,
      title: 'الأفعال والنسخ والإجماع والأخبار والقياس والاجتهاد وشروط المفتي',
      startPage: 17,
      endPage: 24,
      wordCount: 670,
      paragraphs: [
        { id: 'w3-1', isHeading: true, headingLevel: 1, pageNumber: 17, text: 'فصل في الإجماع والقياس' },
        { id: 'w3-2', pageNumber: 17, text: 'وَأَمَّا الإِجْمَاعُ: فَهُوَ اتِّفَاقُ عُلَمَاءِ أَهْلِ الْعَصْرِ عَلَى حُكْمِ الْحَادِثَةِ، وَنَعْنِي بِالْعُلَمَاءِ الْفُقَهَاءَ، وَنَعْنِي بِالْحَادِثَةِ الْحَادِثَةَ الشَّرْعِيَّةَ. وَإِجْمَاعُ هَذِهِ الأُمَّةِ حُجَّةٌ دُونَ غَيْرِهَا لِقَوْلِهِ صلى الله عليه وسلم: «لا تَجْتَمِعُ أُمَّتِي عَلَى ضَلالَةٍ».' },
      ],
    },
  ],
};

// -------------------------------------------------------------
// 5. الرحيق المختوم
// -------------------------------------------------------------
const RAHEEQ_BOOK = {
  meta: {
    id: 'ar-raheeq-al-makhtum',
    title: 'الرحيق المختوم',
    subtitle: 'بحث في السيرة النبوية على صاحبها أفضل الصلاة وأزكى التسليم',
    author: 'فضيلة الشيخ صفي الرحمن المباركفوري',
    authorDeath: '1427 هـ',
    investigator: 'الحائز على الجائزة الأولى في مسابقة السيرة النبوية العالمية',
    category: 'seerah',
    era: 'contemporary',
    language: 'ar',
    totalVolumes: 1,
    totalPages: 120,
    totalChapters: 4,
    totalWords: 12500,
    hasFacsimilePdf: true,
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/history/Arraheeq_Almakhtoom.pdf',
    coverGradient: 'from-rose-950 via-red-950 to-stone-950',
    accentColor: '#e11d48',
    description: 'الكتاب الفائز بالمركز الأول في مسابقة رابطة العالم الإسلامي للسيرة النبوية، يتميز بعذوبة الأسلوب ودقة التحقيق التاريخي والتوثيق من أصح كتب السنة ودواوين الأثر.',
    tags: ['سيرة نبوية', 'الرحيق المختوم', 'المباركفوري', 'تاريخ إسلامي', 'النبي محمد'],
    featured: true,
  },
  toc: [
    { id: 'raheeq-c1', title: 'موقع العرب وأقوامها والحالة الدينية والاجتماعية قبل الإسلام', chapterIndex: 1, pageNumber: 1, level: 1 },
    { id: 'raheeq-c2', title: 'النسب النبوي الشريف والمولد والنشأة حتى البعثة النبوية', chapterIndex: 2, pageNumber: 25, level: 1 },
    { id: 'raheeq-c3', title: 'العهد المكي: فجر النبوة والدعوة سراً وجهراً ومحن المسلمين حتى الهجرة', chapterIndex: 3, pageNumber: 55, level: 1 },
    { id: 'raheeq-c4', title: 'العهد المدني: تأسيس المجتمع الإسلامي والغزوات الكبرى وفتح مكة والرفيق الأعلى', chapterIndex: 4, pageNumber: 88, level: 1 },
  ],
  chunks: [
    {
      bookId: 'ar-raheeq-al-makhtum',
      chapterIndex: 1,
      title: 'موقع العرب وأقوامها والحالة الدينية والاجتماعية قبل الإسلام',
      startPage: 1,
      endPage: 24,
      wordCount: 2800,
      paragraphs: [
        { id: 'r1-1', isHeading: true, headingLevel: 1, pageNumber: 1, text: 'موقع العرب وأقوامها' },
        { id: 'r1-2', pageNumber: 1, text: 'السيرة النبوية في الحقيقة ليست إلا عبارة عن الرسالة التي حملها رسول الله صلى الله عليه وسلم إلى المجتمع البشري، فأخرجه بها من الظلمات إلى النور، ومن عبادة العباد إلى عبادة الله وحده.' },
        { id: 'r1-3', pageNumber: 3, text: 'تقع شبه جزيرة العرب في الجنوب الغربي من قارة آسيا، وهي محاطة بالبحار والرمال من جهاتها الأربع، مما جعلها حصناً منيعاً لا يسهل للأجانب احتلاله ومد نفوذهم إليه، ولذلك نرى أهل الجزيرة عاشوا أحراراً طلقاء منذ أقدم العصور.' },
      ],
    },
    {
      bookId: 'ar-raheeq-al-makhtum',
      chapterIndex: 2,
      title: 'النسب النبوي الشريف والمولد والنشأة حتى البعثة النبوية',
      startPage: 25,
      endPage: 54,
      wordCount: 3100,
      paragraphs: [
        { id: 'r2-1', isHeading: true, headingLevel: 1, pageNumber: 25, text: 'النسب النبوي الطاهر والأسرة المصطفوية' },
        { id: 'r2-2', pageNumber: 25, text: 'نسب نبينا صلى الله عليه وسلم ينقسم إلى ثلاثة أجزاء: جزء اتفق عليه كافة أهل السير والأنساب، وهو إلى عدنان. وجزء اختلفوا فيه ما بين عدنان إلى إبراهيم عليه السلام. وجزء لا شك فيه أنه غير صحيح، وهو ما بعد إبراهيم إلى آدم عليه السلام.' },
        { id: 'r2-3', pageNumber: 27, text: 'فالجزء الأول: محمد بن عبد الله بن عبد المطلب بن هاشم بن عبد مناف بن قصي بن كلاب بن مرة بن كعب بن لؤي بن غالب بن فهر (وهو قريش وإليه تنتسب القبيلة) بن مالك بن النضر بن كنانة بن خزيمة بن مدركة بن إلياس بن مضر بن نزار بن معد بن عدنان.' },
      ],
    },
    {
      bookId: 'ar-raheeq-al-makhtum',
      chapterIndex: 3,
      title: 'العهد المكي: فجر النبوة والدعوة سراً وجهراً ومحن المسلمين حتى الهجرة',
      startPage: 55,
      endPage: 87,
      wordCount: 3400,
      paragraphs: [
        { id: 'r3-1', isHeading: true, headingLevel: 1, pageNumber: 55, text: 'في ظلال النبوة والرسالة وبدء نزول الوحي' },
        { id: 'r3-2', pageNumber: 55, text: 'لما تقاربت سنه صلى الله عليه وسلم الأربعين حبب إليه الخلاء، فكان يخلو بغار حراء يتحنث فيه - وهو التعبد - الليالي ذوات العدد، حتى جاءه الحق وهو في غار حراء، فجاءه الملك فقال: اقرأ، قال: ما أنا بقارئ...' },
      ],
    },
    {
      bookId: 'ar-raheeq-al-makhtum',
      chapterIndex: 4,
      title: 'العهد المدني: تأسيس المجتمع الإسلامي والغزوات الكبرى وفتح مكة والرفيق الأعلى',
      startPage: 88,
      endPage: 120,
      wordCount: 3200,
      paragraphs: [
        { id: 'r4-1', isHeading: true, headingLevel: 1, pageNumber: 88, text: 'تأسيس المجتمع الجديد وبناء المسجد النبوي والمؤاخاة' },
        { id: 'r4-2', pageNumber: 88, text: 'كان أول خطوة خطاها رسول الله صلى الله عليه وسلم بعد وصوله المدينة هي بناء المسجد النبوي الشريف، ليكون مركزاً للعبادة ومنارة للعلم والشورى وإدارة شؤون الأمة الوليدة.' },
      ],
    },
  ],
};

const ALL_BOOKS = [
  TAHAWIYYAH_BOOK,
  NAWAWIYYAH_BOOK,
  KITAB_TAWHID_BOOK,
  WARAQAT_BOOK,
  RAHEEQ_BOOK,
];

export async function generateEBookShards() {
  console.log('\n📚 Starting Islamic Pure-Text E-Book Shard Generator...\n');

  if (!fs.existsSync(OUTPUT_BASE)) {
    fs.mkdirSync(OUTPUT_BASE, { recursive: true });
  }

  const catalog = [];

  for (const bookData of ALL_BOOKS) {
    const bookDir = path.join(OUTPUT_BASE, bookData.meta.id);
    const chunksDir = path.join(bookDir, 'chunks');

    if (!fs.existsSync(chunksDir)) {
      fs.mkdirSync(chunksDir, { recursive: true });
    }

    // 1. Write individual chapter chunks
    let totalBookBytes = 0;
    for (const chunk of bookData.chunks) {
      const chunkFile = path.join(chunksDir, `chunk_${chunk.chapterIndex}.json`);
      const chunkJson = JSON.stringify(chunk);
      fs.writeFileSync(chunkFile, chunkJson, 'utf-8');
      totalBookBytes += Buffer.byteLength(chunkJson, 'utf-8');
    }

    // 2. Write metadata + TOC
    const metaPayload = {
      meta: bookData.meta,
      toc: bookData.toc,
    };
    const metaFile = path.join(bookDir, 'meta.json');
    const metaJson = JSON.stringify(metaPayload);
    fs.writeFileSync(metaFile, metaJson, 'utf-8');
    totalBookBytes += Buffer.byteLength(metaJson, 'utf-8');

    // 3. Build & write compact in-book search index
    const searchIndex = buildSearchIndex(bookData.chunks);
    const searchIndexFile = path.join(bookDir, 'search_index.json');
    const searchIndexJson = JSON.stringify(searchIndex);
    fs.writeFileSync(searchIndexFile, searchIndexJson, 'utf-8');
    totalBookBytes += Buffer.byteLength(searchIndexJson, 'utf-8');

    const totalKB = (totalBookBytes / 1024).toFixed(1);
    console.log(`✅ [${bookData.meta.id}] ${bookData.meta.title} (${bookData.chunks.length} chunks, ${totalKB} KB total)`);

    catalog.push(bookData.meta);
  }

  // 4. Write catalog.json
  const catalogFile = path.join(OUTPUT_BASE, 'catalog.json');
  const catalogJson = JSON.stringify(catalog, null, 2);
  fs.writeFileSync(catalogFile, catalogJson, 'utf-8');

  const catalogSizeKB = (Buffer.byteLength(catalogJson, 'utf-8') / 1024).toFixed(1);
  console.log(`\n🎉 E-Book Catalog Generated Successfully:`);
  console.log(`   - Output Path: ${OUTPUT_BASE}`);
  console.log(`   - Master Catalog: ${catalogFile} (${catalogSizeKB} KB)`);
  console.log(`   - Total Pure-Text Works: ${catalog.length}\n`);

  return { count: catalog.length, catalog };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('generate_ebook_shards.mjs')) {
  generateEBookShards().catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}
