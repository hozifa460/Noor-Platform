'use client';

import { useState } from 'react';
import { BookOpen, Download, Heart, Share2, Sparkles, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlayerStore } from '@/stores/player.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { downloadForOffline } from '@/lib/download';
import { downloadBookTextFile } from '@/lib/book-text-engine';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BookCardProps {
  book: MediaItem;
  viewMode?: 'grid' | 'list';
}

export function BookCard({ book, viewMode = 'grid' }: BookCardProps) {
  const openPlayer = usePlayerStore((s) => s.open);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(book.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isQuran =
    (book.tags || []).some((t) => t.includes('quran') || t.includes('مصحف') || t.includes('قراءة')) ||
    (book.title || '').includes('مصحف') ||
    (book.title || '').includes('قرآن');

  const isPureText =
    (book.tags || []).some((t) => t === 'ebook_text' || t === 'نص حي') ||
    book.id.startsWith('ebook-');

  const isOpenIti =
    book.id.startsWith('openiti-') || (book.tags || []).includes('openiti');

  const isShamela =
    book.id.startsWith('shamela-') || (book.tags || []).includes('شاملة') || Boolean((book as unknown as Record<string, unknown>).shamelaPath);

  const handleRead = () => {
    openPlayer(book);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      if (isPureText || isOpenIti || isShamela) {
        const ok = await downloadBookTextFile(book.id, book.title);
        if (ok) {
          toast.success('تم تنزيل نص الكتاب على جهازك بنجاح');
        } else {
          toast.error('تعذر تنزيل الكتاب');
        }
      } else {
        await downloadForOffline(book);
        toast.success('تم بدء تنزيل الكتاب');
      }
    } catch {
      toast.error('تعذر تنزيل الكتاب');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const shareUrl = book.pdfUrl || window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('تم نسخ رابط الكتاب');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleRead}
        className="group relative flex items-center gap-4 p-4 rounded-2xl bg-card/60 hover:bg-card border border-border/80 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
      >
        {/* Thumbnail Spine */}
        <div className="relative w-16 h-22 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-950 border border-amber-500/20 shadow-inner grid place-items-center">
          {book.imageUrl ? (
            <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-1">
              <BookOpen className={cn('size-6 mx-auto mb-1', isQuran ? 'text-amber-400' : 'text-emerald-300')} />
              <span className="text-[8px] font-bold text-amber-200/80 leading-tight line-clamp-1">
                {isQuran ? 'مصحف' : 'كتاب'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isQuran && (
              <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] gap-1">
                <Sparkles className="size-3" />
                مصحف شريف
              </Badge>
            )}
            {isPureText && (
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                <Sparkles className="size-3 text-emerald-500" />
                نص حي فوري
              </Badge>
            )}
            {book.language && book.language !== 'ar' && (
              <Badge variant="outline" className="text-[10px] uppercase gap-1">
                <Globe className="size-2.5" />
                {book.language}
              </Badge>
            )}
            {book.sheikhName && (
              <span className="text-xs text-muted-foreground line-clamp-1">
                {book.sheikhName}
              </span>
            )}
          </div>

          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {book.title}
          </h3>

          {((book as unknown as Record<string, unknown>).matchReason as string) && (
            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-500/20 shadow-sm animate-in fade-in duration-200">
              <span>{((book as unknown as Record<string, unknown>).matchReason as string)}</span>
            </div>
          )}

          {book.description && !(book as unknown as Record<string, unknown>).matchReason && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
              {book.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="default"
            onClick={handleRead}
            className="gap-1.5 font-medium shadow-sm"
          >
            <BookOpen className="size-4" />
            قراءة
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleFavorite(book.id)}
            aria-label="المفضلة"
            className={cn('size-8 text-muted-foreground hover:text-red-500', isFavorite && 'text-red-500 fill-red-500')}
          >
            <Heart className={cn('size-4', isFavorite && 'fill-current')} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="تنزيل"
            className="size-8 text-muted-foreground hover:text-foreground"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Grid Mode (Deluxe Book Presentation)
  return (
    <div
      onClick={handleRead}
      className="group relative flex flex-col rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer"
    >
      {/* Visual Book Cover Presentation */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-card to-muted flex flex-col justify-between p-4 border-b border-border/40">
        {book.imageUrl ? (
          <img
            src={book.imageUrl}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Deluxe Typography Islamic Cover */
          <div className="relative w-full h-full rounded-xl overflow-hidden p-4 flex flex-col justify-between text-center border border-amber-500/30 shadow-md bg-gradient-to-br from-emerald-950 via-teal-950 to-amber-950">
            {/* Ornamental Corners */}
            <div className="absolute inset-2 border border-amber-400/20 rounded-lg pointer-events-none" />
            <div className="absolute top-3 right-3 text-[10px] text-amber-400/40">✦</div>
            <div className="absolute top-3 left-3 text-[10px] text-amber-400/40">✦</div>
            <div className="absolute bottom-3 right-3 text-[10px] text-amber-400/40">✦</div>
            <div className="absolute bottom-3 left-3 text-[10px] text-amber-400/40">✦</div>

            {/* Top Emblem */}
            <div className="pt-2">
              <div className="size-10 mx-auto rounded-full bg-amber-500/10 border border-amber-400/30 grid place-items-center mb-2">
                <BookOpen className={cn('size-5', isQuran ? 'text-amber-400' : 'text-emerald-300')} />
              </div>
              <span className="text-[10px] tracking-wider text-amber-300/80 font-medium block">
                {isQuran ? 'مصحف شريف' : 'المكتبة الإسلامية'}
              </span>
            </div>

            {/* Title in Calligraphy Box */}
            <div className="my-auto px-1 py-2">
              <h4 className="text-sm font-bold text-amber-100 line-clamp-3 leading-snug drop-shadow-sm">
                {book.title}
              </h4>
            </div>

            {/* Author at Bottom */}
            <div className="pb-2">
              {book.sheikhName && (
                <p className="text-[11px] text-emerald-200/70 font-medium line-clamp-1">
                  {book.sheikhName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Badges Over Cover */}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          {isQuran && (
            <Badge className="bg-amber-600/90 hover:bg-amber-600 text-white text-[10px] backdrop-blur-md shadow-md border-0">
              مصحف
            </Badge>
          )}
          {isPureText && (
            <Badge className="bg-emerald-600/90 hover:bg-emerald-600 text-white text-[10px] backdrop-blur-md shadow-md border-0 gap-1">
              <Sparkles className="size-2.5" />
              نص حي
            </Badge>
          )}
          {book.language && book.language !== 'ar' && (
            <Badge variant="secondary" className="text-[10px] uppercase backdrop-blur-md">
              {book.language}
            </Badge>
          )}
        </div>

        {/* Floating Quick Action Overlay */}
        <div
          className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            variant="default"
            onClick={handleRead}
            className="w-full gap-2 shadow-lg backdrop-blur-md font-bold"
          >
            <BookOpen className="size-4" />
            قراءة الكتاب
          </Button>
        </div>
      </div>

      {/* Book Metadata Footer */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-card">
        <div>
          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed mb-1">
            {book.title}
          </h3>

          {book.sheikhName && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {book.sheikhName}
            </p>
          )}

          {((book as unknown as Record<string, unknown>).matchReason as string) && (
            <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20 line-clamp-1">
              <span>{((book as unknown as Record<string, unknown>).matchReason as string)}</span>
            </div>
          )}

          {book.description && !(book as unknown as Record<string, unknown>).matchReason && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3">
              {book.description}
            </p>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div
          className="flex items-center justify-between pt-3 border-t border-border/50 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRead}
            className="h-8 px-2.5 text-primary hover:text-primary font-medium gap-1.5"
          >
            <BookOpen className="size-3.5" />
            فتح القارئ
          </Button>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleFavorite(book.id)}
              className={cn('size-7 text-muted-foreground hover:text-red-500', isFavorite && 'text-red-500 fill-red-500')}
              aria-label="المفضلة"
            >
              <Heart className={cn('size-3.5', isFavorite && 'fill-current')} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleShare}
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="مشاركة"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Share2 className="size-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDownload}
              disabled={downloading}
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="تنزيل"
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
