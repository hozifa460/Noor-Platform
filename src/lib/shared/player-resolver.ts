import type { MediaItem } from '@/lib/types';
import { isQuranBook, isPureTextBook, isOpenItiBook, isShamelaBook } from './classifier';

export type PlayerKind =
  | 'youtube'
  | 'video'
  | 'audio'
  | 'live'
  | 'pdf'
  | 'fatwa'
  | 'ebook'
  | 'mushaf'
  | null;

/**
 * Decide which player kind to use based on available URLs and item tags.
 */
export function pickPlayer(item: MediaItem): PlayerKind {
  // 1. Quran Mushaf items (Always check FIRST to prevent Quran items from being swallowed by book reader)
  if (isQuranBook(item)) {
    return 'mushaf';
  }

  // 2. Pure text eBook, Shamela 4 books, or OpenITI classical texts
  if (
    isPureTextBook(item) ||
    isOpenItiBook(item) ||
    isShamelaBook(item)
  ) {
    return 'ebook';
  }

  // 3. Fatwa items are text-only — render the question + answer reader.
  if (item.section === 'fatwa') return 'fatwa';
  if (item.youtubeUrl) return 'youtube';
  if (item.liveUrl) return 'live';
  if (item.pdfUrl && item.pdfUrl.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (item.pdfUrl) return 'ebook';
  if (item.videoUrl) return 'video';
  if (item.audioUrl) return 'audio';
  return null;
}
