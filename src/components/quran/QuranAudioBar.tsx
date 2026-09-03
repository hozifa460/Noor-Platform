'use client';

import {
  Play,
  Pause,
  FastForward,
  Rewind,
  ChevronRight,
  ChevronLeft,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAudioTime } from '@/lib/audio-utils';

interface QuranAudioBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextAyah: () => void;
  onPrevAyah?: () => void;
  onFastForward: () => void;
  onRewind: () => void;
  currentTime: number;
  duration: number;
  onSeek: (val: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  currentAyahNo: number | null;
  totalAyahs: number;
  surahName: string;
  reciterName: string;
  onOpenReciterModal: () => void;
  isPlayingFullSurah: boolean;
  onToggleFullSurah: () => void;
}

export function QuranAudioBar({
  isPlaying,
  onTogglePlay,
  onNextAyah,
  onPrevAyah,
  onFastForward,
  onRewind,
  currentTime,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
  currentAyahNo,
  totalAyahs,
  surahName,
  reciterName,
  onOpenReciterModal,
  isPlayingFullSurah,
  onToggleFullSurah,
}: QuranAudioBarProps) {
  return (
    <div className="sticky bottom-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3 sm:p-4 shadow-xl">
      <div className="max-w-5xl mx-auto space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <span>{formatAudioTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onMouseDown={onSeekStart}
            onTouchStart={onSeekStart}
            onChange={(e) => onSeek(Number(e.target.value))}
            onMouseUp={onSeekEnd}
            onTouchEnd={onSeekEnd}
            className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span>{formatAudioTime(duration)}</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Info */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenReciterModal}
              className="h-8 rounded-xl text-xs gap-1.5 border-border/80 truncate max-w-[180px] sm:max-w-[240px]"
            >
              <Headphones className="size-3.5 text-primary shrink-0" />
              <span className="truncate">{reciterName}</span>
            </Button>

            <div className="text-xs text-muted-foreground truncate hidden sm:inline">
              سورة {surahName} {currentAyahNo ? `· آية ${currentAyahNo}/${totalAyahs}` : ''}
            </div>
          </div>

          {/* Main playback buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {onPrevAyah && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={onPrevAyah}
                title="الآية السابقة"
              >
                <ChevronRight className="size-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={onRewind}
              title="ترجيع 10 ثوان"
            >
              <Rewind className="size-4" />
            </Button>

            <Button
              size="icon"
              className="size-10 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-all"
              onClick={onTogglePlay}
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
            >
              {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={onFastForward}
              title="تقديم 10 ثوان"
            >
              <FastForward className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full"
              onClick={onNextAyah}
              title="الآية التالية"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>

          {/* Mode Switcher: Full Surah vs Ayah-by-Ayah */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={isPlayingFullSurah ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs rounded-xl"
              onClick={onToggleFullSurah}
            >
              {isPlayingFullSurah ? 'سماع السورة كاملة 🎧' : 'تلاوة آية بآية'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
