'use client';

import type { MediaItem } from './types';
import { toast } from 'sonner';

/**
 * Extracts the YouTube video ID from any YouTube URL form.
 */
function extractYouTubeId(url: string): string | null {
  try {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    if (url.includes('youtube.com/watch')) {
      const u = new URL(url);
      const v = u.searchParams.get('v');
      return v && v.length === 11 ? v : null;
    }
    if (url.includes('youtube.com/embed/') || url.includes('youtube.com/shorts/')) {
      const id = url.split(/\/(?:embed|shorts)\//)[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Triggers a browser download for any media item.
 *
 * For YouTube URLs: opens a dedicated download page (/download/[videoId])
 * that offers multiple download services with quality options.
 *
 * For direct URLs (archive.org, mp3, mp4, etc.): streams through /api/download
 * which proxies the file as an attachment.
 *
 * For offline use (IndexedDB), callers can use `downloadForOffline()` instead.
 */
export function triggerDownload(item: MediaItem, format: 'audio' | 'video' = 'video'): void {
  const sourceUrl = item.videoUrl || item.audioUrl || item.youtubeUrl || item.liveUrl || item.pdfUrl;
  if (!sourceUrl) {
    toast.error('لا يوجد ملف قابل للتنزيل لهذا العنصر');
    return;
  }

  const effectiveFormat: 'audio' | 'video' =
    format === 'audio' || (!item.videoUrl && !item.youtubeUrl && !!item.audioUrl)
      ? 'audio'
      : 'video';

  const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(sourceUrl);

  if (isYouTube) {
    const videoId = extractYouTubeId(sourceUrl);
    if (videoId) {
      // Open the dedicated download page in a new tab.
      // The page shows multiple download services (cobalt, y2mate, savefrom, etc.)
      // and lets the user pick quality + format (MP4/MP3).
      const downloadPageUrl = `/download/${videoId}`;
      window.open(downloadPageUrl, '_blank');
      toast.success('جاري فتح صفحة التنزيل...', {
        description: 'اختر خدمة التنزيل والجودة المناسبة',
        duration: 4000,
      });
      return;
    }
  }

  // Direct URL: stream through /api/download as an attachment.
  const params = new URLSearchParams({
    url: sourceUrl,
    format: effectiveFormat,
    filename: item.title.slice(0, 120),
  });
  const downloadUrl = `/api/download?${params.toString()}`;

  // Use a hidden iframe so the browser downloads without navigating away.
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = downloadUrl;
  document.body.appendChild(iframe);
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 60000);

  const kindLabel = effectiveFormat === 'audio' ? 'الصوت' : 'الفيديو';
  toast.success(`جاري تنزيل ${kindLabel}...`, { duration: 3000 });
}

/**
 * Downloads a media item and stores it in IndexedDB for offline access.
 * Used by the Downloads feature.
 */
export async function downloadForOffline(
  item: MediaItem,
  onProgress?: (progress: number) => void,
): Promise<{ blob: Blob; size: number }> {
  const sourceUrl = item.videoUrl || item.audioUrl || item.youtubeUrl || item.liveUrl || item.pdfUrl;
  if (!sourceUrl) {
    throw new Error('لا يوجد ملف قابل للتنزيل');
  }

  const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(sourceUrl);

  if (isYouTube) {
    // YouTube downloads go through /api/download which tries yt-dlp.
    // If yt-dlp is blocked, it returns a redirect to a helper service.
    const params = new URLSearchParams({
      url: sourceUrl,
      format: 'video',
      filename: item.title.slice(0, 120),
    });
    const res = await fetch(`/api/download?${params.toString()}`);
    if (!res.ok) throw new Error(`فشل التنزيل: ${res.status}`);
    const blob = await res.blob();
    onProgress?.(1);
    return { blob, size: blob.size };
  }

  // Direct URL: fetch with progress tracking.
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`فشل التنزيل: ${res.status}`);

  const total = Number(res.headers.get('content-length') || 0);
  if (!res.body || !total) {
    const blob = await res.blob();
    onProgress?.(1);
    return { blob, size: blob.size };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
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
