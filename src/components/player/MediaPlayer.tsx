'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { X, Video, Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { YouTubePlayer } from './YouTubePlayer';
import { Html5Player } from './Html5Player';
import { FatwaReader } from './FatwaReader';
import { MediaPlayerFooter } from './MediaPlayerFooter';
import { useContinueWatchingStore } from '@/stores/continue-watching.store';
import { useHistoryStore } from '@/stores/history.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useDownloadsStore } from '@/stores/downloads.store';
import { putBlob } from '@/lib/offline-db';
import { triggerDownload, downloadForOffline } from '@/lib/download';
import { pickPlayer } from '@/lib/player-resolver';
import type { MediaItem } from '@/lib/types';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EBookTextReader } from '@/components/books/EBookTextReader';
import { VectorMushafReader } from '@/components/books/VectorMushafReader';

// Lazy-load PdfViewer
const PdfViewer = dynamic(
  () => import('@/components/pdf-viewer').then((m) => m.PdfViewer),
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
  }
);

interface MediaPlayerProps {
  item: MediaItem | null;
  onClose: () => void;
}

export function MediaPlayer({ item, onClose }: MediaPlayerProps) {
  const [showPdfOverride, setShowPdfOverride] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const upsertSession = useContinueWatchingStore((s) => s.upsert);
  const getSession = useContinueWatchingStore((s) => s.get);
  const recordHistory = useHistoryStore((s) => s.record);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const addDownload = useDownloadsStore((s) => s.add);

  const session = item ? getSession(item.id) : undefined;
  const startPos = session?.position && session.position > 5 ? session.position : 0;

  useEffect(() => {
    if (item) {
      recordHistory({ itemId: item.id });
    }
  }, [item, recordHistory]);

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
    [item, upsertSession]
  );

  const handleEnded = useCallback(() => {
    if (!item) return;
    upsertSession({ itemId: item.id, position: 0, updatedAt: Date.now() });
  }, [item, upsertSession]);

  const handleDownload = async () => {
    if (!item) return;
    const format: 'audio' | 'video' =
      item.audioUrl && !item.videoUrl && !item.youtubeUrl ? 'audio' : 'video';
    triggerDownload(item, format);

    if (item.liveUrl && !item.videoUrl && !item.audioUrl) return;
    if (item.youtubeUrl) return;

    setDownloading(true);
    try {
      const { blob, size } = await downloadForOffline(item, () => {});
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
      // Best-effort
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    if (!item) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success('تم نسخ الرابط');
    }
  };

  if (!item) return null;

  const rawKind = pickPlayer(item);
  const kind = showPdfOverride ? 'pdf' : rawKind;

  // Dedicated Full-screen Vector Mushaf Reader
  if (kind === 'mushaf') {
    return (
      <VectorMushafReader
        bookItem={item}
        onClose={onClose}
        onSwitchToPdf={item.pdfUrl ? () => setShowPdfOverride(true) : undefined}
      />
    );
  }

  // Pure Text Interactive eBook Reader
  if (kind === 'ebook') {
    return (
      <EBookTextReader
        bookItem={item}
        onClose={onClose}
        onSwitchToPdf={item.pdfUrl ? () => setShowPdfOverride(true) : undefined}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-card rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0 bg-background/50 backdrop-blur-sm">
          <div className="min-w-0 flex-1 pl-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
              {item.title}
            </h2>
            {item.sheikhName && (
              <p className="text-xs text-muted-foreground truncate">{item.sheikhName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 rounded-full shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Player Media Container */}
        <div className="relative flex-1 min-h-0 overflow-y-auto bg-black flex items-center justify-center">
          <ErrorBoundary>
            {kind === null ? (
              <div className="aspect-video grid place-items-center text-center p-6 bg-card w-full">
                <div>
                  <Video className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا توجد وسائط قابلة للتشغيل لهذا العنصر</p>
                </div>
              </div>
            ) : kind === 'youtube' ? (
              <YouTubePlayer
                url={item.youtubeUrl!}
                start={startPos}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
              />
            ) : kind === 'live' ? (
              <div className="w-full relative">
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
              <div className="p-4 sm:p-6 w-full">
                {item.imageUrl && (
                  <div className="relative w-full max-w-md mx-auto mb-4 aspect-square rounded-2xl overflow-hidden shadow-2xl">
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
              <div className="p-2 sm:p-4 bg-background w-full">
                <PdfViewer url={item.pdfUrl!} title={item.title} bookSlug={item.id} />
              </div>
            ) : kind === 'fatwa' ? (
              <div className="p-4 sm:p-6 bg-background overflow-auto max-h-[70vh] w-full">
                <FatwaReader item={item} />
              </div>
            ) : null}
          </ErrorBoundary>
        </div>

        {/* Footer with actions + description */}
        <MediaPlayerFooter
          item={item}
          kind={kind}
          isFav={isFavorite(item.id)}
          onToggleFav={() => toggleFavorite(item.id)}
          onDownload={handleDownload}
          downloading={downloading}
          onShare={handleShare}
          sessionPosition={session?.position}
        />
      </div>
    </div>
  );
}
