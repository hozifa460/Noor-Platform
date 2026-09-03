import type { HadithBookMeta } from "./data";

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
