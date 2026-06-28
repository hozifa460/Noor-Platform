'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Youtube, FileText, Headphones, Radio, Video, X, Heart, Share2, Download, Loader2, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { YouTubePlayer } from './YouTubePlayer';
import { Html5Player } from './Html5Player';
// Lazy-load the PdfReader (and its pdfjs-dist dependency) ONLY when a PDF
// is actually opened. This keeps the initial bundle small and avoids
// loading the ~1MB pdfjs-dist chunk until needed. Also disables SSR
// because pdfjs-dist uses browser-only APIs (DOMMatrix, canvas, etc.).
const PdfReader = dynamic(
  () => import('./PdfReader').then((m) => m.PdfReader),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[3/4] sm:aspect-[4/3] w-full bg-muted rounded-xl grid place-items-center">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">جاري تحميل القارئ...</p>
        </div>
      </div>
    ),
  },
);
import { useContinueWatchingStore } from '@/stores/continue-watching.store';
import { useHistoryStore } from '@/stores/history.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useDownloadsStore } from '@/stores/downloads.store';
import { putBlob } from '@/lib/offline-db';
import { triggerDownload, downloadForOffline } from '@/lib/download';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MediaPlayerProps {
  item: MediaItem | null;
  onClose: () => void;
}

/** Decide which player kind to use based on available URLs. */
function pickPlayer(item: MediaItem): 'youtube' | 'video' | 'audio' | 'live' | 'pdf' | 'fatwa' | null {
  // Fatwa items are text-only — render the question + answer reader.
  if (item.section === 'fatwa') return 'fatwa';
  if (item.youtubeUrl) return 'youtube';
  if (item.liveUrl) return 'live';
  if (item.pdfUrl) return 'pdf';
  if (item.videoUrl) return 'video';
  if (item.audioUrl) return 'audio';
  return null;
}

