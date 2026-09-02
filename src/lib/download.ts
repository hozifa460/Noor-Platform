'use client';

import type { MediaItem } from './types';
import { toast } from 'sonner';

const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/i;

function safeFilename(title: string, ext: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 120) || 'noor-media';
  return `${base}.${ext}`;
}

/**
 * Triggers a browser download for a media item.
 *
 * YouTube content is never downloaded through third-party rippers (legal and
 * safety risk); we open the original video on YouTube instead.
 *
 * Direct files (archive.org, mp3quran, mp4/mp3 CDNs) are downloaded straight
 * from the origin via an anchor element — no proxying through our servers.
 */
export function triggerDownload(item: MediaItem, format: 'audio' | 'video' = 'video'): void {
  const sourceUrl = item.videoUrl || item.audioUrl || item.youtubeUrl || item.liveUrl || item.pdfUrl;
  if (!sourceUrl) {
    toast.error('لا يوجد ملف قابل للتنزيل لهذا العنصر');
    return;
  }

  if (YOUTUBE_RE.test(sourceUrl)) {
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    toast.info('تم فتح المقطع على يوتيوب', {
      description: 'التنزيل من يوتيوب متاح عبر تطبيق YouTube Premium الرسمي',
      duration: 4000,
    });
    return;
  }

  const effectiveFormat: 'audio' | 'video' =
    format === 'audio' || (!item.videoUrl && !!item.audioUrl) ? 'audio' : 'video';
  const ext = item.pdfUrl && sourceUrl === item.pdfUrl ? 'pdf' : effectiveFormat === 'audio' ? 'mp3' : 'mp4';

  const a = document.createElement('a');
  a.href = sourceUrl;
  a.download = safeFilename(item.title, ext);
  a.rel = 'noopener noreferrer';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();

  const kindLabel = ext === 'pdf' ? 'الكتاب' : effectiveFormat === 'audio' ? 'الصوت' : 'الفيديو';
  toast.success(`جاري تنزيل ${kindLabel}...`, { duration: 3000 });
}

/**
 * Downloads a media item and stores it in IndexedDB for offline access.
 * Used by the Downloads feature. YouTube items are not supported.
 */
export async function downloadForOffline(
  item: MediaItem,
  onProgress?: (progress: number) => void,
): Promise<{ blob: Blob; size: number }> {
  const sourceUrl = item.videoUrl || item.audioUrl || item.liveUrl || item.pdfUrl;
  if (!sourceUrl || YOUTUBE_RE.test(sourceUrl)) {
    throw new Error('التحميل للاستخدام دون اتصال متاح فقط للملفات المباشرة (صوت/فيديو/كتب)');
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`فشل التنزيل: ${res.status}`);

  const total = Number(res.headers.get('content-length') || 0);
  if (!res.body || !total) {
    const blob = await res.blob();
    onProgress?.(1);
    return { blob, size: blob.size };
  }

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(Math.min(1, received / total));
    }
  }
  const blob = new Blob(chunks);
  return { blob, size: blob.size };
}
