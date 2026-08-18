'use client';

import { useState, useMemo } from 'react';
import { Radio, Search, Sparkles, Volume2, Globe, BookOpen, User, Play, Flame, Check } from 'lucide-react';
import { useLibraryStore } from '@/stores/library.store';
import { usePlayerStore } from '@/stores/player.store';
import { MediaCardSkeleton } from '@/components/media/MediaCardSkeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/lib/types';

type RadioCategory = 'all' | 'national' | 'reciters' | 'hadith' | 'translations';

interface CategoryTab {
  id: RadioCategory;
  label: string;
  emoji: string;
  icon: typeof Radio;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'all', label: 'كافة الإذاعات', emoji: '🌟', icon: Radio },
  { id: 'national', label: 'الإذاعات الكبرى والعامة', emoji: '📻', icon: Radio },
  { id: 'reciters', label: 'إذاعات كبار القراء', emoji: '🎙️', icon: User },
  { id: 'hadith', label: 'الحديث والسنة والتفاسير', emoji: '📚', icon: BookOpen },
  { id: 'translations', label: 'ترجمات معاني القرآن', emoji: '🌍', icon: Globe },
];

/** Helper to generate consistent, distinct geometric gradient and initials for a sheikh */
function getSheikhBadgeInfo(name: string) {
  const clean = name
    .replace(/^(إذاعة|الشيخ|القارئ|الدكتور|فضيلة الشيخ)\s+/gi, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? `${words[0].charAt(0)} ${words[1].charAt(0)}`
    : clean.slice(0, 2);

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash + clean.charCodeAt(i)) | 0;
  }
  const gradients = [
    'from-emerald-900 via-emerald-800 to-teal-950 text-emerald-200 border-emerald-500/30',
    'from-amber-950 via-amber-900 to-yellow-950 text-amber-200 border-amber-500/30',
    'from-blue-950 via-indigo-900 to-slate-950 text-blue-200 border-blue-500/30',
    'from-stone-900 via-stone-800 to-neutral-950 text-stone-200 border-stone-500/30',
    'from-rose-950 via-red-900 to-stone-950 text-rose-200 border-rose-500/30',
    'from-cyan-950 via-teal-900 to-emerald-950 text-cyan-200 border-cyan-500/30',
  ];
  const gradientClass = gradients[Math.abs(hash) % gradients.length];

  return { initials, gradientClass, displayName: clean };
}

