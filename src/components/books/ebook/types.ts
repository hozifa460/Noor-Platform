import type { EBookMetaResponse } from '@/lib/book-text-engine';
import type { BookChapterChunk, InBookSearchResult, BookHighlight, SectionParagraph } from '@/lib/book-types';
import type { MediaItem } from '@/lib/types';
import type {
  ReadingTheme,
  TashkeelMode,
  FontFamily,
  ThemeStyleConfig,
} from '@/types/reader';
import {
  THEME_STYLES,
  FONT_CLASSES,
  filterTashkeel,
} from '@/lib/reader-theme';

export type SidebarTab = 'toc' | 'search' | 'notes';
export type ThemeStyle = ThemeStyleConfig;

export {
  THEME_STYLES,
  FONT_CLASSES,
  filterTashkeel,
};

export type {
  ReadingTheme,
  TashkeelMode,
  FontFamily,
  EBookMetaResponse,
  BookChapterChunk,
  InBookSearchResult,
  BookHighlight,
  SectionParagraph,
  MediaItem,
};
