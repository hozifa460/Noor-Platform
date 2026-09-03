'use client';

import { SheikhSectionContent } from './SheikhSectionContent';
import type { GroupedMediaSection } from '@/hooks/use-sheikh-profile';

interface SheikhAudioTabProps {
  groups: GroupedMediaSection[];
  sectionArchives?: string[];
  sheikhId?: string;
}

export function SheikhAudioTab({
  groups,
  sectionArchives,
  sheikhId,
}: SheikhAudioTabProps) {
  return (
    <SheikhSectionContent
      groups={groups}
      isShort={false}
      sectionArchives={sectionArchives}
      sheikhId={sheikhId}
      archiveLabel="المحتوى الصوتي"
      emptyMessage="لا توجد تسجيلات صوتية متاحة لهذا الشيخ حالياً"
    />
  );
}
