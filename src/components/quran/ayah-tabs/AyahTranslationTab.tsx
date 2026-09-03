'use client';

import { QURAN_TRANSLATIONS, type QuranTranslationMeta } from '@/lib/quran/data';

interface AyahTranslationTabProps {
  selectedTranslation: QuranTranslationMeta;
  onSelectTranslation: (t: QuranTranslationMeta) => void;
  loadingTranslation: boolean;
  translationText: string;
  translationFootnotes?: string;
}

export function AyahTranslationTab({
  selectedTranslation,
  onSelectTranslation,
  loadingTranslation,
  translationText,
  translationFootnotes,
}: AyahTranslationTabProps) {
  return (
    <div className="p-5 flex-1 overflow-y-auto space-y-4">
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border">
        <span className="text-xs font-bold text-muted-foreground">اختر لغة الترجمة:</span>
        <select
          value={selectedTranslation.code}
          onChange={(e) => {
            const t = QURAN_TRANSLATIONS.find((x) => x.code === e.target.value);
            if (t) onSelectTranslation(t);
          }}
          className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {QURAN_TRANSLATIONS.map((t) => (
            <option key={t.code} value={t.code}>
              🌍 {t.name}
            </option>
          ))}
        </select>
      </div>

      {loadingTranslation ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
          جاري جلب الترجمة المعتمدة...
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3">
          <p
            className="text-foreground text-sm sm:text-base leading-relaxed select-text"
            dir={selectedTranslation.direction}
          >
            {translationText}
          </p>

          {translationFootnotes && (
            <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground leading-normal italic">
              <strong>Footnotes:</strong> {translationFootnotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
