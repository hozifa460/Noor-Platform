'use client';

import { ArrowRight, Users, Verified, FileText, Headphones, PlayCircle, Radio, BookOpen, FileQuestion, ChevronDown, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MediaCard } from '@/components/media/MediaCard';
import { useLibraryStore } from '@/stores/library.store';
import { useNavStore } from '@/stores/nav.store';
import { loadArchiveFile } from '@/hooks/use-library';
import type { MediaItem, SectionKind } from '@/lib/types';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const SECTION_META: { key: SectionKind; label: string; icon: typeof PlayCircle }[] = [
  { key: 'videos', label: 'الفيديوهات', icon: PlayCircle },
  { key: 'main', label: 'المجموعة الرئيسية', icon: Verified },
  { key: 'shorts', label: 'شورتس', icon: PlayCircle },
  { key: 'live', label: 'البث المباشر', icon: Radio },
  { key: 'radio', label: 'الإذاعات', icon: Radio },
  { key: 'fatwa', label: 'الفتاوى', icon: FileQuestion },
  { key: 'books', label: 'الكتب', icon: BookOpen },
  { key: 'articles', label: 'المقالات', icon: FileText },
];

/** Groups items by their `groupTitle` field, preserving insertion order. */
function groupItems(items: MediaItem[]): { title: string; items: MediaItem[] }[] {
  const map = new Map<string, MediaItem[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = item.groupTitle || 'عناصر متفرقة';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }
  return order.map((title) => ({ title, items: map.get(title)! }));
}

interface SheikhProfileProps {
  sheikhId: string;
}

/**
 * Lazy "Load older videos" button. Fetches an archive file on click and
 * appends its items to the library. Shows a loading spinner while fetching
 * and disappears once all archives for this section are loaded.
 */
function ArchiveLoader({ archives, sheikhId }: { archives: string[]; sheikhId: string }) {
  const loadedArchives = useLibraryStore((s) => s.loadedArchives);
  const [loading, setLoading] = useState(false);

  const unloaded = archives.filter((a) => !loadedArchives.has(a));
  if (unloaded.length === 0) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      // Load all unloaded archives for this section in parallel.
      const results = await Promise.all(unloaded.map((f) => loadArchiveFile(f)));
      const total = results.reduce((sum, r) => sum + r.length, 0);
      if (total > 0) {
        toast.success(`تم تحميل ${total} عنصر إضافي من الأرشيف`);
      } else {
        toast.error('لم يتم العثور على عناصر في الأرشيف');
      }
    } catch {
      toast.error('تعذر تحميل الأرشيف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-3 py-6 border-t border-border">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">
          يوجد محتوى أقدم متاح في الأرشيف
        </p>
        <p className="text-xs text-muted-foreground/70">
          {unloaded.length} ملف أرشيف ·اضغط للتحميل الكسول
        </p>
      </div>
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Archive className="size-4" />
        )}
        {loading ? 'جاري تحميل الأرشيف...' : 'تحميل الفيديوهات الأقدم'}
      </Button>
    </div>
  );
}

