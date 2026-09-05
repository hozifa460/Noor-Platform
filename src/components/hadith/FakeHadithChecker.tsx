'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { useIdClipboard } from '@/hooks/use-clipboard';
import {
  loadFakeHadiths,
  searchFakeHadiths,
  checkHadithAuthenticity,
  FAKE_HADITH_CATEGORIES,
  type FakeHadithItem,
  type FakeHadithCategory,
  type AuthenticityCheckResult,
} from '@/lib/hadith';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FakeHadithResultCard } from './fake-hadith/FakeHadithResultCard';
import { FakeHadithCard } from './fake-hadith/FakeHadithCard';
import { useHadithStore } from '@/stores/hadith-store';
import { cn } from '@/lib/utils';

export function FakeHadithChecker() {
  const [catalog, setCatalog] = useState<FakeHadithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FakeHadithCategory>('all');
  const [checkResult, setCheckResult] = useState<AuthenticityCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const { copiedId, copy: copyWarning } = useIdClipboard<number>();

  const openHadithDetail = useHadithStore((s) => s.openHadithDetail);

  useEffect(() => {
    loadFakeHadiths().then((data) => {
      setCatalog(data);
      setLoading(false);
    });
  }, []);

  const filteredList = useMemo(() => {
    return searchFakeHadiths(catalog, query, selectedCategory);
  }, [catalog, query, selectedCategory]);

  const handleCheck = async (textToCheck?: string) => {
    const q = (textToCheck !== undefined ? textToCheck : query).trim();
    if (!q || q.length < 2) {
      setCheckResult(null);
      return;
    }

    setChecking(true);
    try {
      const res = await checkHadithAuthenticity(q);
      setCheckResult(res);
    } finally {
      setChecking(false);
    }
  };

  const handleCopyWarning = (item: FakeHadithItem) => {
    const text = `⚠️ تنبيه وتحقق من حديث منتشر:\n\n❌ الحديث المنتشر: «${item.fakeText}»\n\nدرجته وحكم العلماء: ${item.degree} - ${item.scholarRuling}\nالمصدر: ${item.source}${
      item.authenticAlternative ? `\n\n✅ البديل الصحيح الثابت:\n«${item.authenticAlternative}»` : ''
    }\n\nالمصدر: منصة نور - موسوعة الحديث النبوي الشريف`;

    copyWarning(item.id, text, 'تم نسخ رسالة التحذير لتنبيه الآخرين');
  };


  const POPULAR_QUERIES = [
    'صوموا تصحوا',
    'الجنة تحت أقدام الأمهات',
    'رجب شهر الله',
    'اختلاف أمتي رحمة',
    'اطلبوا العلم ولو بالصين',
    'حب الوطن من الإيمان',
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-6 sm:p-8 md:p-10 shadow-xs">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
            <AlertTriangle className="size-3.5" />
            <span>موسوعة كشف الأحاديث المنتشرة التي لا تصح</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            تحقق من صحة الحديث قبل نشره
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            محرك ذكي للتحقق الفوري من صحة الأحاديث الشائعة على منصات التواصل، مأخوذ من أحكام كبار أئمة الحديث (ابن الجوزي، السيوطي، الألباني، الشوكاني وغيرهم).
          </p>
        </div>
      </div>

      {/* Live Check Input */}
      <div className="p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground">
            الصق أو اكتب نص الحديث للتحقق من صحته:
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value.trim()) setCheckResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCheck();
                }}
                placeholder="مثال: صوموا تصحوا، أو اطلبوا العلم ولو بالصين..."
                className="pr-10 h-12 rounded-2xl text-sm"
              />
            </div>
            <Button
              onClick={() => handleCheck()}
              disabled={checking}
              className="h-12 px-6 rounded-2xl font-bold gap-2 text-xs sm:text-sm shrink-0"
            >
              {checking ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>جاري الفحص...</span>
                </>
              ) : (
                <span>فحص الحديث</span>
              )}
            </Button>
          </div>
        </div>

        {/* Popular check quick pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-muted-foreground font-semibold">أحاديث شائعة للفحص:</span>
          {POPULAR_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                handleCheck(q);
              }}
              className="px-2.5 py-1 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Live Result Alert Card */}
        {checkResult && (
          <FakeHadithResultCard result={checkResult} onOpenDetail={openHadithDetail} />
        )}
      </div>

      {/* Catalog browser section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-base sm:text-lg text-foreground">
            دليل الأحاديث المكذوبة والضعيفة الشائعة ({filteredList.length})
          </h3>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {FAKE_HADITH_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id as FakeHadithCategory)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                  selectedCategory === c.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {c.nameAr}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
            جاري تحميل موسوعة كاشف الأحاديث...
          </div>
        ) : filteredList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((item) => (
              <FakeHadithCard
                key={item.id}
                item={item}
                onCopy={handleCopyWarning}
                isCopied={copiedId === item.id}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground bg-muted/20 rounded-3xl border border-border">
            لم نعثر على أحاديث مطابقة في هذا القسم.
          </div>
        )}
      </div>
    </div>
  );
}
