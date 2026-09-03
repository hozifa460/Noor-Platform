/**
 * Centralized TypeScript definitions for the Holy Quran domain.
 */

export interface AyahItem {
  ayahNo: number;
  ayahNoQuran: number;
  textAr: string;
  textEn: string;
  juz: number;
  manzil?: number;
  ruku?: number;
  hizbQuarter?: number;
  isSajdah?: boolean;
}

export interface SurahDetail {
  surahNo: number;
  nameAr: string;
  nameEn: string;
  nameRoman: string;
  placeOfRevelation: string;
  totalAyahs: number;
  ayahs: AyahItem[];
}

/** Alias for SurahDetail used across some reader components */
export type SurahData = SurahDetail;

export interface SurahMeta {
  number: number;
  nameAr: string;
  nameEn: string;
  nameTranslation: string;
  revelationType: 'Meccan' | 'Medinan';
  numberOfAyahs: number;
  startPage: number;
  juz: number;
}

export interface QiraahMeta {
  id: string;
  name: string;
  narrator: string;
  origin: string;
  description: string;
  pdfUrl: string;
  featured?: boolean;
}

export interface ReciterMeta {
  id: string;
  name: string;
  subfolder: string;
}

export interface QuranTranslationMeta {
  code: string;
  name: string;
  language: string;
  direction: 'rtl' | 'ltr';
  author: string;
}
