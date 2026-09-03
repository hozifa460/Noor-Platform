/**
 * Core Type Definitions for the High-Performance Islamic Pure-Text E-Book & Sharding Engine
 */

export type EBookCategory =
  | 'aqeedah'
  | 'sunnah'
  | 'fiqh'
  | 'usul'
  | 'seerah'
  | 'mwaez'
  | 'tazkiyah'
  | 'quran_sciences'
  | 'history'
  | 'multilingual';

export type EBookEra =
  | 'salaf' // القرون الأولى
  | 'classical' // العصر الكلاسيكي / الوسيط
  | 'late_classical' // العصر المتأخر
  | 'contemporary'; // العصر الحديث والمعاصر

export type IslamicArtCategory =
  | 'quran' // التفسير وعلوم القرآن
  | 'hadith' // الحديث وشروحه ورجاله
  | 'fiqh' // الفقه وأصوله والقواعد
  | 'aqeedah' // العقيدة والتوحيد
  | 'history' // السيرة والتاريخ والتراجم
  | 'language' // اللغة والأدب والشعر والمعاجم
  | 'raqaiq' // الرقائق والزهد والتزكية
  | 'general'; // عام ومتنوع

export interface TableOfContentsItem {
  id: string;
  title: string;
  chapterIndex: number;
  pageNumber: number;
  level: 1 | 2 | 3;
  volumeNumber?: number;
  children?: TableOfContentsItem[];
}

export interface EBookMetadata {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  authorDeath?: string; // e.g. "321 هـ"
  investigator?: string; // المحقق
  category: EBookCategory;
  islamicArt?: IslamicArtCategory;
  century?: number; // 1 to 15
  era?: EBookEra;
  language: string; // 'ar', 'en', etc.
  totalVolumes: number;
  totalPages: number;
  totalChapters: number;
  totalWords: number;
  hasFacsimilePdf: boolean;
  pdfUrl?: string;
  coverGradient: string; // Tailwind gradient class or hex colors
  accentColor: string; // e.g. '#10b981'
  description: string;
  tags: string[];
  edition?: string;
  publisher?: string;
  featured?: boolean;
}

export interface SectionParagraph {
  id: string;
  text: string;
  isHeading?: boolean;
  headingLevel?: 1 | 2 | 3 | 4;
  pageNumber: number;
  volumeNumber?: number;
  volumePageBadge?: string; // e.g. "[ج ١، ص ٢٤]"
  isPoetry?: boolean;
  hemistich1?: string; // صدر البيت
  hemistich2?: string; // عجز البيت
  isHadithSanad?: boolean; // إسناد حديث
  footnotes?: Array<{
    id: number;
    text: string;
  }>;
}

export interface BookChapterChunk {
  bookId: string;
  chapterIndex: number;
  title: string;
  startPage: number;
  endPage: number;
  paragraphs: SectionParagraph[];
  wordCount: number;
  summary?: string;
}

export interface InBookSearchResult {
  bookId: string;
  chapterIndex: number;
  chapterTitle: string;
  pageNumber: number;
  snippet: string;
  score: number;
}

export interface ReadingProgress {
  bookId: string;
  chapterIndex: number;
  pageNumber: number;
  scrollRatio: number;
  lastReadTimestamp: number;
  completedPercent: number;
}

export interface BookHighlight {
  id: string;
  bookId: string;
  chapterIndex: number;
  pageNumber: number;
  text: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  note?: string;
  createdAt: number;
}
