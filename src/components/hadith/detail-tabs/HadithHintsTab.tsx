'use client';

import { Sparkles, BookOpen } from 'lucide-react';
import type { HadeethEncSharhItem } from '@/types/hadith';

interface HadithHintsTabProps {
  sharh: HadeethEncSharhItem | null;
  loadingSharh: boolean;
}

export function HadithHintsTab({ sharh, loadingSharh }: HadithHintsTabProps) {
  if (loadingSharh) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm font-semibold animate-pulse">
        جاري جلب الفوائد والاستنباطات...
      </div>
    );
  }

  const hints = sharh?.hints || [];

  if (hints.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground space-y-2 bg-muted/20 rounded-3xl border border-border/60 p-6">
        <BookOpen className="size-8 mx-auto text-muted-foreground/60" />
        <h4 className="font-bold text-foreground">لا تتوفر فوائد مستنبطة مدرجة لهذا الحديث</h4>
        <p className="text-xs max-w-md mx-auto">
          يمكنكم الاطلاع على الشرح العام للحديث من تبويب «الشرح والبيان».
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-2 text-xs font-bold text-primary">
        <Sparkles className="size-4" />
        <span>الفوائد والاستنباطات الفقهية والتربوية ({hints.length} فائدة مستنبطة)</span>
      </div>

      <div className="space-y-3">
        {hints.map((hint, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs text-right"
          >
            <span className="size-6 sm:size-7 rounded-lg bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <p className="text-sm sm:text-base text-foreground leading-relaxed select-text flex-1">
              {hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
