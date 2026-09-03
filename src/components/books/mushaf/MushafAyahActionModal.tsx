'use client';

import { Play, Pause, Copy, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_TAFSIRS } from '@/lib/quran/tafsir-engine';
import type { AyahItem } from '@/types/quran';

interface MushafAyahActionModalProps {
  ayah: AyahItem | null;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: (ayahNo: number) => void;
  onCopy: (ayah: AyahItem) => void;
  selectedTafsirId: number;
  onSelectTafsir: (id: number) => void;
  tafsirLoading: boolean;
  tafsirText: string;
}

export function MushafAyahActionModal({
  ayah,
  onClose,
  isPlaying,
  onTogglePlay,
  onCopy,
  selectedTafsirId,
  onSelectTafsir,
  tafsirLoading,
  tafsirText,
}: MushafAyahActionModalProps) {
  if (!ayah) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-xl bg-primary/10 grid place-items-center text-primary font-bold text-xs">
              {ayah.ayahNo}
            </span>
            <div>
              <h3 className="font-bold text-base text-foreground">بيان الآية الكريمة وتفسيرها</h3>
              <p className="text-xs text-muted-foreground">التفاسير المعتمدة وأحكام التلاوة</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {/* Ayah preview box */}
        <div className="p-5 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent border-b border-border text-center">
          <p className="font-serif font-bold text-xl sm:text-2xl text-foreground leading-loose">
            ﴿ {ayah.textAr} ﴾
            <span className="inline-flex items-center justify-center size-7 mx-2 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold align-middle">
              {ayah.ayahNo}
            </span>
          </p>
        </div>

        {/* Tafsir picker */}
        <div className="p-3 border-b border-border/80 flex flex-wrap items-center justify-between gap-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span className="text-xs font-bold text-muted-foreground">اختر التفسير:</span>
            <select
              value={selectedTafsirId}
              onChange={(e) => onSelectTafsir(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SUPPORTED_TAFSIRS.map((t) => (
                <option key={t.id} value={t.id}>
                  📖 {t.name}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {SUPPORTED_TAFSIRS.find((t) => t.id === selectedTafsirId)?.author}
          </span>
        </div>

        {/* Tafsir body */}
        <div className="flex-1 overflow-y-auto p-5 text-foreground leading-relaxed text-sm sm:text-base">
          {tafsirLoading ? (
            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span>جاري جلب التفسير المعتمد...</span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 select-text">
              {tafsirText}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onTogglePlay(ayah.ayahNo)}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              <span>{isPlaying ? 'إيقاف التلاوة' : 'استماع للآية'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopy(ayah)}
              className="gap-2 rounded-xl text-xs font-bold"
            >
              <Copy className="size-4" />
              <span>نسخ الآية والتفسير</span>
            </Button>
          </div>

          <Button size="sm" variant="ghost" onClick={onClose} className="rounded-xl text-xs">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
