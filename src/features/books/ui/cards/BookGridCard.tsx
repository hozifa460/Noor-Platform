'use client';

import { BookOpen, Download, Heart, Share2, Sparkles, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BookGridCardProps {
  book: MediaItem;
  isQuran: boolean;
  isPureText: boolean;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onRead: () => void;
  onDownload: (e: React.MouseEvent) => void;
  downloading: boolean;
  onShare: (e: React.MouseEvent) => void;
  copied: boolean;
}

export function BookGridCard({
  book,
  isQuran,
  isPureText,
  isFavorite,
  onToggleFavorite,
  onRead,
  onDownload,
  downloading,
  onShare,
  copied,
}: BookGridCardProps) {
  return (
    <div
      onClick={onRead}
      className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-3xl bg-card border border-border/80 hover:border-primary/50 transition-all duration-300 shadow-xs hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      <div>
        {/* Cover / Spine Graphic */}
        <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-950 border border-amber-500/20 shadow-inner grid place-items-center mb-4">
          {book.imageUrl ? (
            <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4">
              <BookOpen
                className={cn('size-10 mx-auto mb-2', isQuran ? 'text-amber-400' : 'text-emerald-300')}
              />
              <span className="text-xs font-bold text-amber-200/90 leading-tight block line-clamp-1">
                {isQuran ? 'مصحف كريم' : 'كتاب إسلامي'}
              </span>
            </div>
          )}

          {/* Quick Action Overlay on cover */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              onClick={onToggleFavorite}
              className="size-7 rounded-lg bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 text-white"
              title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
            >
              <Heart className={cn('size-3.5', isFavorite && 'fill-rose-500 text-rose-500')} />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={onShare}
              className="size-7 rounded-lg bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 text-white"
              title="مشاركة الرابط"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
            </Button>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {isQuran && (
            <Badge variant="default" className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] gap-1">
              <Sparkles className="size-3" />
              مصحف
            </Badge>
          )}
          {isPureText && (
            <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
              <Sparkles className="size-3 text-emerald-500" />
              نص حي
            </Badge>
          )}
          {book.language && book.language !== 'ar' && (
            <Badge variant="outline" className="text-[10px] uppercase gap-1">
              <Globe className="size-2.5" />
              {book.language}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5 leading-snug">
          {book.title}
        </h3>

        {/* Author / Sheikh */}
        {book.sheikhName && (
          <p className="text-xs text-muted-foreground font-medium line-clamp-1 mb-2">
            {book.sheikhName}
          </p>
        )}

        {/* Description snippet */}
        {book.description && (
          <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed mb-3">
            {book.description}
          </p>
        )}
      </div>

      {/* Bottom Action row */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <Button
          size="sm"
          onClick={onRead}
          className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9"
        >
          <BookOpen className="size-3.5" />
          <span>قراءة فورية</span>
        </Button>

        <Button
          size="icon"
          variant="outline"
          onClick={onDownload}
          disabled={downloading}
          className="size-9 rounded-xl shrink-0"
          title="تنزيل الكتاب"
        >
          <Download className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
