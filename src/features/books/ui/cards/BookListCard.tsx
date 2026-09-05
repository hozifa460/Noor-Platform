'use client';

import { BookOpen, Download, Heart, Share2, Sparkles, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BookListCardProps {
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

export function BookListCard({
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
}: BookListCardProps) {
  return (
    <div
      onClick={onRead}
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-card/60 hover:bg-card border border-border/80 hover:border-primary/40 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer"
    >
      {/* Thumbnail Spine */}
      <div className="relative w-16 h-22 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-950 border border-amber-500/20 shadow-inner grid place-items-center">
        {book.imageUrl ? (
          <img src={book.imageUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center p-1">
            <BookOpen
              className={cn('size-6 mx-auto mb-1', isQuran ? 'text-amber-400' : 'text-emerald-300')}
            />
            <span className="text-[8px] font-bold text-amber-200/80 leading-tight line-clamp-1">
              {isQuran ? 'مصحف' : 'كتاب'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            <span className="text-xs text-muted-foreground font-medium truncate">
              {book.sheikhName}
            </span>
          )}
        </div>

        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
          {book.title}
        </h3>

        {book.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
            {book.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleFavorite}
          className="size-8 rounded-xl"
          title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        >
          <Heart className={cn('size-4', isFavorite && 'fill-rose-500 text-rose-500')} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onShare}
          className="size-8 rounded-xl"
          title="مشاركة الرابط"
        >
          {copied ? <Check className="size-4 text-emerald-500" /> : <Share2 className="size-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDownload}
          disabled={downloading}
          className="size-8 rounded-xl"
          title="تنزيل الكتاب"
        >
          <Download className="size-4" />
        </Button>
        <Button size="sm" onClick={onRead} className="h-8 rounded-xl text-xs gap-1 font-bold">
          <span>قراءة</span>
        </Button>
      </div>
    </div>
  );
}
