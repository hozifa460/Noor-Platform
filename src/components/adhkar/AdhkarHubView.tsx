'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import {
  loadAdhkarCatalog,
  getDhikrAudioUrl,
  searchAdhkar,
  type AdhkarCategory,
  type DhikrItem,
} from '@/lib/quran-adhkar-engine';
import { useDhikrCounter } from '@/hooks/use-dhikr-counter';
import { AdhkarHeroBanner } from './AdhkarHeroBanner';
import { AdhkarFilterBar } from './AdhkarFilterBar';
import { DhikrCard } from './DhikrCard';
import { useIdClipboard } from '@/hooks/use-clipboard';
import { toast } from 'sonner';

export function AdhkarHubView() {
  const [catalog, setCatalog] = useState<AdhkarCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('morning_evening');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');

  // Audio Playback state
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const { copiedId, copy: copyDhikr } = useIdClipboard<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);


  // Use custom hook for interactive counting & haptics
  const {
    counterMap,
    completedDhikrs,
    initializeCounters,
    handleDecrement,
    resetCounter,
  } = useDhikrCounter(catalog);

  // Load catalog on mount
  useEffect(() => {
    let mounted = true;
    loadAdhkarCatalog()
      .then((data) => {
        if (mounted) {
          setCatalog(data);
          setLoading(false);
          initializeCounters(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load Adhkar:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [initializeCounters]);

  // Filtered results
  const filteredGroups = useMemo(() => {
    if (!catalog || catalog.length === 0) return [];
    return searchAdhkar(catalog, searchQuery, selectedTab, selectedCategoryId);
  }, [catalog, searchQuery, selectedTab, selectedCategoryId]);

  // Total count of dhikrs across catalog
  const totalDhikrsCount = useMemo(() => {
    return catalog.reduce((acc, cat) => acc + (cat.array ? cat.array.length : 0), 0);
  }, [catalog]);

  // Handle Audio toggle
  const handleToggleAudio = (item: DhikrItem) => {
    if (playingAudioId === item.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!item.audio) return;

    const streamUrl = getDhikrAudioUrl(item.audio);
    const audio = new Audio(streamUrl);
    audioRef.current = audio;
    setPlayingAudioId(item.id);

    audio.play().catch((err) => {
      console.warn('Audio play failed:', err);
      setPlayingAudioId(null);
      toast.error('تعذر تشغيل التسجيل الصوتي');
    });

    audio.onended = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };
  };

  // Copy dhikr text
  const handleCopy = (item: DhikrItem) => {
    const text = `« ${item.text} »\n\n[التكرار: ${item.count} مرات]\nالمصدر: حصن المسلم - منصة نور`;
    copyDhikr(item.id, text, 'تم نسخ نص الذكر بنجاح');
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Hero Banner */}
      <AdhkarHeroBanner totalDhikrs={totalDhikrsCount} />

      {/* Filter and Quick Tabs Bar */}
      <AdhkarFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        categories={catalog}
      />

      {/* Content Groups */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground animate-pulse">
          جاري تحميل وتجهيز حصن المسلم والأذكار المأثورة...
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <section key={group.category.id} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/70 pb-3">
                <BookOpen className="size-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {group.category.category}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({group.items.length} أذكار)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map((item) => (
                  <DhikrCard
                    key={item.id}
                    item={item}
                    remainingCount={counterMap[item.id] ?? item.count}
                    isCompleted={completedDhikrs.has(item.id)}
                    onDecrement={handleDecrement}
                    onReset={resetCounter}
                    isPlaying={playingAudioId === item.id}
                    onToggleAudio={handleToggleAudio}
                    isCopied={copiedId === item.id}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
          <BookOpen className="size-10 mx-auto text-muted-foreground/40" />
          <h4 className="font-bold text-base text-foreground">لم نعثر على أذكار مطابقة</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            جرب البحث بكلمة أخرى أو اختيار أحد الأقسام السريعة أعلاه.
          </p>
        </div>
      )}
    </div>
  );
}
