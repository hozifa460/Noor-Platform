'use client';

import {
  Youtube,
  FileText,
  Headphones,
  Radio,
  Video,
  Heart,
  Share2,
  Download,
  Loader2,
  FileQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MediaItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MediaPlayerFooterProps {
  item: MediaItem;
  kind: string | null;
  isFav: boolean;
  onToggleFav: () => void;
  onDownload: () => void;
  downloading: boolean;
  onShare: () => void;
  sessionPosition?: number;
}

export function MediaPlayerFooter({
  item,
  kind,
  isFav,
  onToggleFav,
  onDownload,
  downloading,
  onShare,
  sessionPosition,
}: MediaPlayerFooterProps) {
  return (
    <div className="border-t border-border p-4 shrink-0 bg-background">
      {/* Media Type Badges and Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {kind === 'youtube' && (
          <Badge variant="secondary" className="gap-1">
            <Youtube className="size-3" /> يوتيوب
          </Badge>
        )}
        {kind === 'audio' && (
          <Badge variant="secondary" className="gap-1">
            <Headphones className="size-3" /> صوت
          </Badge>
        )}
        {kind === 'live' && (
          <Badge variant="destructive" className="gap-1">
            <Radio className="size-3" /> مباشر
          </Badge>
        )}
        {kind === 'video' && (
          <Badge variant="secondary" className="gap-1">
            <Video className="size-3" /> فيديو
          </Badge>
        )}
        {kind === 'pdf' && (
          <Badge variant="secondary" className="gap-1">
            <FileText className="size-3" /> PDF
          </Badge>
        )}
        {kind === 'fatwa' && (
          <Badge variant="secondary" className="gap-1">
            <FileQuestion className="size-3" /> فتوى
          </Badge>
        )}
        {item.tags?.slice(0, 4).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
          {item.description}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={isFav ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleFav}
          className="gap-2"
        >
          <Heart className={cn('size-4', isFav && 'fill-current')} />
          {isFav ? 'في المفضلة' : 'أضف للمفضلة'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={downloading}
          className="gap-2"
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {downloading ? 'جاري التنزيل...' : 'تنزيل'}
        </Button>
        <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
          <Share2 className="size-4" />
          مشاركة
        </Button>
        {sessionPosition && sessionPosition > 5 && (
          <Badge variant="secondary" className="text-[10px] mr-auto">
            استئناف من {Math.floor(sessionPosition / 60)}:
            {String(Math.floor(sessionPosition % 60)).padStart(2, '0')}
          </Badge>
        )}
      </div>
    </div>
  );
}
