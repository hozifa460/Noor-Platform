'use client';

import { SUPPORTED_TAFSIRS } from '@/lib/quran-tafsir-engine';
import { sanitizeTafsirHtml } from '@/lib/sanitize-html';

interface AyahTafsirTabProps {
  selectedTafsirId: number;
  onSelectTafsir: (id: number) => void;
  loadingTafsir: boolean;
  tafsirContent: string;
}

export function AyahTafsirTab({
  selectedTafsirId,
  onSelectTafsir,
  loadingTafsir,
  tafsirContent,
}: AyahTafsirTabProps) {
  return (
    <div className="p-5 flex-1 overflow-y-auto space-y-4">
      {/* Tafsir Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
        <div className="flex items-center gap-2">
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

        <div className="text-[11px] text-muted-foreground">
          {SUPPORTED_TAFSIRS.find((t) => t.id === selectedTafsirId)?.author}
        </div>
      </div>

      {/* Tafsir Body */}
      {loadingTafsir ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
          جاري تحميل التفسير المعتمد...
        </div>
      ) : (
        <div
          className="p-5 rounded-2xl bg-card border border-border/80 text-foreground text-sm sm:text-base leading-loose select-text"
          dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(tafsirContent) }}
        />
      )}
    </div>
  );
}
