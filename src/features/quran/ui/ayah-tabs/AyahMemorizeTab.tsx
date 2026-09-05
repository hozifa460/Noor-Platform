'use client';

import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReciterMeta } from '@/types/quran';

interface AyahMemorizeTabProps {
  availableAyahReciters: ReciterMeta[];
  selectedAyahReciter: ReciterMeta;
  onSelectAyahReciter: (r: ReciterMeta) => void;
  repeatLimit: number;
  onSetRepeatLimit: (n: number) => void;
  repeatCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
}

export function AyahMemorizeTab({
  availableAyahReciters,
  selectedAyahReciter,
  onSelectAyahReciter,
  repeatLimit,
  onSetRepeatLimit,
  repeatCount,
  isPlaying,
  onTogglePlay,
  onReset,
}: AyahMemorizeTabProps) {
  return (
    <div className="p-5 flex-1 overflow-y-auto space-y-6 text-center">
      <div className="max-w-md mx-auto space-y-4">
        {/* Reciter Picker */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
          <span className="text-xs font-bold text-muted-foreground">صوت القارئ المعلم:</span>
          <select
            value={selectedAyahReciter.id}
            onChange={(e) => {
              const r = availableAyahReciters.find((x) => x.id === e.target.value);
              if (r) onSelectAyahReciter(r);
            }}
            className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {availableAyahReciters.map((r) => (
              <option key={r.id} value={r.id}>
                🎙️ {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Repetition target selector */}
        <div className="flex items-center justify-center gap-2">
          {[3, 5, 7, 10].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={repeatLimit === n ? 'default' : 'outline'}
              onClick={() => onSetRepeatLimit(n)}
              className="rounded-xl px-4 text-xs font-bold"
            >
              {n} مرات
            </Button>
          ))}
        </div>

        {/* Counter status badge */}
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
          <div className="text-xs text-primary font-bold">مرات التكرار المنجزة</div>
          <div className="text-3xl font-mono font-extrabold text-primary">
            {repeatCount} / {repeatLimit}
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={onTogglePlay}
            className="gap-2 rounded-2xl px-6 font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPlaying ? (
              <>
                <Pause className="size-5" />
                <span>إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="size-5" />
                <span>بدء حلقة التحفيظ والتكرار</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
            className="size-11 rounded-2xl"
            title="إعادة ضبط العداد"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
