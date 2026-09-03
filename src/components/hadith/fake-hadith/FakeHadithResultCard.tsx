'use client';

import { CheckCircle2, AlertTriangle, HelpCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AuthenticityCheckResult } from '@/lib/fake-hadith-engine';
import type { HadithBookMeta } from '@/lib/hadith-data';
import type { HadithItem, HadithChapter } from '@/lib/hadith-engine';

interface FakeHadithResultCardProps {
  result: AuthenticityCheckResult;
  onOpenDetail?: (
    hadith: HadithItem,
    book: HadithBookMeta,
    chapter?: HadithChapter,
    initialTab?: 'matn' | 'isnad' | 'translations' | 'sharh' | 'hints'
  ) => void;
}

export function FakeHadithResultCard({
  result,
  onOpenDetail,
}: FakeHadithResultCardProps) {
  const primaryAuthentic = result.authenticMatches?.[0];

  if (result.status === 'authentic') {
    return (
      <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-foreground">
              الحديث ثابت ومخرّج في دواوين السنة المعتمدة
            </h4>
            <p className="text-xs text-muted-foreground">
              تم العثور على {result.authenticMatches.length} موضع مسند في دواوين السنة
            </p>
          </div>
        </div>

        {primaryAuthentic && (
          <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[10px] font-bold">
                {primaryAuthentic.book.nameAr} • رقم {primaryAuthentic.hadith.idInBook}
              </Badge>
              {onOpenDetail && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onOpenDetail(
                      primaryAuthentic.hadith,
                      primaryAuthentic.book,
                      primaryAuthentic.chapter,
                      'matn'
                    )
                  }
                  className="gap-1 text-xs text-primary h-7"
                >
                  <BookOpen className="size-3.5" />
                  <span>عرض التخريج والشرح</span>
                </Button>
              )}
            </div>
            <p className="text-sm font-serif leading-loose text-foreground select-text">
              « {primaryAuthentic.hadith.arabic} »
            </p>
          </div>
        )}
      </div>
    );
  }

  if (result.status === 'fake') {
    return (
      <div className="p-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 grid place-items-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-rose-700 dark:text-rose-400">
              تنبيه: هذا الحديث لا يصح ولا يثبت عن رسول الله ﷺ
            </h4>
            <p className="text-xs text-muted-foreground">
              مدرج في مصنفات الأحاديث الضعيفة والموضوعة والمشتهرة على الألسنة
            </p>
          </div>
        </div>

        {result.matchedFake && (
          <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="destructive" className="text-[10px] font-bold">
                {result.matchedFake.degree}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                المصدر: {result.matchedFake.source}
              </span>
            </div>
            <p className="text-sm font-serif leading-relaxed text-foreground select-text">
              « {result.matchedFake.fakeText} »
            </p>
            <div className="text-xs text-muted-foreground border-t border-border/40 pt-2">
              <strong>حكم أئمة الحديث:</strong> {result.matchedFake.scholarRuling}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl border border-border bg-muted/20 space-y-2 text-center animate-in fade-in duration-200">
      <HelpCircle className="size-8 mx-auto text-muted-foreground/60" />
      <h4 className="font-bold text-sm text-foreground">لم نجد حكماً مباشراً على هذا النص بعينه</h4>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">
        يمكنكم البحث بكلمات المتن المفتاحية في دواوين السنة النبوية الـ 17 للتحقق من ألفاظه ومروياته.
      </p>
    </div>
  );
}
