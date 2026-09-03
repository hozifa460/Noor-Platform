'use client';

import { Sparkles, BookOpen, Loader2 } from 'lucide-react';
import type { HadeethEncSharhItem } from '@/types/hadith';

interface HadithSharhTabProps {
  sharh: HadeethEncSharhItem | null;
  loadingSharh: boolean;
}

export function HadithSharhTab({ sharh, loadingSharh }: HadithSharhTabProps) {
  if (loadingSharh) {
    return (
      <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-sm font-semibold">جاري جلب الشرح المعتمد والبيان النبوي...</span>
      </div>
    );
  }

  if (!sharh) {
    return (
      <div className="py-16 text-center text-muted-foreground space-y-2 bg-muted/20 rounded-3xl border border-border/60 p-6">
        <BookOpen className="size-8 mx-auto text-muted-foreground/60" />
        <h4 className="font-bold text-foreground">لا يتوفر شرح تفصيلي مباشر في هذه النسخة</h4>
        <p className="text-xs max-w-md mx-auto">
          تم استيراد متن الحديث بإسناده المعتمد، ويمكنكم مراجعة شروح أئمة الحديث (كفتح الباري وشرح صحيح مسلم) في مكتبة الكتب الرقمية.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <Sparkles className="size-4" />
          <span>الشرح والبيان النبوي</span>
        </div>

        <div
          className="text-foreground text-sm sm:text-base leading-loose select-text"
          dangerouslySetInnerHTML={{ __html: sharh.explanation }}
        />

        {sharh.attribution && (
          <div className="pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <strong>المصدر والعزو:</strong> {sharh.attribution}
          </div>
        )}
      </div>
    </div>
  );
}
