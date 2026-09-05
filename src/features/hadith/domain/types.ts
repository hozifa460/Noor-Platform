/**
 * Domain types and contracts for the Hadith & Sunnah feature domain.
 */

export interface HadithBookMeta {
  id: string;
  nameAr: string;
  nameEn: string;
  authorAr: string;
  authorEn: string;
  fileName: string;
  hadithCount: number;
  featured?: boolean;
  category: 'sahih' | 'sunan' | 'masanid' | 'jawami' | 'forties' | 'akhlak';
  description: string;
}

export interface HadithEnglish {
  narrator?: string;
  text?: string;
}

export interface HadithItem {
  id: number;
  idInBook: number;
  chapterId: number;
  bookId: number;
  arabic: string;
  english?: HadithEnglish;
  _norm?: string;
  _wordSet?: Set<string>;
}

export interface HadithChapter {
  id: number;
  bookId: number;
  arabic: string;
  english: string;
}

export interface HadithBookMetadata {
  id: number;
  length: number;
  arabic: {
    title: string;
    author: string;
    introduction?: string;
  };
  english?: {
    title: string;
    author: string;
    introduction?: string;
  };
}

export interface HadithBookData {
  id: number;
  metadata: HadithBookMetadata;
  chapters: HadithChapter[];
  hadiths: HadithItem[];
}

export interface HadeethEncSharhItem {
  id: string;
  title: string;
  hadeeth: string;
  grade: string;
  explanation: string;
  hints?: string[];
  attribution?: string;
  categories?: string[];
}

export interface GlobalSearchResultItem {
  hadith: HadithItem;
  book: HadithBookMeta;
  chapter?: HadithChapter;
  isSemanticMatch?: boolean;
  semanticTopic?: string;
}

export interface MicroIndexEntry {
  b: string;
  i: number;
  c: number;
  t: string;
  g?: string;
  _norm?: string;
}

export interface NarratorScholarlyOpinion {
  scholar: string;
  opinion: string;
}

export interface NarratorProfile {
  id: string;
  name: string;
  fullName: string;
  kunya?: string;
  tabaqah: string; // الطبقة والجيل
  grade: string; // حكم الجرح والتعديل
  gradeType: 'sahabi' | 'thiqah' | 'saduq' | 'maqbul' | 'daif';
  death?: string; // سنة ومكان الوفاة
  residence?: string; // بلد الإقامة
  lineage?: string; // النسب والقبيلة
  briefBio: string; // نبذة موجزة
  teachers?: string[]; // أبرز الشيوخ
  students?: string[]; // أبرز التلاميذ
  scholarlyOpinions: NarratorScholarlyOpinion[];
}

export type IsnadNodeRole =
  | 'المصنف'
  | 'شيخ المصنف'
  | 'راوٍ'
  | 'التابعي'
  | 'الصحابي الجليل'
  | 'خاتم الأنبياء ﷺ';

export interface IsnadNode {
  order: number;
  role: IsnadNodeRole;
  name: string;
  phrase: string;
  isSahabi?: boolean;
}

export interface ParsedIsnad {
  hasSanad: boolean;
  nodes: IsnadNode[];
  sanadText: string;
  matnText: string;
  narratorCount: number;
  chainTypeArabic: string;
}

export interface GradeFilterOption {
  id: 'all' | 'muttafaqun' | 'sahih' | 'hasan' | 'daif' | 'mawdu';
  name: string;
  dotColor?: string;
  activeClass?: string;
}
