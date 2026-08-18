'use client';

import { create } from 'zustand';
import type { MediaItem } from '@/lib/types';
import { loadRepositories } from '@/lib/repositories';
import { fetchJsonWithFallback } from '@/lib/fetcher';
import { normalizeContentFile } from '@/lib/sheikh';
import { normalizeArabic } from '@/lib/arabic-normalizer';
import { fetchEBookCatalog } from '@/lib/book-text-engine';
import { searchBooksWithIntent } from '@/lib/book-intent-engine';

export interface BookCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const BOOK_CATEGORIES: BookCategory[] = [
  { id: 'all', name: 'جميع الكتب', emoji: '📚', description: 'تصفح كافة كتب ومصنفات المكتبة الإسلامية' },
  { id: 'shamela', name: 'المكتبة الشاملة الكاملة (8,589 كتاباً محققاً)', emoji: '🏛️', description: 'المكتبة الشاملة الكبرى بأمهات كتب التراث الإسلامي محققة وموافقة للمطبوع' },
  { id: 'ebook_pure_text', name: 'الكتب النصية الحية (خفيفة وفورية)', emoji: '⚡', description: 'أمهات كتب التراث بنصوص رقمية حية فائقة السرعة وقابلة للتخصيص' },
  { id: 'quran', name: 'المصاحف والتفسير وعلوم القرآن', emoji: '📖', description: 'مصاحف القرآن الكريم بروايات القراء العشر المتواترة وأمهات كتب التفسير' },
  { id: 'sunnah', name: 'الحديث الشريف وعلومه', emoji: '📜', description: 'كتب الصحاح والسنن والمسانيد وشروحها وتراجم رجال الحديث' },
  { id: 'fiqh', name: 'الفقه وأصوله والقواعد', emoji: '⚖️', description: 'أبواب الفقه على المذاهب الأربعة وأصول الفقه وفتاوى أئمة الإسلام' },
  { id: 'shobohat', name: 'العقيدة والتوحيد والردود', emoji: '🛡️', description: 'بيان معتقد أهل السنة والجماعة والرد على الشبهات والبدع' },
  { id: 'history', name: 'السيرة والتاريخ والتراجم', emoji: '🏰', description: 'سيرة النبي ﷺ وتاريخ الخلفاء والأمم وطبقات الأعلام' },
  { id: 'language_literature', name: 'اللغة والأدب والشعر والمعاجم', emoji: '✒️', description: 'دواوين فحول الشعراء ومعاجم لسان العرب وكتب النحو والبلاغة' },
  { id: 'mwaez', name: 'الرقائق والزهد والتزكية', emoji: '🤍', description: 'كتب الزهد وترقيق القلوب وإصلاح النفوس ومدارج السالكين' },
  { id: 'multilingual', name: 'المكتبة العالمية المترجمة', emoji: '🌍', description: 'كتب إسلامية مترجمة لأكثر من 12 لغة عالمية' },
];

export interface BookLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const BOOK_LANGUAGES: BookLanguage[] = [
  { code: 'all', name: 'جميع اللغات', nativeName: 'All Languages', flag: '🌐' },
  { code: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'الإنجليزية', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'الفرنسية', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'الإسبانية', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'الألمانية', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'الروسية', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'id', name: 'الإندونيسية', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tr', name: 'التركية', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', name: 'الأردية', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'bn', name: 'البنغالية', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'zh', name: 'الصينية', nativeName: '中文', flag: '🇨🇳' },
];

