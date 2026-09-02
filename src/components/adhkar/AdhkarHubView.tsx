'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Play,
  Pause,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  loadAdhkarCatalog,
  getDhikrAudioUrl,
  searchAdhkar,
  QUICK_ADHKAR_TABS,
  type AdhkarCategory,
  type DhikrItem,
} from '@/lib/quran-adhkar-engine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AdhkarHubView() {
  const [catalog, setCatalog] = useState<AdhkarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('morning_evening');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');

  // Interactive Counter state: maps dhikr.id -> remaining count
  const [counterMap, setCounterMap] = useState<Record<number, number>>({});
  const [completedDhikrs, setCompletedDhikrs] = useState<Set<number>>(new Set());

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load catalog on mount
  useEffect(() => {
    let mounted = true;
    loadAdhkarCatalog()
      .then((data) => {
        if (mounted) {
          setCatalog(data);
          setLoading(false);
          const initialCounts: Record<number, number> = {};
          for (const cat of data) {
            for (const item of cat.array) {
              initialCounts[item.id] = item.count;
            }
          }
          setCounterMap(initialCounts);
        }
      })
      .catch((err) => {
        console.warn('Failed to load Adhkar:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Filtered results
  const filteredGroups = useMemo(() => {
    if (!catalog || catalog.length === 0) return [];
    return searchAdhkar(catalog, searchQuery, selectedTab, selectedCategoryId);
  }, [catalog, searchQuery, selectedTab, selectedCategoryId]);

  // Handle counter decrement
  const handleDecrement = (item: DhikrItem) => {
    const current = counterMap[item.id] ?? item.count;
    if (current <= 0) return;

    const next = current - 1;
    setCounterMap((prev) => ({ ...prev, [item.id]: next }));

    // Haptic feedback on mobile if supported
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        /* ignore */
      }
    }

    if (next === 0) {
      setCompletedDhikrs((prev) => new Set(prev).add(item.id));
      toast.success('تقبل الله طاعتكم وذكركم! تم إتمام هذا الذكر المبارك.');
    }
  };

  // Reset counter for an item
  const handleResetCounter = (item: DhikrItem) => {
    setCounterMap((prev) => ({ ...prev, [item.id]: item.count }));
    setCompletedDhikrs((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  };

  // Handle audio play/pause
  const handleToggleAudio = (item: DhikrItem) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingAudioId === item.id) {
      audio.pause();
      setPlayingAudioId(null);
      return;
    }

    const audioUrl = getDhikrAudioUrl(item.filename || item.audio);
    if (!audioUrl) {
      toast.error('التسجيل الصوتي غير متوفر لهذا الذكر.');
      return;
    }

    audio.src = audioUrl;
    audio.play().catch((err) => {
      console.warn('Audio playback error:', err);
      toast.error('تعذر تشغيل الصوت، يرجى التحقق من الاتصال.');
    });
    setPlayingAudioId(item.id);
  };

  // Copy Dhikr text
  const handleCopy = (item: DhikrItem) => {
    navigator.clipboard.writeText(item.text).then(() => {
      setCopiedId(item.id);
      toast.success('تم نسخ الذكر إلى الحافظة بنجاح.');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden Audio Element for Zero-Overhead Playback */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudioId(null)}
        onError={() => setPlayingAudioId(null)}
        className="hidden"
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/20 p-6 sm:p-8 backdrop-blur-sm">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>حصن المسلم وأذكار اليوم والليلة</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-amiri">
            الأذكار والأدعية النبوية الصوتية
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            تصفح واستمع لأكثر من 132 باباً من أذكار حصن المسلم النبوية الصحيحة والمشكولة بالكامل، مع سبحة إلكترونية تفاعلية وتسجيلات صوتية نقية لكل ذكر.
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur">
              📖 132 باباً وتصنيفاً
            </Badge>
            <Badge variant="secondary" className="bg-background/80 backdrop-blur">
              📿 سبحة تفاعلية لكل ذكر
            </Badge>
            <Badge variant="secondary" className="bg-background/80 backdrop-blur">
              🎙️ 398 تلاوة وتسجيلاً صوتياً
            </Badge>
            {completedDhikrs.size > 0 && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                ✅ أتممت {completedDhikrs.size} {completedDhikrs.size === 1 ? 'ذكراً' : 'أذكار'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في نصوص الأذكار أو أسماء الأبواب (مثل أذكار الصباح، الكرسي، النوم)..."
              className="pr-10 h-11 bg-background/60 border-border/80 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Quick Category Picker Dropdown */}
          <div className="relative w-full sm:w-64">
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategoryId(val === 'all' ? 'all' : Number(val));
              }}
              className="w-full h-11 px-3 py-2 text-sm bg-background border border-border/80 rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="all">📂 اختر من الـ 132 باباً...</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}. {c.category} ({c.array.length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
          </div>
        </div>

        {/* Quick Navigation Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_ADHKAR_TABS.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedTab(tab.id);
                  setSelectedCategoryId('all');
                }}
                className={cn(
                  'h-9 px-3.5 text-xs sm:text-sm whitespace-nowrap rounded-full transition-all',
                  isActive
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Content Groups */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="inline-block size-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">جاري تحميل مكتبة الأذكار...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-dashed border-border p-8 space-y-3">
          <BookOpen className="size-10 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-semibold">لا توجد أذكار مطابقة</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً من القائمة أعلاه.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredGroups.map(({ category, items }) => (
            <div key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {category.id}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold font-amiri text-foreground">
                    {category.category}
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? 'ذكر' : 'أذكار'}
                </span>
              </div>

              {/* Dhikr Cards Grid */}
              <div className="grid grid-cols-1 gap-4">
                {items.map((item, idx) => {
                  const remaining = counterMap[item.id] ?? item.count;
                  const isDone = remaining === 0;
                  const isAudioPlaying = playingAudioId === item.id;

                  return (
                    <div
                      key={item.id || idx}
                      className={cn(
                        'relative rounded-xl border p-5 sm:p-6 transition-all duration-200 bg-card',
                        isDone
                          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-sm'
                          : 'border-border/80 hover:border-border hover:shadow-sm'
                      )}
                    >
                      {/* Top Action Bar */}
                      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/40 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">الذكر #{idx + 1}</span>
                          {isDone && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="size-3.5" />
                              <span>اكتمل بحمد الله</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Audio Player Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAudio(item)}
                            className={cn(
                              'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
                              isAudioPlaying
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            title={isAudioPlaying ? 'إيقاف الصوت' : 'استمع لهذا الذكر بصوت نقي'}
                          >
                            {isAudioPlaying ? (
                              <>
                                <Pause className="size-3.5" />
                                <span className="hidden sm:inline">إيقاف</span>
                              </>
                            ) : (
                              <>
                                <Play className="size-3.5" />
                                <span className="hidden sm:inline">استمع</span>
                              </>
                            )}
                          </Button>

                          {/* Copy Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(item)}
                            className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-lg"
                            title="نسخ نص الذكر"
                          >
                            {copiedId === item.id ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Dhikr Arabic Text */}
                      <p className="text-lg sm:text-xl md:text-2xl font-amiri leading-loose sm:leading-[2.3] text-foreground text-justify tracking-wide py-2">
                        {item.text}
                      </p>

                      {/* Interactive Counter Footer */}
                      <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          عدد المرات المقررة: <span className="font-bold text-foreground">{item.count}</span>
                        </div>

                        {/* Interactive Tasbeeh Counter Button */}
                        <div className="flex items-center gap-2">
                          {item.count > 1 && remaining < item.count && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetCounter(item)}
                              className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-lg text-xs"
                              title="إعادة ضبط العداد"
                            >
                              <RotateCcw className="size-3.5 ml-1" />
                              <span>إعادة</span>
                            </Button>
                          )}

                          <button
                            onClick={() => handleDecrement(item)}
                            disabled={isDone}
                            className={cn(
                              'inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm transition-all select-none shadow-sm active:scale-95',
                              isDone
                                ? 'bg-emerald-600 text-white cursor-default opacity-90'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                            )}
                          >
                            {isDone ? (
                              <>
                                <Check className="size-4" />
                                <span>تم ({item.count}/{item.count})</span>
                              </>
                            ) : (
                              <>
                                <span>سبّح واضغط</span>
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-black/20 text-xs font-mono font-bold">
                                  {remaining}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
