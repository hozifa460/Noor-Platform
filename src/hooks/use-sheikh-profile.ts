'use client';

import { useMemo } from 'react';
import {
  PlayCircle,
  Verified,
  Radio,
  FileQuestion,
  BookOpen,
  FileText,
} from 'lucide-react';
import { useLibraryStore } from '@/stores/library-store';
import { useNavStore } from '@/stores/nav-store';
import type { MediaItem, SectionKind } from '@/lib/types';

export const SECTION_META: { key: SectionKind; label: string; icon: typeof PlayCircle }[] = [
  { key: 'videos', label: 'الفيديوهات', icon: PlayCircle },
  { key: 'main', label: 'المجموعة الرئيسية', icon: Verified },
  { key: 'shorts', label: 'شورتس', icon: PlayCircle },
  { key: 'live', label: 'البث المباشر', icon: Radio },
  { key: 'radio', label: 'الإذاعات', icon: Radio },
  { key: 'fatwa', label: 'الفتاوى', icon: FileQuestion },
  { key: 'books', label: 'الكتب', icon: BookOpen },
  { key: 'articles', label: 'المقالات', icon: FileText },
];

export interface GroupedMediaSection {
  title: string;
  items: MediaItem[];
}

/** Groups items by their `groupTitle` field, preserving insertion order. */
export function groupItems(items: MediaItem[]): GroupedMediaSection[] {
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

export function useSheikhProfile(sheikhId: string) {
  const getSheikh = useLibraryStore((s) => s.getSheikh);
  const archiveFiles = useLibraryStore((s) => s.archiveFiles);
  const syncing = useLibraryStore((s) => s.syncing);
  const lastSync = useLibraryStore((s) => s.lastSync);
  const goHome = useNavStore((s) => s.goHome);

  const sheikh = getSheikh(sheikhId);
  const archiveFilesForSheikh = useMemo(
    () => archiveFiles.filter((f) => f.startsWith(`${sheikhId}/`)),
    [archiveFiles, sheikhId]
  );

  const availableSections = useMemo(() => {
    if (!sheikh) return [];
    return SECTION_META.filter((s) => (sheikh.sections[s.key]?.length || 0) > 0);
  }, [sheikh]);

  // Pre-compute grouped items per section
  const groupedBySection = useMemo(() => {
    const out: Record<string, GroupedMediaSection[]> = {};
    if (!sheikh) return out;
    for (const sec of availableSections) {
      const items = sheikh.sections[sec.key] || [];
      out[sec.key] = groupItems(items);
    }
    return out;
  }, [sheikh, availableSections]);

  const isLoading = !sheikh && (syncing || !lastSync);
  const notFound = !sheikh && !isLoading;

  const getSectionArchives = (sectionKey: SectionKind) => {
    return archiveFilesForSheikh.filter((f) => {
      const name = f.split('/').pop() || '';
      return (
        name.includes(`.${sectionKey}.archive.json`) ||
        (sectionKey === 'main' &&
          name.includes('.archive.json') &&
          !name.match(/\.(videos|shorts|live|radio|fatwa|books|articles)\.archive\.json$/))
      );
    });
  };

  return {
    sheikh,
    availableSections,
    groupedBySection,
    archiveFilesForSheikh,
    getSectionArchives,
    isLoading,
    notFound,
    goHome,
  };
}
