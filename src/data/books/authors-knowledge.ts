export interface AuthorKnowledge {
  canonicalName: string;
  deathHijri?: number;
  aliases: string[];
  normAliases: string[];
  primaryArts: string[];
}

export const RAW_AUTHORS = [
  {
    canonicalName: 'ابن تيمية',
    deathHijri: 728,
    aliases: ['ابن تيمية', 'ابن تيميه', 'شيخ الاسلام', 'احمد بن عبد الحليم', 'تقي الدين ابن تيمية', 'تقي الدين ابن تيميه', 'ابو العباس ابن تيمية'],
    primaryArts: ['aqeedah', 'fiqh', 'fatwa'],
  },
  {
    canonicalName: 'ابن قيم الجوزية',
    deathHijri: 751,
    aliases: ['ابن القيم', 'ابن قيم الجوزية', 'ابن قيم الجوزيه', 'شمس الدين ابن القيم', 'محمد بن ابي بكر الزرعي', 'ابن قيم'],
    primaryArts: ['aqeedah', 'raqaiq', 'fiqh', 'seerah'],
  },
  {
    canonicalName: 'البخاري',
    deathHijri: 256,
    aliases: ['البخاري', 'محمد بن اسماعيل البخاري', 'الامام البخاري', 'ابو عبد الله البخاري', 'امير المؤمنين في الحديث'],
    primaryArts: ['hadith'],
  },
  {
    canonicalName: 'مسلم بن الحجاج',
    deathHijri: 261,
    aliases: ['مسلم', 'الامام مسلم', 'مسلم النيسابوري', 'ابو الحسين مسلم', 'صحيح مسلم'],
    primaryArts: ['hadith'],
  },
  {
    canonicalName: 'النووي',
    deathHijri: 676,
    aliases: ['النووي', 'الامام النووي', 'يحيى بن شرف النووي', 'محيي الدين النووي', 'النووى'],
    primaryArts: ['hadith', 'fiqh', 'raqaiq'],
  },
  {
    canonicalName: 'ابن حجر العسقلاني',
    deathHijri: 852,
    aliases: ['ابن حجر', 'الحافظ ابن حجر', 'احمد بن علي بن حجر', 'شهاب الدين ابن حجر', 'العسقلاني'],
    primaryArts: ['hadith', 'history', 'tafsir'],
  },
  {
    canonicalName: 'الذهبي',
    deathHijri: 748,
    aliases: ['الذهبي', 'الامام الذهبي', 'شمس الدين الذهبي', 'محمد بن احمد الذهبي', 'الحافظ الذهبي', 'الذهبى'],
    primaryArts: ['history', 'hadith', 'aqeedah'],
  },
  {
    canonicalName: 'ابن كثير',
    deathHijri: 774,
    aliases: ['ابن كثير', 'عماد الدين ابن كثير', 'اسماعيل بن عمر بن كثير', 'الحافظ ابن كثير', 'ابن كثير الدمشقي'],
    primaryArts: ['tafsir', 'history', 'hadith'],
  },
  {
    canonicalName: 'ابن قدامة المقدسي',
    deathHijri: 620,
    aliases: ['ابن قدامة', 'ابن قدامه', 'موفق الدين ابن قدامة', 'الموفق ابن قدامة', 'عبد الله بن قدامة'],
    primaryArts: ['fiqh', 'aqeedah', 'usul'],
  },
  {
    canonicalName: 'القرطبي',
    deathHijri: 671,
    aliases: ['القرطبي', 'الامام القرطبي', 'محمد بن احمد القرطبي', 'ابو عبد الله القرطبي'],
    primaryArts: ['tafsir', 'fiqh', 'raqaiq'],
  },
  {
    canonicalName: 'الطبري',
    deathHijri: 310,
    aliases: ['الطبري', 'الامام الطبري', 'محمد بن جرير الطبري', 'ابن جرير الطبري', 'ابن جرير'],
    primaryArts: ['tafsir', 'history', 'quran'],
  },
  {
    canonicalName: 'السعدي',
    deathHijri: 1376,
    aliases: ['السعدي', 'الشيخ السعدي', 'عبد الرحمن بن ناصر السعدي', 'عبد الرحمن السعدي', 'ابن سعدي'],
    primaryArts: ['tafsir', 'fiqh', 'aqeedah'],
  },
  {
    canonicalName: 'ابن عثيمين',
    deathHijri: 1421,
    aliases: ['ابن عثيمين', 'الشيخ ابن عثيمين', 'محمد بن صالح العثيمين', 'العثيمين', 'محمد العثيمين'],
    primaryArts: ['fiqh', 'aqeedah', 'tafsir', 'fatwa'],
  },
  {
    canonicalName: 'ابن باز',
    deathHijri: 1420,
    aliases: ['ابن باز', 'الشيخ ابن باز', 'عبد العزيز بن باز', 'سماحة الشيخ ابن باز', 'عبد العزيز بن عبد الله بن باز'],
    primaryArts: ['fatwa', 'aqeedah', 'fiqh'],
  },
  {
    canonicalName: 'الألباني',
    deathHijri: 1420,
    aliases: ['الالباني', 'الشيخ الالباني', 'محمد ناصر الدين الالباني', 'محدث العصر'],
    primaryArts: ['hadith', 'fiqh'],
  },
  {
    canonicalName: 'الشافعي',
    deathHijri: 204,
    aliases: ['الشافعي', 'الامام الشافعي', 'محمد بن ادريس الشافعي'],
    primaryArts: ['fiqh', 'usul', 'language'],
  },
  {
    canonicalName: 'أحمد بن حنبل',
    deathHijri: 241,
    aliases: ['احمد بن حنبل', 'الامام احمد', 'امام اهل السنة', 'ابو عبد الله احمد بن حنبل', 'ابن حنبل'],
    primaryArts: ['hadith', 'fiqh', 'aqeedah', 'raqaiq'],
  },
  {
    canonicalName: 'مالك بن أنس',
    deathHijri: 179,
    aliases: ['مالك', 'الامام مالك', 'مالك بن انس', 'امام دار الهجرة'],
    primaryArts: ['hadith', 'fiqh'],
  },
  {
    canonicalName: 'أبو حنيفة',
    deathHijri: 150,
    aliases: ['ابو حنيفة', 'الامام ابو حنيفة', 'النعمان بن ثابت', 'ابو حنيفة النعمان', 'الامام الاعظم'],
    primaryArts: ['fiqh', 'usul'],
  },
  {
    canonicalName: 'ابن رجب الحنبلي',
    deathHijri: 795,
    aliases: ['ابن رجب', 'زين الدين ابن رجب', 'الحافظ ابن رجب', 'عبد الرحمن بن رجب'],
    primaryArts: ['hadith', 'fiqh', 'raqaiq'],
  },
  {
    canonicalName: 'ابن عبد البر',
    deathHijri: 463,
    aliases: ['ابن عبد البر', 'الحافظ ابن عبد البر', 'يوسف بن عبد الله بن عبد البر', 'ابو عمر ابن عبد البر'],
    primaryArts: ['hadith', 'fiqh', 'history'],
  },
  {
    canonicalName: 'ابن الجوزي',
    deathHijri: 597,
    aliases: ['ابن الجوزي', 'الامام ابن الجوزي', 'ابو الفرج ابن الجوزي', 'عبد الرحمن بن علي بن الجوزي'],
    primaryArts: ['history', 'raqaiq', 'tafsir', 'hadith'],
  },
  {
    canonicalName: 'ابن حزم الأندلسي',
    deathHijri: 456,
    aliases: ['ابن حزم', 'علي بن احمد بن حزم', 'ابو محمد ابن حزم', 'ابن حزم الظاهري'],
    primaryArts: ['fiqh', 'aqeedah', 'history', 'language'],
  },
  {
    canonicalName: 'السيوطي',
    deathHijri: 911,
    aliases: ['السيوطي', 'جلال الدين السيوطي', 'الامام السيوطي', 'عبد الرحمن بن ابي بكر السيوطي'],
    primaryArts: ['quran', 'hadith', 'history', 'language'],
  },
  {
    canonicalName: 'الشاطبي',
    deathHijri: 790,
    aliases: ['الشاطبي', 'الامام الشاطبي', 'ابراهيم بن موسى الشاطبي', 'ابو اسحاق الشاطبي'],
    primaryArts: ['usul', 'aqeedah', 'fiqh'],
  },
  {
    canonicalName: 'ابن منظور',
    deathHijri: 711,
    aliases: ['ابن منظور', 'محمد بن مكرم بن منظور', 'جمال الدين ابن منظور'],
    primaryArts: ['language'],
  },
  {
    canonicalName: 'الفراهيدي',
    deathHijri: 170,
    aliases: ['الخليل بن احمد الفراهيدي', 'الخليل بن احمد', 'الخليل'],
    primaryArts: ['language'],
  },
  {
    canonicalName: 'ابن هشام',
    deathHijri: 218,
    aliases: ['ابن هشام', 'عبد الملك بن هشام', 'ابن هشام الحميري'],
    primaryArts: ['seerah', 'history'],
  },
];