export function MediaPlayer({ item, onClose }: MediaPlayerProps) {
  const [loading, setLoading] = useState(true);
  const upsertSession = useContinueWatchingStore((s) => s.upsert);
  const getSession = useContinueWatchingStore((s) => s.get);
  const recordHistory = useHistoryStore((s) => s.record);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const downloads = useDownloadsStore((s) => s.downloads);
  const addDownload = useDownloadsStore((s) => s.add);

  const session = item ? getSession(item.id) : undefined;
  const startPos = session?.position && session.position > 5 ? session.position : 0;

  useEffect(() => {
    setLoading(true);
    if (item) {
      // Record history when opening
      recordHistory({ itemId: item.id });
    }
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [item, recordHistory]);

  // Lock body scroll while open
  useEffect(() => {
    if (item) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [item]);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!item) return;
      upsertSession({
        itemId: item.id,
        position: currentTime,
        duration: duration || undefined,
        updatedAt: Date.now(),
      });
    },
    [item, upsertSession],
  );

  const handleEnded = useCallback(() => {
    if (!item) return;
    // Clear continue-watching on completion
    upsertSession({ itemId: item.id, position: 0, updatedAt: Date.now() });
  }, [item, upsertSession]);

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!item) return;
    // First: trigger the browser download (works for direct URLs, YouTube via
    // yt-dlp, or fallback helper service).
    const format: 'audio' | 'video' = item.audioUrl && !item.videoUrl && !item.youtubeUrl
      ? 'audio'
      : 'video';
    triggerDownload(item, format);

    // Second: also cache the file in IndexedDB for offline access.
    // Skip for live streams (can't be meaningfully downloaded) and YouTube
    // (would require the resolved direct URL — the /api/download route handles
    // streaming, but storing the full video in IndexedDB is too heavy).
    if (item.liveUrl && !item.videoUrl && !item.audioUrl) return;
    if (item.youtubeUrl) return; // Cached via browser download only.

    setDownloading(true);
    try {
      const { blob, size } = await downloadForOffline(item, (p) => {
        // Could show progress in the future.
      });
      const blobKey = `${item.id}`;
      await putBlob(blobKey, blob);
      addDownload({
        itemId: item.id,
        url: item.audioUrl || item.videoUrl || item.pdfUrl || '',
        blobKey,
        size,
        addedAt: Date.now(),
        progress: 1,
      });
      toast.success('تم حفظ نسخة للوصول دون اتصال');
    } catch {
      // The browser download already started; offline copy is best-effort.
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    const url = item.youtubeUrl || item.videoUrl || item.audioUrl || item.liveUrl || item.pdfUrl || '';
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('تم نسخ الرابط');
      }
    } catch {
      /* user cancelled */
    }
  };

  if (!item) return null;

  const kind = pickPlayer(item);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4">
      <div
        className={
          // PDFs and fatwas get a wider modal (max-w-6xl) so the reader
          // has room for the sidebar + page area.
          kind === 'pdf' || kind === 'fatwa'
            ? 'bg-background w-full sm:max-w-6xl sm:rounded-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[95vh]'
            : 'bg-background w-full sm:max-w-5xl sm:rounded-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]'
        }
        role="dialog"
        aria-modal="true"
        aria-label={`مشغل: ${item.title}`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base sm:text-lg truncate">{item.title}</h2>
            {item.sheikhName && (
              <p className="text-xs text-muted-foreground truncate">{item.sheikhName}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق">
            <X className="size-5" />
          </Button>
        </div>

        {/* Player area */}
        <div className="flex-1 overflow-auto bg-black/95 sm:bg-background">
          {loading ? (
            <div className="aspect-video grid place-items-center">
              <Loader2 className="size-10 animate-spin text-primary" />
            </div>
          ) : kind === null ? (
            <div className="aspect-video grid place-items-center text-center p-6">
              <div>
                <Video className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">لا توجد وسائط قابلة للتشغيل لهذا العنصر</p>
              </div>
            </div>
          ) : kind === 'youtube' ? (
            <YouTubePlayer url={item.youtubeUrl!} start={startPos} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
          ) : kind === 'live' ? (
            <div>
              <Html5Player
                url={item.liveUrl!}
                poster={item.imageUrl}
                isLive
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full pulse-live">
                <Radio className="size-3" />
                مباشر
              </div>
            </div>
          ) : kind === 'video' ? (
            <Html5Player
              url={item.videoUrl!}
              poster={item.imageUrl}
              start={startPos}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
            />
          ) : kind === 'audio' ? (
            <div className="p-4 sm:p-6">
              {item.imageUrl && (
                <div className="relative w-full max-w-md mx-auto mb-4 aspect-square rounded-2xl overflow-hidden shadow-2xl">
                  { }
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}
              <Html5Player
                url={item.audioUrl!}
                start={startPos}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
            </div>
          ) : kind === 'pdf' ? (
            <div className="p-2 sm:p-4 bg-background">
              <PdfReader url={item.pdfUrl!} title={item.title} />
            </div>
          ) : kind === 'fatwa' ? (
            <div className="p-4 sm:p-6 bg-background overflow-auto max-h-[70vh]">
              <FatwaReader item={item} />
            </div>
          ) : null}
        </div>

        {/* Footer with actions + description */}
        <div className="border-t border-border p-4 shrink-0 bg-background">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {kind === 'youtube' && <Badge variant="secondary" className="gap-1"><Youtube className="size-3" /> يوتيوب</Badge>}
            {kind === 'audio' && <Badge variant="secondary" className="gap-1"><Headphones className="size-3" /> صوت</Badge>}
            {kind === 'live' && <Badge variant="destructive" className="gap-1"><Radio className="size-3" /> مباشر</Badge>}
            {kind === 'video' && <Badge variant="secondary" className="gap-1"><Video className="size-3" /> فيديو</Badge>}
            {kind === 'pdf' && <Badge variant="secondary" className="gap-1"><FileText className="size-3" /> PDF</Badge>}
            {kind === 'fatwa' && <Badge variant="secondary" className="gap-1"><FileQuestion className="size-3" /> فتوى</Badge>}
            {item.tags?.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
            ))}
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant={isFavorite(item.id) ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleFavorite(item.id)}
              className="gap-2"
            >
              <Heart className={cn('size-4', isFavorite(item.id) && 'fill-current')} />
              {isFavorite(item.id) ? 'في المفضلة' : 'أضف للمفضلة'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="gap-2"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {downloading ? 'جاري التنزيل...' : 'تنزيل'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="size-4" />
              مشاركة
            </Button>
            {session && session.position > 5 && (
              <Badge variant="secondary" className="text-[10px] mr-auto">
                استئناف من {Math.floor(session.position / 60)}:{String(Math.floor(session.position % 60)).padStart(2, '0')}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  FatwaReader — text-only view for fatwa items (question + answer).
// ════════════════════════════════════════════════════════════════

function FatwaReader({ item }: { item: MediaItem }) {
  const question = item.description || '';
  const answer = item.answer || '';

  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      {/* Question section */}
      {question && (
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-primary mb-3 border-b border-border pb-2">
            <FileQuestion className="size-4" />
            السؤال
          </h3>
          <p className="text-foreground leading-loose whitespace-pre-wrap text-sm sm:text-base">
            {question}
          </p>
        </section>
      )}

      {/* Answer section */}
      {answer ? (
        <section>
          <h3 className="flex items-center gap-2 text-base font-bold text-primary mb-3 border-b border-border pb-2">
            <FileText className="size-4" />
            الجواب
          </h3>
          <div className="text-foreground leading-loose whitespace-pre-wrap text-sm sm:text-base">
            {answer}
          </div>
        </section>
      ) : (
        <div className="py-10 text-center text-muted-foreground">
          <FileQuestion className="size-10 mx-auto mb-2 opacity-40" />
          <p>لا يوجد نص جواب متاح لهذه الفتوى</p>
        </div>
      )}

      {/* Source attribution */}
      {(item.sheikhName || item.groupTitle || item.sourceFile) && (
        <footer className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
          {item.sheikhName && (
            <p><span className="font-medium">الشيخ:</span> {item.sheikhName}</p>
          )}
          {item.groupTitle && (
            <p><span className="font-medium">المصدر:</span> {item.groupTitle}</p>
          )}
          {item.sourceFile && (
            <p className="opacity-60 truncate"><span className="font-medium">الملف:</span> {item.sourceFile}</p>
          )}
        </footer>
      )}
    </article>
  );
}