function IslamicRadioCard({ radio }: { radio: MediaItem }) {
  const openPlayer = usePlayerStore((s) => s.open);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const isPlaying = currentItem?.id === radio.id;

  const { initials, gradientClass, displayName } = useMemo(
    () => getSheikhBadgeInfo(radio.title),
    [radio.title]
  );

  return (
    <div
      onClick={() => openPlayer(radio)}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer text-right bg-card hover:shadow-xl hover:-translate-y-1',
        isPlaying
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
          : 'border-border hover:border-emerald-500/50'
      )}
    >
      {/* ─── Top Visual Area ────────────────────────────────────────── */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted flex items-center justify-center">
        {radio.imageUrl ? (
          <img
            src={radio.imageUrl}
            alt={radio.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Tailored Geometric Calligraphic Medallion */
          <div
            className={cn(
              'absolute inset-0 size-full bg-gradient-to-br flex flex-col items-center justify-center p-4',
              gradientClass
            )}
          >
            {/* 8-pointed star subtle motif */}
            <div className="relative size-16 sm:size-20 rounded-full border border-white/20 bg-white/10 backdrop-blur-md grid place-items-center shadow-inner">
              <span className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wider select-none">
                {initials}
              </span>
            </div>
            <span className="text-[11px] font-semibold mt-2 opacity-90 truncate max-w-[90%] font-serif">
              {displayName}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Live Pulse Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[10px] font-bold shadow-sm backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-white animate-ping" />
          <span>مباشر</span>
        </div>

        {/* Playing indicator or hover play button */}
        <div className="absolute inset-0 grid place-items-center">
          {isPlaying ? (
            <div className="size-12 rounded-full bg-emerald-500 text-white grid place-items-center shadow-xl animate-pulse">
              <Volume2 className="size-6" />
            </div>
          ) : (
            <div className="size-11 rounded-full bg-white/90 text-stone-900 grid place-items-center shadow-lg opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
              <Play className="size-5 fill-current mr-0.5" />
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Meta Info ───────────────────────────────────────── */}
      <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {radio.title}
          </h3>
          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
            {radio.sheikhName || radio.subtitle || 'بث مباشر متواصل 24 ساعة'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Radio className="size-3 text-emerald-500" />
            <span>إذاعة صوتية</span>
          </span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
            {isPlaying ? 'جاري الاستماع...' : 'انقر للتشغيل'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RadioHubView() {
  const items = useLibraryStore((s) => s.items);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const openPlayer = usePlayerStore((s) => s.open);
  const currentItem = usePlayerStore((s) => s.currentItem);

  const [selectedCategory, setSelectedCategory] = useState<RadioCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all radio items
  const allRadioItems = useMemo(() => {
    return items.filter((i) => i.section === 'radio' || i.videoSource === 'radio');
  }, [items]);

  // Categorize items
  const categorized = useMemo(() => {
    const national: MediaItem[] = [];
    const reciters: MediaItem[] = [];
    const hadith: MediaItem[] = [];
    const translations: MediaItem[] = [];

    for (const item of allRadioItems) {
      const title = item.title.toLowerCase();

      if (title.includes('ترجمة') || title.includes('translation') || title.includes('بلغة')) {
        translations.push(item);
      } else if (
        title.includes('البخاري') ||
        title.includes('مسلم') ||
        title.includes('رياض الصالحين') ||
        title.includes('تفسير') ||
        title.includes('السعدي') ||
        title.includes('السيرة') ||
        title.includes('الشمائل') ||
        title.includes('الفتاوى')
      ) {
        hadith.push(item);
      } else if (
        title.includes('السعودية') ||
        title.includes('الشارقة') ||
        title.includes('الكويت') ||
        title.includes('القاهرة') ||
        title.includes('دار السلام') ||
        title.includes('الأنصار') ||
        title.includes('السراج') ||
        title.includes('التراتيل') ||
        title.includes('تلاوات متنوعة') ||
        title.includes('سورة البقرة') ||
        title.includes('سورة الملك') ||
        title.includes('الرقية') ||
        title.includes('أذكار') ||
        title.includes('قصص الأنبياء')
      ) {
        national.push(item);
      } else {
        reciters.push(item);
      }
    }

    return { national, reciters, hadith, translations };
  }, [allRadioItems]);

  // Filtered by Tab & Search
  const filteredRadios = useMemo(() => {
    let pool: MediaItem[] = [];

    if (selectedCategory === 'all') pool = allRadioItems;
    else if (selectedCategory === 'national') pool = categorized.national;
    else if (selectedCategory === 'reciters') pool = categorized.reciters;
    else if (selectedCategory === 'hadith') pool = categorized.hadith;
    else if (selectedCategory === 'translations') pool = categorized.translations;

    if (!searchQuery.trim()) return pool;

    const q = searchQuery.trim().toLowerCase();
    return pool.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.sheikhName && r.sheikhName.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [allRadioItems, categorized, selectedCategory, searchQuery]);

  const isLoading = allRadioItems.length === 0 && (syncing || !lastSync);

  // Featured Radios for Top Ribbon
  const featuredRadios = useMemo(() => {
    const priorityNames = [
      'إذاعة القرآن الكريم — السعودية',
      'إذاعة القرآن الكريم — الشارقة',
      'إذاعة القرآن الكريم — الكويت',
      'إذاعة دار السلام',
      'إذاعة الشيخ عبدالباسط عبدالصمد',
      'إذاعة الشيخ محمد صديق المنشاوي',
      'إذاعة الشيخ محمود خليل الحصري',
      'إذاعة الشيخ مشاري العفاسي',
      'إذاعة صحيح البخاري',
    ];
    return allRadioItems
      .filter((r) => priorityNames.some((p) => r.title.includes(p)))
      .slice(0, 8);
  }, [allRadioItems]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* ─── Hero Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 border border-emerald-500/20 p-6 sm:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>بث مباشر 24 ساعة متواصلة</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif flex items-center gap-3">
              <span>📻</span>
              <span>الإذاعات الإسلامية الكبرى</span>
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/80 leading-relaxed font-sans">
              بث مباشر متواصل لأعذب التلاوات القرآنية بأصوات كبار قراء العالم الإسلامي، مع إذاعات الحديث النبوي الشريف والتفاسير الميسرة وترجمات معاني القرآن.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-4 rounded-2xl border border-emerald-500/20 shrink-0">
            <div className="size-12 rounded-xl bg-emerald-500/20 grid place-items-center text-emerald-400">
              <Flame className="size-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-emerald-200/70 font-semibold">الإذاعات النشطة المؤكدة</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-300">
                {allRadioItems.length || 156} إذاعة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Featured Stations Horizontal Ribbon ────────────────────── */}
      {featuredRadios.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">الإذاعات المختارة الأكثر استماعاً</h2>
            </div>
            <span className="text-xs text-muted-foreground">بث مباشر فوري</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {featuredRadios.map((radio) => {
              const isPlaying = currentItem?.id === radio.id;
              const { initials, gradientClass } = getSheikhBadgeInfo(radio.title);

              return (
                <button
                  key={radio.id}
                  onClick={() => openPlayer(radio)}
                  className={cn(
                    'snap-start shrink-0 flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 text-right w-64 sm:w-72 bg-card hover:bg-muted/80',
                    isPlaying
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                      : 'border-border hover:border-emerald-500/40 shadow-sm'
                  )}
                >
                  <div className="relative size-12 rounded-xl overflow-hidden shrink-0 bg-muted border border-border">
                    {radio.imageUrl ? (
                      <img src={radio.imageUrl} alt={radio.title} className="size-full object-cover" />
                    ) : (
                      <div className={cn('size-full bg-gradient-to-br grid place-items-center text-xs font-bold font-serif', gradientClass)}>
                        {initials}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 grid place-items-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="size-4 text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{radio.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {radio.sheikhName || radio.subtitle || 'بث مباشر 24 ساعة'}
                    </p>
                  </div>
                  {isPlaying ? (
                    <Volume2 className="size-4 text-emerald-500 animate-pulse shrink-0" />
                  ) : (
                    <Play className="size-3.5 text-muted-foreground shrink-0 opacity-60" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Search & Category Filter Navigation ────────────────────── */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative max-w-xl">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن إذاعة أو اسم الشيخ أو الدولة أو الموضوع..."
            className="pr-10 rounded-2xl bg-card border-border h-12 text-sm shadow-sm focus-visible:ring-emerald-500"
          />
          <Search className="size-4 absolute right-3.5 top-4 text-muted-foreground" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-4 text-xs text-muted-foreground hover:text-foreground"
            >
              مسح
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const count =
              tab.id === 'all'
                ? allRadioItems.length
                : tab.id === 'national'
                ? categorized.national.length
                : tab.id === 'reciters'
                ? categorized.reciters.length
                : tab.id === 'hadith'
                ? categorized.hadith.length
                : categorized.translations.length;

            const isSelected = selectedCategory === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border',
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-card text-muted-foreground border-border hover:border-emerald-500/40 hover:text-foreground'
                )}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Radios Grid ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground">
            عرض {filteredRadios.length} إذاعة
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredRadios.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border space-y-3">
            <Radio className="size-12 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-bold text-foreground">لم يتم العثور على إذاعات مطابقة</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              جرب البحث باسم قارئ آخر أو اختر قسماً مختلفاً من الفئات بالأعلى.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredRadios.map((radio) => (
              <IslamicRadioCard key={radio.id} radio={radio} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