export function SheikhProfile({ sheikhId }: SheikhProfileProps) {
  const getSheikh = useLibraryStore((s) => s.getSheikh);
  const archiveFiles = useLibraryStore((s) => s.archiveFiles);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const goHome = useNavStore((s) => s.goHome);
  const sheikh = getSheikh(sheikhId);
  const archiveFilesForSheikh = archiveFiles.filter((f) => f.startsWith(`${sheikhId}/`));

  const availableSections = useMemo(() => {
    if (!sheikh) return [];
    return SECTION_META.filter((s) => (sheikh.sections[s.key]?.length || 0) > 0);
  }, [sheikh]);

  // Pre-compute grouped items per section.
  const groupedBySection = useMemo(() => {
    const out: Record<string, { title: string; items: MediaItem[] }[]> = {};
    if (!sheikh) return out;
    for (const sec of availableSections) {
      const items = sheikh.sections[sec.key] || [];
      const groups = groupItems(items);
      out[sec.key] = groups;
    }
    return out;
  }, [sheikh, availableSections]);

  if (!sheikh) {
    // If data is still loading, show a loading state instead of "not found".
    if (syncing || !lastSync) {
      return (
        <div className="space-y-6">
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جاري تحميل بيانات الشيخ...
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">لم يتم العثور على الشيخ</p>
        <Button variant="outline" className="mt-4" onClick={goHome}>العودة للرئيسية</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={goHome}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowRight className="size-4" />
        العودة للرئيسية
      </button>

      {/* Profile header */}
      <header
        className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8 islamic-pattern"
        style={sheikh.gradientColors && sheikh.gradientColors.length >= 2
          ? { backgroundImage: `linear-gradient(135deg, ${sheikh.gradientColors[0]}22, ${sheikh.gradientColors[1]}22), radial-gradient(circle at 80% 20%, ${sheikh.gradientColors[0]}11, transparent 50%)` }
          : { backgroundImage: 'linear-gradient(135deg, oklch(0.7 0.16 162 / 0.12), oklch(0.82 0.14 84 / 0.08))' }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div
            className="size-28 sm:size-32 rounded-2xl overflow-hidden grid place-items-center ring-2 ring-primary/20 shadow-xl shrink-0 relative"
            style={sheikh.gradientColors && sheikh.gradientColors.length >= 2
              ? { backgroundImage: `linear-gradient(135deg, ${sheikh.gradientColors[0]}, ${sheikh.gradientColors[1]})` }
              : { backgroundImage: 'linear-gradient(135deg, oklch(0.7 0.16 162), oklch(0.82 0.14 84))' }}
          >
            {/* Real avatar image from /api/sheikh-avatar endpoint */}
            { }
            <img
              src={`/api/sheikh-avatar?id=${encodeURIComponent(sheikh.id)}&name=${encodeURIComponent(sheikh.name)}`}
              alt={sheikh.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.retried) {
                  img.dataset.retried = '1';
                  img.src = `/api/sheikh-avatar?id=${encodeURIComponent(sheikh.id)}&name=${encodeURIComponent(sheikh.name)}&retry=1`;
                }
              }}
            />
          </div>

          <div className="flex-1 text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">{sheikh.name}</h1>
              {sheikh.isMainCollection && (
                <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
                  <Verified className="size-3" />
                  مجموعة رئيسية
                </Badge>
              )}
            </div>

            {sheikh.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
                {sheikh.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              <Badge variant="secondary">{sheikh.totalItems} عنصر</Badge>
              <Badge variant="outline">{availableSections.length} أقسام</Badge>
              <Badge variant="outline">{sheikh.sourceFiles.length} ملف مصدر</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Section tabs with grouped content */}
      {availableSections.length > 0 ? (
        <Tabs defaultValue={availableSections[0].key} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {availableSections.map((s) => {
              const Icon = s.icon;
              const count = sheikh.sections[s.key]?.length || 0;
              const groupCount = groupedBySection[s.key]?.length || 0;
              return (
                <TabsTrigger
                  key={s.key}
                  value={s.key}
                  className="flex items-center gap-1.5 data-[state=active]:bg-background"
                >
                  <Icon className="size-3.5" />
                  {s.label}
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{count}</Badge>
                  {groupCount > 1 && (
                    <span className="text-[10px] text-muted-foreground">({groupCount} مجموعات)</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {availableSections.map((s) => {
            const groups = groupedBySection[s.key] || [];
            const isShort = s.key === 'shorts';
            // Find archive files for this sheikh that match this section kind.
            // Archive file naming: [sheikhId]/[sheikhId].[kind].archive.json
            const sectionArchives = archiveFilesForSheikh.filter((f) => {
              const name = f.split('/').pop() || '';
              return name.includes(`.${s.key}.archive.json`) ||
                (s.key === 'main' && name.includes('.archive.json') && !name.match(/\.(videos|shorts|live|radio|fatwa|books|articles)\.archive\.json$/));
            });
            return (
              <TabsContent key={s.key} value={s.key} className="mt-6">
                {groups.length === 1 ? (
                  // Single group: render flat grid (no accordion needed)
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-lg font-bold">{groups[0].title}</h3>
                      <Badge variant="outline">{groups[0].items.length}</Badge>
                    </div>
                    <div className={isShort
                      ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                    }>
                      {groups[0].items.map((item) => (
                        <MediaCard key={item.id} item={item} variant={isShort ? 'short' : 'default'} />
                      ))}
                    </div>
                  </div>
                ) : (
                  // Multiple groups: render as collapsible accordion
                  <Accordion type="multiple" defaultValue={[groups[0]?.title]} className="w-full">
                    {groups.map((group, idx) => (
                      <AccordionItem key={group.title + idx} value={group.title} className="border-border">
                        <AccordionTrigger className="hover:no-underline py-4 px-2 rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1 text-right">
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                            <span className="font-bold text-base">{group.title}</span>
                            <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-2">
                          <div className={isShort
                            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                            : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                          }>
                            {group.items.map((item) => (
                              <MediaCard key={item.id} item={item} variant={isShort ? 'short' : 'default'} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}

                {/* Lazy "Load older videos" button — shows when archive files
                    exist for this section and haven't been loaded yet. */}
                {sectionArchives.length > 0 && (
                  <ArchiveLoader archives={sectionArchives} sheikhId={sheikh.id} />
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          لا يوجد محتوى متاح لهذا الشيخ حاليًا
        </div>
      )}
    </div>
  );
}
