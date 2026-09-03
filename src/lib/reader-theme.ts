import type {
  ReadingTheme,
  MushafTheme,
  TashkeelMode,
  FontFamily,
  ThemeStyleConfig,
  MushafThemeStyleConfig,
} from '@/types/reader';
import { TASHKEEL_REGEX } from '@/lib/arabic-normalizer';

export const THEME_STYLES: Record<ReadingTheme, ThemeStyleConfig> = {
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

export const MUSHAF_THEME_STYLES: Record<MushafTheme, MushafThemeStyleConfig> = {
  gold: {
    bg: 'bg-[#faf7f2]',
    text: 'text-stone-900',
    cardBg: 'bg-white/95',
    border: 'border-amber-200/70',
    accent: 'text-amber-700',
    headerBg: 'bg-white/95 backdrop-blur-md border-amber-200/60',
    ayahBorder: 'border-amber-500/20 hover:border-amber-500/60',
    ayahNumberBg: 'bg-amber-500/15',
    ayahNumberText: 'text-amber-800 font-bold',
    ayahText: 'text-stone-950 font-semibold',
  },
  sepia: {
    bg: 'bg-[#fcf3e3]',
    text: 'text-[#3e2c17]',
    cardBg: 'bg-[#f6ebd4]/90',
    border: 'border-[#ddc59d]',
    accent: 'text-[#874911]',
    headerBg: 'bg-[#f8eed7]/95 backdrop-blur-md border-[#ddc59d]',
    ayahBorder: 'border-[#c9aa79]/30 hover:border-[#874911]/60',
    ayahNumberBg: 'bg-[#874911]/15',
    ayahNumberText: 'text-[#693607] font-bold',
    ayahText: 'text-[#2a1705] font-semibold',
  },
  oasis: {
    bg: 'bg-[#07130f]',
    text: 'text-emerald-50',
    cardBg: 'bg-[#0e211b]/90',
    border: 'border-emerald-800/40',
    accent: 'text-emerald-400',
    headerBg: 'bg-[#0a1914]/95 backdrop-blur-md border-emerald-800/40',
    ayahBorder: 'border-emerald-700/30 hover:border-emerald-400/60',
    ayahNumberBg: 'bg-emerald-500/20',
    ayahNumberText: 'text-emerald-300 font-bold',
    ayahText: 'text-emerald-100 font-semibold',
  },
  oled: {
    bg: 'bg-black',
    text: 'text-neutral-200',
    cardBg: 'bg-neutral-900/90',
    border: 'border-neutral-800',
    accent: 'text-amber-400',
    headerBg: 'bg-neutral-950/95 backdrop-blur-md border-neutral-800',
    ayahBorder: 'border-neutral-800 hover:border-amber-500/40',
    ayahNumberBg: 'bg-neutral-800',
    ayahNumberText: 'text-amber-400 font-bold',
    ayahText: 'text-neutral-100 font-semibold',
  },
};

export const FONT_CLASSES: Record<FontFamily, string> = {
  amiri: 'font-serif',
  naskh: 'font-sans',
  kufi: 'font-mono',
  traditional: 'font-serif tracking-wide',
};

export function filterTashkeel(text: string, mode: TashkeelMode): string {
  if (mode === 'full') return text;
  if (mode === 'none') {
    return text.replace(TASHKEEL_REGEX, '');
  }
  // Light: keep essential vowels, remove subtle tajweed/sukoon diacritics
  return text.replace(/[\u0640\u0652\u0670\u06D6-\u06ED]/g, '');
}