const QURANIC_MUS_HAFS: MediaItem[] = [
  {
    id: 'quran-hafs',
    title: 'مصحف المدينة النبوية - رواية حفص عن عاصم',
    subtitle: 'الرواية الأكثر انتشاراً في العالم الإسلامي',
    sheikhName: 'مجمع الملك فهد لطباعة المصحف الشريف',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_shoaba_from_asem.pdf',
    tags: ['مصحف', 'حفص عن عاصم', 'قرآن كريم', 'quran'],
    language: 'ar',
    description: 'مصحف مجمع الملك فهد برواية حفص عن عاصم الكوفي من طريق الشاطبية، خط عثمان طه دقيق ومتقن.',
  },
  {
    id: 'quran-warsh',
    title: 'مصحف القرآن الكريم - رواية ورش عن نافع',
    subtitle: 'طريق الأزرق - الرواية السائدة في المغرب العربي وغرب إفريقيا',
    sheikhName: 'الإمام نافع المدني برواية ورش',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_warsh.pdf',
    tags: ['مصحف', 'ورش عن نافع', 'المغرب العربي', 'quran'],
    language: 'ar',
    description: 'مصحف كامل ومحقق برواية الإمام ورش عن نافع المدني من طريق الأزرق بالرسم العثماني المعتمد.',
  },
  {
    id: 'quran-qaloon',
    title: 'مصحف القرآن الكريم - رواية قالون عن نافع',
    subtitle: 'الرواية المشهورة في ليبيا وتونس وبعض بلدان إفريقيا',
    sheikhName: 'الإمام نافع المدني برواية قالون',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_qalon.pdf',
    tags: ['مصحف', 'قالون عن نافع', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية أبي موسى عيسى بن مينا (قالون) عن نافع المدني بقصر المنفصل وإسكان الميم.',
  },
  {
    id: 'quran-aldori-abu-amr',
    title: 'مصحف القرآن الكريم - رواية الدوري عن الكسائي',
    subtitle: 'قراءة الكوفة المتواترة',
    sheikhName: 'الإمام الكسائي برواية الدوري',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_aldori_from_alkesaei.pdf',
    tags: ['مصحف', 'الدوري عن الكسائي', 'quran'],
    language: 'ar',
    description: 'المصحف الكريم برواية حفص بن عمر الدوري عن الكسائي من طريق الشاطبية والتيسير.',
  },
  {
    id: 'quran-alsoosi',
    title: 'مصحف القرآن الكريم - رواية السوسي عن أبي عمرو',
    subtitle: 'برواية الإدغام الكبير المشهورة',
    sheikhName: 'الإمام أبو عمرو البصري برواية السوسي',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_alsosi_from_abi_amr.pdf',
    tags: ['مصحف', 'السوسي عن أبي عمرو', 'quran'],
    language: 'ar',
    description: 'مصحف القراءة برواية أبي شعيب صالح بن زياد السوسي عن أبي عمرو البصري مع تمييز مواضع الإدغام.',
  },
  {
    id: 'quran-shuba',
    title: 'مصحف القرآن الكريم - رواية شعبة عن عاصم',
    sheikhName: 'الإمام عاصم الكوفي برواية شعبة',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_shoaba_from_asem.pdf',
    tags: ['مصحف', 'شعبة عن عاصم', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية أبي بكر شعبة بن عياش عن عاصم بن أبي النجود الكوفي بالرسم العثماني.',
  },
  {
    id: 'quran-khalaf',
    title: 'مصحف القرآن الكريم - رواية خلف عن حمزة',
    subtitle: 'قراءة الإمام حمزة الزيات الكوفي',
    sheikhName: 'الإمام حمزة الكوفي برواية خلف',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_khalaf_from_hamza.pdf',
    tags: ['مصحف', 'خلف عن حمزة', 'quran'],
    language: 'ar',
    description: 'مصحف كامل برواية خلف بن هشام البزار عن حمزة بن حبيب الزيات الكوفي مع مواضع السكت والإمالات.',
  },
  {
    id: 'quran-khallad',
    title: 'مصحف القرآن الكريم - رواية خلاد عن حمزة',
    subtitle: 'قراءة الإمام حمزة الزيات الكوفي برواية خلاد',
    sheikhName: 'الإمام حمزة الكوفي برواية خلاد',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_khalad_from_hamza.pdf',
    tags: ['مصحف', 'خلاد عن حمزة', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية أبي عيسى خلاد بن خالد الصيرفي عن الإمام حمزة الكوفي من طريق الشاطبية.',
  },
  {
    id: 'quran-albazi',
    title: 'مصحف القرآن الكريم - رواية البزي عن ابن كثير',
    subtitle: 'قراءة إمام أهل مكة ابن كثير المكي',
    sheikhName: 'الإمام ابن كثير المكي برواية البزي',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_bizey_from_ibn_katheer.pdf',
    tags: ['مصحف', 'البزي عن ابن كثير', 'مكة', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية أحمد بن محمد البزي عن عبد الله بن كثير الداري المكي إمام قراء مكة.',
  },
  {
    id: 'quran-qonbol',
    title: 'مصحف القرآن الكريم - رواية قنبل عن ابن كثير',
    subtitle: 'قراءة إمام أهل مكة ابن كثير المكي برواية قنبل',
    sheikhName: 'الإمام ابن كثير المكي برواية قنبل',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_qunble_from_ibn_katheer.pdf',
    tags: ['مصحف', 'قنبل عن ابن كثير', 'مكة', 'quran'],
    language: 'ar',
    description: 'المصحف الكريم برواية محمد بن عبد الرحمن المخزومي الملقب بقنبل عن عبد الله بن كثير المكي.',
  },
  {
    id: 'quran-heshaam',
    title: 'مصحف القرآن الكريم - رواية هشام عن ابن عامر',
    subtitle: 'قراءة إمام أهل الشام عبد الله بن عامر الدمشقي',
    sheikhName: 'الإمام ابن عامر الشامي برواية هشام',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_hisham_from_ibn_amer.pdf',
    tags: ['مصحف', 'هشام عن ابن عامر', 'الشام', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية هشام بن عمار الدمشقي عن عبد الله بن عامر اليحصبي إمام أهل الشام.',
  },
  {
    id: 'quran-ibn-thakwan',
    title: 'مصحف القرآن الكريم - رواية ابن ذكوان عن ابن عامر',
    subtitle: 'قراءة إمام أهل الشام برواية ابن ذكوان',
    sheikhName: 'الإمام ابن عامر الشامي برواية ابن ذكوان',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_ibn_zakwan_from_ibn_amer.pdf',
    tags: ['مصحف', 'ابن ذكوان عن ابن عامر', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية عبد الله بن أحمد بن ذكوان الدمشقي عن الإمام ابن عامر الشامي بالرسم العثماني.',
  },
  {
    id: 'quran-abi-alhareth',
    title: 'مصحف القرآن الكريم - رواية أبي الحارث عن الكسائي',
    subtitle: 'قراءة الإمام علي بن حمزة الكسائي النحوي',
    sheikhName: 'الإمام الكسائي الكوفي برواية أبي الحارث',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_abi_alhareth_from_alkesaei.pdf',
    tags: ['مصحف', 'أبو الحارث عن الكسائي', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية الليث بن خالد المكنى بأبي الحارث عن علي بن حمزة الكسائي الكوفي سابع القراء.',
  },
  {
    id: 'quran-aldori-alkesaei',
    title: 'مصحف القرآن الكريم - رواية الدوري عن الكسائي',
    subtitle: 'قراءة الإمام الكسائي الكوفي برواية حفص الدوري',
    sheikhName: 'الإمام الكسائي الكوفي برواية الدوري',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_aldori_from_alkesaei.pdf',
    tags: ['مصحف', 'الدوري عن الكسائي', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية الإمام الدوري عن الكسائي الكوفي مع تفصيل أوجه الإمالات والزوائد.',
  },
  {
    id: 'quran-ibn-wardan',
    title: 'مصحف القرآن الكريم - رواية ابن وردان عن أبي جعفر',
    subtitle: 'قراءة الإمام أبي جعفر المدني ثامن القراء العشرة',
    sheikhName: 'الإمام أبو جعفر المدني برواية ابن وردان',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_ibn_wardan_from_abi_jaafar.pdf',
    tags: ['مصحف', 'ابن وردان عن أبي جعفر', 'القراءات العشر', 'quran'],
    language: 'ar',
    description: 'المصحف الكريم برواية عيسى بن وردان المدني عن يزيد بن القعقاع (أبي جعفر المدني) أول القراء الثلاثة المتممين للعشرة.',
  },
  {
    id: 'quran-ibn-jammaz',
    title: 'مصحف القرآن الكريم - رواية ابن جماز عن أبي جعفر',
    subtitle: 'قراءة الإمام أبي جعفر المدني برواية ابن جماز',
    sheikhName: 'الإمام أبو جعفر المدني برواية ابن جماز',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_ibn_jammaz_from_abi_jaafar.pdf',
    tags: ['مصحف', 'ابن جماز عن أبي جعفر', 'القراءات العشر', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية سليمان بن مسلم بن جماز الزهري عن الإمام أبي جعفر المدني.',
  },
  {
    id: 'quran-rois',
    title: 'مصحف القرآن الكريم - رواية رويس عن يعقوب',
    subtitle: 'قراءة الإمام يعقوب الحضرمي البصري تاسع القراء',
    sheikhName: 'الإمام يعقوب الحضرمي برواية رويس',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_roways_from_yaakob_alhadrami.pdf',
    tags: ['مصحف', 'رويس عن يعقوب', 'القراءات العشر', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية محمد بن المتوكل اللؤلؤي البصري الملقب برويس عن يعقوب الحضرمي البصري.',
  },
  {
    id: 'quran-rowh',
    title: 'مصحف القرآن الكريم - رواية روح عن يعقوب',
    subtitle: 'قراءة الإمام يعقوب الحضرمي برواية روح بن عبد المؤمن',
    sheikhName: 'الإمام يعقوب الحضرمي برواية روح',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/Alqiraat_Quran/quran_roh_from_yaakob_alhadrami.pdf',
    tags: ['مصحف', 'روح عن يعقوب', 'القراءات العشر', 'quran'],
    language: 'ar',
    description: 'المصحف الشريف برواية روح بن عبد المؤمن الهذلي البصري النحوي عن الإمام يعقوب الحضرمي.',
  },
  {
    id: 'book-sahih-bukhari',
    title: 'الجامع المسند الصحيح المختصر (صحيح البخاري)',
    subtitle: 'أصح كتاب بعد كتاب الله عز وجل',
    sheikhName: 'الإمام محمد بن إسماعيل البخاري',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/sunnah_books/sahihalbikhary.pdf',
    tags: ['حديث', 'سنة', 'صحيح البخاري', 'أحاديث'],
    language: 'ar',
    description: 'الجامع الصحيح المسند من أمور رسول الله ﷺ وسننه وأيامه للإمام أبي عبد الله محمد بن إسماعيل البخاري.',
  },
  {
    id: 'book-sahih-muslim',
    title: 'المسند الصحيح المختصر بنقل العدل عن العدل (صحيح مسلم)',
    subtitle: 'ثاني الصحيحين في الحديث النبوي الشريف',
    sheikhName: 'الإمام مسلم بن الحجاج النيسابوري',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/sunnah_books/sahihmuslim.pdf',
    tags: ['حديث', 'سنة', 'صحيح مسلم', 'أحاديث'],
    language: 'ar',
    description: 'صحيح الإمام مسلم بن الحجاج القشيري النيسابوري، مرتباً على الأبواب الفقهية والعقدية بحسن الصنعة والإسناد.',
  },
  {
    id: 'book-raheeq',
    title: 'الرحيق المختوم - بحث في السيرة النبوية المطهرة',
    subtitle: 'الكتاب الحائز على الجائزة الأولى في مسابقة السيرة النبوية',
    sheikhName: 'الشيخ صفي الرحمن المباركفوري',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/sunnah_books/alraheeq_almakhtoom.pdf',
    tags: ['سيرة نبوية', 'تاريخ', 'الرحيق المختوم'],
    language: 'ar',
    description: 'أشهر وأشمل دراسة معاصرة ومحققة في السيرة النبوية العطرة على صاحبها أفضل الصلاة وأتم التسليم.',
  },
  {
    id: 'book-daawa-dawaa',
    title: 'الجواب الكافي لمن سأل عن الدواء الشافي (الداء والدواء)',
    subtitle: 'في علاج أمراض القلوب والذنوب والرقائق',
    sheikhName: 'الإمام ابن قيم الجوزية',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/mwaez_books/aldaawaldwaa.pdf',
    tags: ['رقائق', 'مواعظ', 'ابن القيم', 'تزكية'],
    language: 'ar',
    description: 'من أعظم كتب تزكية النفس ومعالجة أدواء القلوب والتحذير من عواقب المعاصي للإمام شمس الدين ابن قيم الجوزية.',
  },
  {
    id: 'book-zad-maad',
    title: 'زاد المعاد في هدي خير العباد',
    subtitle: 'موسوعة فقه السيرة النبوية والأحكام الشرعية',
    sheikhName: 'الإمام ابن قيم الجوزية',
    section: 'books',
    pdfUrl: 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/mwaez_books/zad.pdf',
    tags: ['سيرة', 'فقه', 'ابن القيم', 'هدي النبي'],
    language: 'ar',
    description: 'كتاب فريد في بابه يجمع بين السيرة النبوية الشريفة واستنباط الأحكام الفقهية والطبية والتربوية منها.',
  },
];

interface BooksState {
  books: MediaItem[];
  loading: boolean;
  selectedCategory: string;
  selectedLanguage: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  loadedFiles: Set<string>;

  startLoading: () => Promise<void>;
  loadLanguageBooks: (langCode: string) => Promise<void>;
  loadCategoryBooks: (catId: string) => Promise<void>;
  setSelectedCategory: (catId: string) => void;
  setSelectedLanguage: (langCode: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  getFilteredBooks: () => MediaItem[];
}

const LANGUAGE_BOOK_FILES: Record<string, string[]> = {
  ar: ['books/islamhouse_books_ar.json', 'books/islamhouse_articles_ar.json'],
  en: ['books/islamhouse_books_en.json', 'books/islamhouse_articles_en.json'],
  fr: ['books/islamhouse_books_fr.json', 'books/islamhouse_articles_fr.json'],
  es: ['books/islamhouse_books_es.json', 'books/islamhouse_articles_es.json'],
  id: ['books/islamhouse_books_id.json', 'books/islamhouse_articles_id.json'],
  tr: ['books/islamhouse_books_tr.json', 'books/islamhouse_articles_tr.json'],
  ru: ['books/islamhouse_books_ru.json', 'books/islamhouse_articles_ru.json'],
  ur: ['books/islamhouse_books_ur.json'],
  bn: ['books/islamhouse_books_bn.json', 'books/islamhouse_articles_bn.json'],
  hi: ['books/islamhouse_books_hi.json'],
  fa: ['books/islamhouse_books_fa.json'],
  de: ['books/islamhouse_articles_de.json'],
  zh: ['books/islamhouse_articles_zh.json'],
};

const CATEGORY_BOOK_FILES: Record<string, string[]> = {
  openiti: ['books/OpenITI_14k_Classical_Books/openiti_books_index.json'],
};

const LOCAL_CACHE_KEY = 'noor-books-shamela-v4';

function getInitialCachedBooks(): MediaItem[] {
  if (typeof window === 'undefined') return QURANIC_MUS_HAFS;
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 500) {
        return dedupeBooks(parsed);
      }
    }
  } catch {
    // fallback
  }
  return QURANIC_MUS_HAFS;
}

export const useBooksStore = create<BooksState>((set, get) => ({
  books: getInitialCachedBooks(),
  loading: false,
  selectedCategory: 'all',
  selectedLanguage: 'all',
  searchQuery: '',
  viewMode: 'grid',
  loadedFiles: new Set(),

  setSelectedCategory: (selectedCategory) => {
    set({ selectedCategory });
    if (selectedCategory === 'shamela' || selectedCategory === 'openiti' || CATEGORY_BOOK_FILES[selectedCategory]) {
      get().loadCategoryBooks(selectedCategory);
    }
  },
  setSelectedLanguage: (selectedLanguage) => {
    set({ selectedLanguage });
    if (selectedLanguage !== 'all' && selectedLanguage !== 'ar') {
      get().loadLanguageBooks(selectedLanguage);
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setViewMode: (viewMode) => set({ viewMode }),

  loadLanguageBooks: async (langCode: string) => {
    const filePaths = LANGUAGE_BOOK_FILES[langCode];
    if (!filePaths || filePaths.length === 0) return;

    const unvisited = filePaths.filter((fp) => !get().loadedFiles.has(fp));
    if (unvisited.length === 0) return;

    try {
      const repos = loadRepositories();
      const newItems: MediaItem[] = [];
      const nextFiles = new Set(get().loadedFiles);

      for (const filePath of unvisited) {
        try {
          const res = await fetchJsonWithFallback<unknown>(repos, filePath, 10000);
          if (res.data !== null) {
            const { items } = normalizeContentFile(res.data, filePath, res.sourceId || undefined);
            if (items.length > 0) {
              newItems.push(...items);
              nextFiles.add(filePath);
            }
          }
        } catch {
          // ignore error on single file
        }
      }

      if (newItems.length > 0) {
        set((s) => ({
          books: dedupeBooks([...s.books, ...newItems]),
          loadedFiles: nextFiles,
        }));
      }
    } catch {
      // non-critical
    }
  },

  loadCategoryBooks: async (catId: string) => {
    if (catId === 'shamela' || catId === 'openiti') {
      if (get().loadedFiles.has('shamela')) return;
      try {
        const res = await fetch('/data/ebooks/shamela_arabic_catalog.json');
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            set((s) => {
              const nextFiles = new Set(s.loadedFiles);
              nextFiles.add('shamela');
              nextFiles.add('openiti');
              return {
                books: dedupeBooks([...s.books, ...items]),
                loadedFiles: nextFiles,
              };
            });
          }
        }
      } catch {
        // non-critical fallback
      }
      return;
    }

    const filePaths = CATEGORY_BOOK_FILES[catId];
    if (!filePaths || filePaths.length === 0) return;

    const unvisited = filePaths.filter((fp) => !get().loadedFiles.has(fp));
    if (unvisited.length === 0) return;

    try {
      const repos = loadRepositories();
      const newItems: MediaItem[] = [];
      const nextFiles = new Set(get().loadedFiles);

      for (const filePath of unvisited) {
        try {
          const res = await fetchJsonWithFallback<unknown>(repos, filePath, 12000);
          if (res.data !== null) {
            const { items } = normalizeContentFile(res.data, filePath, res.sourceId || undefined);
            if (items.length > 0) {
              newItems.push(...items);
              nextFiles.add(filePath);
            }
          }
        } catch {
          // ignore error
        }
      }

      if (newItems.length > 0) {
        set((s) => ({
          books: dedupeBooks([...s.books, ...newItems]),
          loadedFiles: nextFiles,
        }));
      }
    } catch {
      // non-critical
    }
  },

  startLoading: async () => {
    if (get().loading) return;
    set({ loading: true });

    try {
      const repos = loadRepositories();
      const nextFiles = new Set(get().loadedFiles);
      const accumulated: MediaItem[] = [...QURANIC_MUS_HAFS];

      // Execute initial core data loads concurrently (Pure-text shards + Built-in library + Primary Arabic catalog + Articles)
      const [textCatalogResult, localBooksResult, arBooksResult, arArticlesResult] = await Promise.allSettled([
        fetchEBookCatalog(),
        fetch('/books/islamic_books.json').then((r) => (r.ok ? r.json() : null)),
        fetchJsonWithFallback<unknown>(repos, 'books/islamhouse_books_ar.json', 10000),
        fetchJsonWithFallback<unknown>(repos, 'books/islamhouse_articles_ar.json', 10000),
      ]);

      // 0. Pure-Text Shards Catalog
      if (textCatalogResult.status === 'fulfilled' && textCatalogResult.value) {
        const textItems: MediaItem[] = textCatalogResult.value.map((m) => ({
          id: `ebook-${m.id}`,
          title: m.title,
          subtitle: m.subtitle,
          sheikhName: m.author,
          section: 'books',
          tags: [...m.tags, 'نص حي', 'ebook_text', 'قراءة سريعة', m.category],
          language: m.language || 'ar',
          description: m.description,
          pdfUrl: m.pdfUrl,
        }));
        accumulated.push(...textItems);
      }

      // 1. Built-in Curated Books
      if (localBooksResult.status === 'fulfilled' && localBooksResult.value) {
        const { items } = normalizeContentFile(
          localBooksResult.value,
          'islamic_books/books.json',
          'builtin',
        );
        if (items.length > 0) {
          accumulated.push(...items);
        }
      }

      // 2. Primary Arabic IslamHouse Books
      if (arBooksResult.status === 'fulfilled' && arBooksResult.value?.data) {
        const { items } = normalizeContentFile(
          arBooksResult.value.data,
          'books/islamhouse_books_ar.json',
          arBooksResult.value.sourceId || undefined,
        );
        if (items.length > 0) {
          accumulated.push(...items);
          nextFiles.add('books/islamhouse_books_ar.json');
        }
      }

      // 3. Primary Arabic IslamHouse Articles / Monographs
      if (arArticlesResult.status === 'fulfilled' && arArticlesResult.value?.data) {
        const { items } = normalizeContentFile(
          arArticlesResult.value.data,
          'books/islamhouse_articles_ar.json',
          arArticlesResult.value.sourceId || undefined,
        );
        if (items.length > 0) {
          accumulated.push(...items);
          nextFiles.add('books/islamhouse_articles_ar.json');
        }
      }

      // 4. Maktaba Shamela 4 Master Corpus (8,589 Verified Classical Works)
      try {
        const shamelaRes = await fetch('/data/ebooks/shamela_arabic_catalog.json');
        if (shamelaRes.ok) {
          const shamelaItems = await shamelaRes.json();
          if (Array.isArray(shamelaItems) && shamelaItems.length > 0) {
            accumulated.push(...shamelaItems);
            nextFiles.add('shamela');
            nextFiles.add('openiti');
          }
        }
      } catch {
        // non-critical fallback
      }

      // Single atomic batch update to eliminate re-render cycles and UI freezes
      const merged = dedupeBooks(accumulated);
      set({
        books: merged,
        loadedFiles: nextFiles,
      });

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged));
        } catch {
          // ignore storage quota
        }
      }
    } finally {
      set({ loading: false });
    }
  },

  getFilteredBooks: () => {
    const { books, selectedCategory, selectedLanguage, searchQuery } = get();
    const queryTrimmed = searchQuery.trim();

    // Intent-Driven Semantic Search
    if (queryTrimmed) {
      const intentResults = searchBooksWithIntent(
        books,
        queryTrimmed,
        selectedCategory,
        selectedLanguage
      );
      return intentResults.map((r) =>
        r.matchReason ? { ...r.book, matchReason: r.matchReason } : r.book
      );
    }

    // Fast-path: if no search query and no filters, return books list directly
    if (selectedCategory === 'all' && selectedLanguage === 'all') {
      return books;
    }

    const filtered = books.filter((book: any) => {
      // 1. Language Filter
      if (selectedLanguage !== 'all' && book.language && book.language !== selectedLanguage) {
        return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'all') {
        const tags = (book.tags || []).map((t: string) => t.toLowerCase());
        const title = (book.title || '').toLowerCase();
        const desc = (book.description || '').toLowerCase();

        if (selectedCategory === 'ebook_pure_text') {
          const isText = tags.includes('ebook_text') || tags.includes('نص حي');
          if (!isText) return false;
        } else if (selectedCategory === 'shamela' || selectedCategory === 'openiti') {
          const isShamela =
            (book.id && (book.id.startsWith('shamela-') || book.id.startsWith('openiti-'))) ||
            tags.includes('شاملة') ||
            tags.includes('openiti') ||
            tags.includes('تراث') ||
            book.mediaType === 'shamela_archive' ||
            Boolean(book.shamelaPath);
          if (!isShamela) return false;
        } else if (selectedCategory === 'quran') {
          const isQuran =
            book.islamicArt === 'quran' ||
            tags.some((t: string) => t.includes('quran') || t.includes('مصحف') || t.includes('قراءة') || t.includes('تفسير')) ||
            title.includes('مصحف') ||
            title.includes('قرآن') ||
            title.includes('تفسير');
          if (!isQuran) return false;
        } else if (selectedCategory === 'fiqh') {
          const isFiqh =
            book.islamicArt === 'fiqh' ||
            tags.some((t: string) => t.includes('فقه') || t.includes('فتوى') || t.includes('احكام') || t.includes('أصول')) ||
            title.includes('فقه') ||
            title.includes('فتاوى') ||
            desc.includes('فقه');
          if (!isFiqh) return false;
        } else if (selectedCategory === 'sunnah') {
          const isSunnah =
            book.islamicArt === 'hadith' ||
            tags.some((t: string) => t.includes('حديث') || t.includes('سنة') || t.includes('صحيح') || t.includes('سنن') || t.includes('مسند')) ||
            title.includes('حديث') ||
            title.includes('سنن') ||
            title.includes('صحيح');
          if (!isSunnah) return false;
        } else if (selectedCategory === 'history') {
          const isHistory =
            book.islamicArt === 'history' ||
            tags.some((t: string) => t.includes('تاريخ') || t.includes('سيرة') || t.includes('تراجم') || t.includes('طبقات')) ||
            title.includes('تاريخ') ||
            title.includes('سيرة');
          if (!isHistory) return false;
        } else if (selectedCategory === 'language_literature') {
          const isLang =
            book.islamicArt === 'language' ||
            tags.some((t: string) => t.includes('لغة') || t.includes('أدب') || t.includes('شعر') || t.includes('معجم') || t.includes('نحو')) ||
            title.includes('ديوان') ||
            title.includes('شعر') ||
            title.includes('معجم');
          if (!isLang) return false;
        } else if (selectedCategory === 'mwaez') {
          const isMwaez =
            book.islamicArt === 'raqaiq' ||
            tags.some((t: string) => t.includes('رقائق') || t.includes('مواعظ') || t.includes('تزكية') || t.includes('زهد') || t.includes('قلوب')) ||
            title.includes('مواعظ') ||
            title.includes('الرقائق') ||
            title.includes('الزهد');
          if (!isMwaez) return false;
        } else if (selectedCategory === 'shobohat') {
          const isShobohat =
            book.islamicArt === 'aqeedah' ||
            tags.some((t: string) => t.includes('عقيدة') || t.includes('شبهات') || t.includes('توحيد') || t.includes('ردود') || t.includes('سنة')) ||
            title.includes('عقيدة') ||
            title.includes('توحيد') ||
            title.includes('شبهات');
          if (!isShobohat) return false;
        } else if (selectedCategory === 'multilingual') {
          if (book.language === 'ar') return false;
        }
      }

      return true;
    });

    return filtered;
  },
}));

function dedupeBooks(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const it of items) {
    const key = it.pdfUrl || it.id || it.title;
    if (!seen.has(key)) {
      seen.add(key);
      const normTitle = normalizeArabic(it.title);
      const normAuthor = normalizeArabic(it.sheikhName);
      const normDesc = normalizeArabic(it.description);
      const normTags = (it.tags || []).map(normalizeArabic).join(' ');
      (it as any)._normTitle = normTitle;
      (it as any)._normAuthor = normAuthor;
      (it as any)._normSearchText = `${normTitle} ${normAuthor} ${normDesc} ${normTags}`;
      out.push(it);
    }
  }
  return out;
}
