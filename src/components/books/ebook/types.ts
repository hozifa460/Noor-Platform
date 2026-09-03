import type { EBookMetaResponse } from '@/lib/book-text-engine';
import type { BookChapterChunk, InBookSearchResult, BookHighlight, SectionParagraph } from '@/lib/book-types';
import type { MediaItem } from '@/lib/types';

export type ReadingTheme = 'light' | 'sepia' | 'oasis' | 'oled';
export type TashkeelMode = 'full' | 'light' | 'none';
export type FontFamily = 'amiri' | 'naskh' | 'kufi' | 'traditional';
export type SidebarTab = 'toc' | 'search' | 'notes';

export interface ThemeStyle {
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

export const THEME_STYLES: Record<ReadingTheme, ThemeStyle> = {
  light: {
    bg: 'bg-stone-50',
    text: 'text-stone-900',
    cardBg: 'bg-white/90',
    border: 'border-stone-200',
    accent: 'text-amber-700',
    headerBg: 'bg-white/95 backdrop-blur-md border-stone-200',
    subtext: 'text-stone-600',
    highlightYellow: 'bg-amber-200/80 text-stone-950',
    highlightGreen: 'bg-emerald-200/80 text-stone-950',
    highlightBlue: 'bg-sky-200/80 text-stone-950',
    highlightPink: 'bg-rose-200/80 text-stone-950',
  },
  sepia: {
    bg: 'bg-[#fbf0d9]',
    text: 'text-[#43301a]',
    cardBg: 'bg-[#f4e4c1]/70',
    border: 'border-[#dfcaa4]',
    accent: 'text-[#8c5017]',
    headerBg: 'bg-[#f7ebd0]/95 backdrop-blur-md border-[#dfcaa4]',
    subtext: 'text-[#705638]',
    highlightYellow: 'bg-[#eed07a] text-[#342410]',
    highlightGreen: 'bg-[#c6dfaa] text-[#1c3814]',
    highlightBlue: 'bg-[#bad5e8] text-[#152e42]',
    highlightPink: 'bg-[#f1c3be] text-[#421b18]',
  },
  oasis: {
    bg: 'bg-[#0a1612]',
    text: 'text-emerald-50',
    cardBg: 'bg-[#10241e]/80',
    border: 'border-emerald-800/40',
    accent: 'text-emerald-400',
    headerBg: 'bg-[#0d1e18]/95 backdrop-blur-md border-emerald-800/40',
    subtext: 'text-emerald-200/70',
    highlightYellow: 'bg-amber-500/30 text-amber-200 border-b border-amber-400/50',
    highlightGreen: 'bg-emerald-500/30 text-emerald-200 border-b border-emerald-400/50',
    highlightBlue: 'bg-cyan-500/30 text-cyan-200 border-b border-cyan-400/50',
    highlightPink: 'bg-rose-500/30 text-rose-200 border-b border-rose-400/50',
  },
  oled: {
    bg: 'bg-black',
    text: 'text-neutral-200',
    cardBg: 'bg-neutral-900/90',
    border: 'border-neutral-800',
    accent: 'text-amber-400',
    headerBg: 'bg-neutral-950/95 backdrop-blur-md border-neutral-800',
    subtext: 'text-neutral-400',
    highlightYellow: 'bg-amber-500/25 text-amber-100',
    highlightGreen: 'bg-emerald-500/25 text-emerald-100',
    highlightBlue: 'bg-blue-500/25 text-blue-100',
    highlightPink: 'bg-rose-500/25 text-rose-100',
  },
};

export const FONT_CLASSES: Record<FontFamily, string> = {
  amiri: 'font-serif',
  naskh: 'font-sans',
  kufi: 'font-mono',
  traditional: 'font-serif tracking-wide',
};

// Helper for dynamic Tashkeel stripping
export function filterTashkeel(text: string, mode: TashkeelMode): string {
  if (mode === 'full') return text;
  if (mode === 'none') {
    return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  }
  // Light mode: Keep Shaddah (\u0651) and Tanween, strip Sukun and simple vowels
  return text.replace(/[\u064E\u064F\u0650\u0652]/g, '');
}

export type {
  EBookMetaResponse,
  BookChapterChunk,
  InBookSearchResult,
  BookHighlight,
  SectionParagraph,
  MediaItem,
};
