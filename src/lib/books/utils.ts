import type { MediaItem } from '@/lib/types';

/**
 * Common book classification utilities to avoid repeating tag checks across components.
 */

export function isQuranBook(book: MediaItem): boolean {
  return (
    (book.tags || []).some(
      (t) => t.includes('quran') || t.includes('مصحف') || t.includes('قراءة')
    ) ||
    (book.title || '').includes('مصحف') ||
    (book.title || '').includes('قرآن') ||
    book.id.startsWith('quran-')
  );
}

export function isPureTextBook(book: MediaItem): boolean {
  return (
    (book.tags || []).some((t) => t === 'ebook_text' || t === 'نص حي') ||
    book.id.startsWith('ebook-') ||
    book.mediaType === 'text_archive'
  );
}

export function isOpenItiBook(book: MediaItem): boolean {
  return (
    book.id.startsWith('openiti-') || (book.tags || []).includes('openiti')
  );
}

export function isShamelaBook(book: MediaItem): boolean {
  return (
    book.id.startsWith('shamela-') ||
    (book.tags || []).includes('شاملة') ||
    book.mediaType === 'shamela_archive' ||
    Boolean((book as unknown as Record<string, unknown>).shamelaPath)
  );
}
