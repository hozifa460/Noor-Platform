/**
 * Centralized TypeScript definitions for Readers (EBook and Mushaf).
 */

export type ReadingTheme = 'light' | 'sepia' | 'oasis' | 'oled';
export type MushafTheme = 'gold' | 'sepia' | 'oasis' | 'oled';
export type TashkeelMode = 'full' | 'light' | 'none';
export type FontFamily = 'amiri' | 'naskh' | 'kufi' | 'traditional';

export interface ThemeStyleConfig {
  bg: string;
  text: string;
  cardBg: string;
  border: string;
  accent: string;
  headerBg: string;
  subtext: string;
  highlightYellow: string;
  highlightGreen: string;
  highlightBlue: string;
  highlightPink: string;
}

export interface MushafThemeStyleConfig {
  bg: string;
  text: string;
  cardBg: string;
  border: string;
  accent: string;
  headerBg: string;
  ayahBorder: string;
  ayahNumberBg: string;
  ayahNumberText: string;
  ayahText: string;
}
