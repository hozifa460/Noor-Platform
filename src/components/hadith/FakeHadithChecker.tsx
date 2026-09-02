import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  loadFakeHadiths,
  searchFakeHadiths,
  checkHadithAuthenticity,
  FAKE_HADITH_CATEGORIES,
  type FakeHadithItem,
  type FakeHadithCategory,
  type AuthenticityCheckResult,
} from '@/lib/fake-hadith-engine';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useHadithStore } from '@/stores/hadith-store';

export function FakeHadithChecker() {
  const [catalog, setCatalog] = useState<FakeHadithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FakeHadithCategory>('all');
  const [checkResult, setCheckResult] = useState<AuthenticityCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const openHadithDetail = useHadithStore((s) => s.openHadithDetail);

  useEffect(() => {
    loadFakeHadiths().then((data) => {
      setCatalog(data);
      setLoading(false);
    });
  }, []);

  // Filtered catalog list
  const filteredList = useMemo(() => {
    return searchFakeHadiths(catalog, query, selectedCategory);
  }, [catalog, query, selectedCategory]);

  // Handle live check
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

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    toast.success('تم نسخ رسالة التحذير لتنبيه الآخرين');
    setTimeout(() => setCopiedId(null), 2000);
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
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-6 sm:p-8 md:p-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
            <AlertTriangle className="size-3.5" />
            <span>موسوعة كشف الأحاديث المنتشرة التي لا تصح</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            تحقق من صحة الحديث قبل نشره
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            تنتشر في وسائل التواصل ورسائل الواتساب مئات الأحاديث المكذوبة والضعيفة. اكتب أي جملة أو شطر حديث للتأكد فوراً من ثبوته، والاطلاع على أحكام كبار أئمة الحديث والبديل الصحيح.
          </p>

          {/* Search & Check Box */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (!e.target.value.trim()) setCheckResult(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                  placeholder="اكتب الحديث أو شطراً منه (مثال: صوموا تصحوا، رجب شهر الله)..."
                  className="pr-10 h-12 rounded-2xl bg-background/90 text-sm shadow-inner"
                />
              </div>
              <Button
                onClick={() => handleCheck()}
                disabled={checking || !query.trim()}
                className="h-12 px-6 rounded-2xl font-bold gap-2 shrink-0 bg-primary hover:bg-primary/90 shadow-md"
              >
                {checking ? <RefreshCw className="size-4 animate-spin" /> : <Search className="size-4" />}
                <span>فحص الحديث</span>
              </Button>
            </div>

            {/* Popular search pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <span className="font-medium text-[11px]">أشهر ما يسأل عنه الناس:</span>
              {POPULAR_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    handleCheck(q);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-background/80 hover:bg-primary/10 hover:text-primary border border-border/60 transition-colors text-[11px] font-semibold"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Direct Live Check Result (If checked) */}
      {checkResult && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          {checkResult.status === 'fake' && checkResult.matchedFake && (
            <div className="rounded-3xl border-2 border-red-500/30 bg-red-500/5 p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-red-500/20 text-red-600 dark:text-red-400 grid place-items-center shrink-0">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5 rounded-lg">
                      {checkResult.matchedFake.degree}
                    </Badge>
                    <h3 className="font-extrabold text-base sm:text-lg text-foreground mt-1">
                      {checkResult.matchedFake.title}
                    </h3>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyWarning(checkResult.matchedFake!)}
                  className="rounded-xl gap-1.5 text-xs font-bold border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/10"
                >
                  {copiedId === checkResult.matchedFake.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>نسخ رسالة التحذير</span>
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-background/80 border border-border/80 space-y-2">
                <span className="text-xs font-bold text-muted-foreground block">النص المنتشر:</span>
                <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                  « {checkResult.matchedFake.fakeText} »
                </p>
              </div>

              <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <strong className="text-foreground font-bold">حكم أئمة الحديث: </strong>
                  {checkResult.matchedFake.scholarRuling}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  <strong>المصدر: </strong> {checkResult.matchedFake.source}
                </p>
              </div>

              {checkResult.matchedFake.authenticAlternative && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="size-4" />
                    <span>البديل الصحيح الثابت عن النبي ﷺ:</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                    {checkResult.matchedFake.authenticAlternative}
                  </p>
                </div>
              )}
            </div>
          )}

          {checkResult.status === 'authentic' && (
            <div className="rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 grid place-items-center shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <Badge className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                    حديث ثابت ومسند
                  </Badge>
                  <h3 className="font-extrabold text-base sm:text-lg text-foreground mt-1">
                    تم العثور على هذا الحديث في دواوين السنة النبوية الصحيحة
                  </h3>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {checkResult.authenticMatches.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => openHadithDetail(m.hadith, m.book, m.chapter)}
                    className="p-3.5 rounded-2xl bg-background/80 border border-border hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-primary">{m.book.nameAr}</span>
                        <span className="text-[11px] text-muted-foreground">رقم {m.hadith.idInBook}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground line-clamp-2 leading-relaxed">
                        « {m.hadith.arabic} »
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 gap-1 rounded-xl text-xs font-bold">
                      <BookOpen className="size-3.5" />
                      <span>عرض</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checkResult.status === 'unverified' && (
            <div className="rounded-3xl border border-border bg-card p-6 flex items-start gap-3.5 shadow-sm">
              <div className="size-10 rounded-2xl bg-muted grid place-items-center text-muted-foreground shrink-0">
                <HelpCircle className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">لم يتم العثور على تطابق تام</h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  النص المُدخل لم يتطابق مع الأحاديث المكذوبة الأكثر شهرة في هذه الموسوعة، ولم يظهر كحديث مباشر بنصه في كتب السنة. نوصي بالتثبت والبحث بكلمات أخرى أو الرجوع للموسوعات الحديثية المعتمدة.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Category Tabs Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <span>فهرس الأحاديث المنتشرة حسب الأبواب ({filteredList.length})</span>
          </h3>
          <span className="text-xs text-muted-foreground">
            {loading ? 'جاري التحميل...' : 'بيانات موثقة من أئمة الجرح والتعديل'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {FAKE_HADITH_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border',
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/80 hover:bg-muted/40 hover:text-foreground'
              )}
            >
              {cat.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Grid of Circulated Non-Authentic Hadiths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {filteredList.map((item) => (
          <div
            key={item.id}
            className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card hover:border-amber-500/40 hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              {/* Header: Title & Badge */}
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-extrabold text-sm sm:text-base text-foreground leading-snug">
                  {item.title}
                </h4>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] font-bold py-0.5 px-2 rounded-lg border shrink-0',
                    item.degree.includes('موضوع') || item.degree.includes('باطل')
                      ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  )}
                >
                  {item.degree}
                </Badge>
              </div>

              {/* Fake Text */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 text-xs sm:text-sm font-semibold text-foreground/90 leading-relaxed">
                « {item.fakeText} »
              </div>

              {/* Ruling */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">الحكم: </strong>
                {item.scholarRuling}
              </p>

              {/* Authentic Alternative */}
              {item.authenticAlternative && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground/90 leading-relaxed">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1 flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    <span>البديل الصحيح:</span>
                  </span>
                  {item.authenticAlternative}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="text-[11px] truncate">{item.source}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyWarning(item)}
                className="h-8 rounded-xl text-xs font-bold gap-1 text-primary hover:bg-primary/10 shrink-0"
              >
                {copiedId === item.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span>نسخ التحذير</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
