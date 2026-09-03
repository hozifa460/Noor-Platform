'use client';

import { SheikhSectionContent } from './SheikhSectionContent';
import type { GroupedMediaSection } from '@/hooks/use-sheikh-profile';

interface SheikhVideoTabProps {
  groups: GroupedMediaSection[];
  sectionArchives?: string[];
  sheikhId?: string;
  isShort?: boolean;
}

export function SheikhVideoTab({
  groups,
  sectionArchives,
  sheikhId,
  isShort = false,
}: SheikhVideoTabProps) {
  return (
    <SheikhSectionContent
      groups={groups}
      isShort={isShort}
      sectionArchives={sectionArchives}
      sheikhId={sheikhId}
      archiveLabel={isShort ? 'المقاطع القصيرة' : 'مقاطع الفيديو'}
      emptyMessage={
        isShort
          ? 'لا توجد مقاطع قصيرة متاحة لهذا الشيخ حالياً'
          : 'لا توجد مرئيات متاحة لهذا الشيخ حالياً'
      }
    />
  );
}
