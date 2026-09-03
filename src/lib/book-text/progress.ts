import { getBlob, putBlob } from '../shared/offline-db';
import type { ReadingProgress, BookHighlight } from '../books/types';
import {
  loadEBookMeta,
  loadChapterChunk,
  type EBookMetaResponse,
} from './chapters';

const PROGRESS_PREFIX = 'noor-ebook-progress:';
const HIGHLIGHTS_PREFIX = 'noor-ebook-highlights:';

/**
 * Export and trigger a clean formatted text download of the book to the user's phone/computer
 */
export async function downloadBookTextFile(bookId: string, customTitle?: string): Promise<boolean> {
  try {
    const meta = await loadEBookMeta(bookId);
    if (!meta) return false;

    let fullText = `═══════════════════════════════════════\n`;
    fullText += `  ${meta.meta.title}\n`;
    fullText += `  المؤلف: ${meta.meta.author}\n`;
    if (meta.meta.description) fullText += `  ${meta.meta.description}\n`;
    fullText += `  المصدر: منصة نور - المكتبة الرقمية\n`;
    fullText += `═══════════════════════════════════════\n\n`;

    for (let i = 1; i <= meta.meta.totalChapters; i++) {
      const chunk = await loadChapterChunk(bookId, i);
      if (chunk) {
        fullText += `\n\n─── ${chunk.title} ───\n\n`;
        for (const p of chunk.paragraphs) {
          if (p.isHeading) {
            fullText += `\n■ ${p.text}\n\n`;
          } else {
            fullText += `${p.text}\n\n`;
          }
        }
      }
    }

    if (typeof window !== 'undefined') {
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanFileName = (customTitle || meta.meta.title || 'كتاب').replace(/[\\/:*?"<>|]/g, '_');
      a.download = `${cleanFileName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return true;
  } catch (err) {
    console.error('Failed to download book text file:', err);
    return false;
  }
}

/**
 * Save an entire pure-text eBook for 100% offline reading with progress callback
 */
export async function saveEBookForOffline(
  bookId: string,
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
): Promise<boolean> {
  try {
    const metaRes = await loadEBookMeta(bookId);
    if (!metaRes) return false;

    // 1. Save meta
    await putBlob(
      `ebook:${bookId}:meta`,
      new Blob([JSON.stringify(metaRes)], { type: 'application/json' })
    );

    // 2. Save search index
    try {
      const sRes = await fetch(`/data/ebooks/${bookId}/search_index.json`);
      if (sRes.ok) {
        const sData = await sRes.text();
        await putBlob(
          `ebook:${bookId}:search_index`,
          new Blob([sData], { type: 'application/json' })
        );
      }
    } catch {
      /* ignore */
    }

    // 3. Download & save all chapter chunks
    const totalChapters = metaRes.meta.totalChapters;
    for (let c = 1; c <= totalChapters; c++) {
      const chunk = await loadChapterChunk(bookId, c);
      if (chunk) {
        await putBlob(
          `ebook:${bookId}:chunk:${c}`,
          new Blob([JSON.stringify(chunk)], { type: 'application/json' })
        );
      }
      if (onProgress) {
        const percent = Math.round((c / totalChapters) * 100);
        onProgress({ current: c, total: totalChapters, percent });
      }
    }

    return true;
  } catch (err) {
    console.error(`[book-text-engine] Error saving ${bookId} for offline:`, err);
    return false;
  }
}

/**
 * Check if a book is fully cached in offline IndexedDB storage
 */
export async function isEBookCachedOffline(bookId: string): Promise<boolean> {
  try {
    const metaBlob = await getBlob(`ebook:${bookId}:meta`);
    if (!metaBlob) return false;

    const metaRes = JSON.parse(await metaBlob.text()) as EBookMetaResponse;
    const total = metaRes.meta.totalChapters;

    for (let c = 1; c <= total; c++) {
      const chunkBlob = await getBlob(`ebook:${bookId}:chunk:${c}`);
      if (!chunkBlob) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getReadingProgress(bookId: string): ReadingProgress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + bookId);
    return raw ? (JSON.parse(raw) as ReadingProgress) : null;
  } catch {
    return null;
  }
}

export function saveReadingProgress(progress: ReadingProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_PREFIX + progress.bookId, JSON.stringify(progress));
  } catch {
    /* ignore storage quota errors */
  }
}

export function getBookHighlights(bookId: string): BookHighlight[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIGHLIGHTS_PREFIX + bookId);
    return raw ? (JSON.parse(raw) as BookHighlight[]) : [];
  } catch {
    return [];
  }
}

export function saveBookHighlight(highlight: BookHighlight): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getBookHighlights(highlight.bookId);
    const updated = [highlight, ...current.filter((h) => h.id !== highlight.id)];
    localStorage.setItem(HIGHLIGHTS_PREFIX + highlight.bookId, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}
