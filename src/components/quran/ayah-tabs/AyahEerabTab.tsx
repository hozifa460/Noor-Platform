'use client';

import { SUPPORTED_EERAB_BOOKS } from '@/lib/quran-eerab-engine';
import { sanitizeTafsirHtml } from '@/lib/sanitize-html';

interface AyahEerabTabProps {
  selectedEerabBookId: string;
  onSelectEerabBook: (id: string) => void;
  loadingEerab: boolean;
  eerabContent: string;
}

export function AyahEerabTab({
  selectedEerabBookId,
  onSelectEerabBook,
  loadingEerab,
  eerabContent,
}: AyahEerabTabProps) {
  const currentBook = SUPPORTED_EERAB_BOOKS.find((b) => b.id === selectedEerabBookId);

  return (
    <div className="p-5 flex-1 overflow-y-auto space-y-4">
      {/* Eerab Book Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">كتاب الإعراب:</span>
          <select
            value={selectedEerabBookId}
            onChange={(e) => onSelectEerabBook(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SUPPORTED_EERAB_BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                📜 {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-muted-foreground font-semibold">
          {currentBook?.author}
        </div>
      </div>

      {/* Book Description Alert */}
      {currentBook?.description && (
        <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl p-3 px-4">
          💡 {currentBook.description}
        </div>
      )}

      {/* Eerab Body */}
      {loadingEerab ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
          جاري تحميل إعراب الآية الشريفة وبيانها...
        </div>
      ) : (
        <div
          className="p-5 rounded-2xl bg-card border border-border/80 text-foreground text-sm sm:text-base leading-loose select-text"
          dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(eerabContent) }}
        />
      )}
    </div>
  );
}
