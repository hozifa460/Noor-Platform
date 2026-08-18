export interface BookAliasKnowledge {
  aliasQuery: string;
  normQuery: string;
  targetTitles: string[];
  normTargetTitles: string[];
  targetAuthor?: string;
  normTargetAuthor?: string;
  explanation: string;
}

export const RAW_ALIASES = [
  {
    aliasQuery: 'مغني ابن قدامة',
    targetTitles: ['المغني', 'المغني في فقه', 'المغني لابن قدامة'],
    targetAuthor: 'ابن قدامة',
    explanation: 'موسوعة الفقه المقارن الكبرى للإمام ابن قدامة المقدسي',
  },
  {
    aliasQuery: 'زاد ابن القيم',
    targetTitles: ['زاد المعاد في هدي خير العباد', 'زاد المعاد'],
    targetAuthor: 'ابن قيم الجوزية',
    explanation: 'موسوعة فقه السيرة والأحكام للإمام ابن القيم',
  },
  {
    aliasQuery: 'الواسطية',
    targetTitles: ['العقيدة الواسطية', 'شرح العقيدة الواسطية', 'متن العقيدة الواسطية'],
    targetAuthor: 'ابن تيمية',
    explanation: 'أعظم متون معتقد أهل السنة لشيخ الإسلام ابن تيمية',
  },
  {
    aliasQuery: 'الحموية',
    targetTitles: ['الفتوى الحموية الكبرى', 'العقيدة الحموية'],
    targetAuthor: 'ابن تيمية',
    explanation: 'رسالة شيخ الإسلام ابن تيمية في الأسماء والصفات',
  },
  {
    aliasQuery: 'التدمرية',
    targetTitles: ['الرسالة التدمرية', 'العقيدة التدمرية', 'تحقيق التدمرية'],
    targetAuthor: 'ابن تيمية',
    explanation: 'قواعد التوحيد والصفات والشرع والقدر لشيخ الإسلام',
  },
  {
    aliasQuery: 'فتح الباري',
    targetTitles: ['فتح الباري شرح صحيح البخاري', 'فتح الباري', 'هدي الساري'],
    targetAuthor: 'ابن حجر العسقلاني',
    explanation: 'ديوان الإسلام وأعظم شروح صحيح البخاري للحافظ ابن حجر',
  },
  {
    aliasQuery: 'شرح صحيح مسلم',
    targetTitles: ['المنهاج شرح صحيح مسلم بن الحجاج', 'شرح النووي على مسلم', 'المنهاج في شرح صحيح مسلم'],
    targetAuthor: 'النووي',
    explanation: 'الشرح المعتمد لصحيح مسلم للإمام محيي الدين النووي',
  },
  {
    aliasQuery: 'شرح الطحاوية',
    targetTitles: ['شرح العقيدة الطحاوية', 'العقيدة الطحاوية'],
    explanation: 'الشرح المعتمد لعقيدة أئمة السلف لابن أبي العز الحنفي',
  },
  {
    aliasQuery: 'سيرة ابن هشام',
    targetTitles: ['السيرة النبوية لابن هشام', 'سيرة ابن هشام', 'السيرة النبوية'],
    targetAuthor: 'ابن هشام',
    explanation: 'أوثق وأشهر كتب السيرة النبوية المسندة',
  },
  {
    aliasQuery: 'تفسير ابن كثير',
    targetTitles: ['تفسير القرآن العظيم', 'تفسير ابن كثير'],
    targetAuthor: 'ابن كثير',
    explanation: 'أشهر تفاسير القرآن بالمأثور والحديث والأثر',
  },
  {
    aliasQuery: 'تفسير الطبري',
    targetTitles: ['جامع البيان عن تأويل آي القرآن', 'تفسير الطبري'],
    targetAuthor: 'الطبري',
    explanation: 'إمام المفسرين وأشمل تفاسير السلف بالرواية والإسناد',
  },
  {
    aliasQuery: 'تفسير القرطبي',
    targetTitles: ['الجامع لأحكام القرآن', 'تفسير القرطبي'],
    targetAuthor: 'القرطبي',
    explanation: 'أعظم تفاسير الأحكام الفقهية واستنباط الأدلة',
  },
  {
    aliasQuery: 'تفسير السعدي',
    targetTitles: ['تيسير الكريم الرحمن في تفسير كلام المنان', 'تفسير السعدي'],
    targetAuthor: 'السعدي',
    explanation: 'التفسير الميسر المصفى للشيخ عبد الرحمن السعدي',
  },
  {
    aliasQuery: 'لسان العرب',
    targetTitles: ['لسان العرب', 'لسان العرب المحيط'],
    targetAuthor: 'ابن منظور',
    explanation: 'أعظم وأشمل معاجم لغة العرب وفقه مفرداتها',
  },
  {
    aliasQuery: 'سير اعلام النبلاء',
    targetTitles: ['سير أعلام النبلاء', 'سير اعلام النبلاء'],
    targetAuthor: 'الذهبي',
    explanation: 'الموسوعة الكبرى في تراجم الأعلام والعلماء للإمام الذهبي',
  },
  {
    aliasQuery: 'المجموع للنووي',
    targetTitles: ['المجموع شرح المهذب', 'المجموع'],
    targetAuthor: 'النووي',
    explanation: 'موسوعة الفقه الشافعي والمقارن الكبرى للإمام النووي',
  },
  {
    aliasQuery: 'الداء والدواء',
    targetTitles: ['الداء والدواء', 'الجواب الكافي لمن سأل عن الدواء الشافي'],
    targetAuthor: 'ابن قيم الجوزية',
    explanation: 'تحفة ابن القيم في معالجة أمراض القلوب وتزكية النفس',
  },
  {
    aliasQuery: 'نيل الاوطار',
    targetTitles: ['نيل الأوطار شرح منتقى الأخبار', 'نيل الاوطار'],
    explanation: 'شرح أحاديث الأحكام للإمام الشوكاني',
  },
  {
    aliasQuery: 'رياض الصالحين',
    targetTitles: ['رياض الصالحين من كلام سيد المرسلين', 'رياض الصالحين'],
    targetAuthor: 'النووي',
    explanation: 'أشهر مصنف في أحاديث الرقائق والآداب للإمام النووي',
  },
  {
    aliasQuery: 'بلوغ المرام',
    targetTitles: ['بلوغ المرام من أدلة الأحكام', 'بلوغ المرام'],
    targetAuthor: 'ابن حجر العسقلاني',
    explanation: 'متن أحاديث الأحكام المعتمد للحافظ ابن حجر',
  },
];
