'use client';

import { Copy, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FakeHadithItem } from '@/lib/hadith';

interface FakeHadithCardProps {
  item: FakeHadithItem;
  onCopy: (item: FakeHadithItem) => void;
  isCopied: boolean;
}

export function FakeHadithCard({
  item,
  onCopy,
  isCopied,
}: FakeHadithCardProps) {
  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card hover:border-rose-500/40 transition-all space-y-4 shadow-xs">
      {/* Top badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge
            variant="destructive"
            className="text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
          >
            {item.degree}
          </Badge>
          <span className="text-xs text-muted-foreground">{item.source}</span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onCopy(item)}
          className="rounded-xl text-xs gap-1.5 h-8 font-semibold"
          title="نسخ رسالة التحذير لتنبيه الآخرين"
        >
          {isCopied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          <span>{isCopied ? 'تم النسخ' : 'نسخ تنبيه'}</span>
        </Button>
      </div>

      {/* Fake text */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <AlertTriangle className="size-3" />
          <span>الحديث المنتشر (غير ثابت):</span>
        </span>
        <p className="font-serif text-base sm:text-lg font-bold text-foreground select-text leading-relaxed">
          « {item.fakeText} »
        </p>
      </div>

      {/* Ruling */}
      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground leading-relaxed space-y-1">
        <strong className="text-foreground block">بيان العلماء وحكمهم:</strong>
        <p>{item.scholarRuling}</p>
      </div>

      {/* Authentic alternative if available */}
      {item.authenticAlternative && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs leading-relaxed space-y-1">
          <strong className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="size-3.5" />
            <span>البديل الصحيح الثابت في الباب:</span>
          </strong>
          <p className="font-serif text-sm font-semibold text-foreground">
            « {item.authenticAlternative} »
          </p>
        </div>
      )}
    </div>
  );
}
