'use client';

import { SheikhSectionContent } from './SheikhSectionContent';
import type { GroupedMediaSection } from '@/hooks/use-sheikh-profile';

interface SheikhBooksTabProps {
  groups: GroupedMediaSection[];
  sectionArchives?: string[];
  sheikhId?: string;
}

export function SheikhBooksTab({
  groups,
  sectionArchives,
  sheikhId,
}: SheikhBooksTabProps) {
  return (
    <SheikhSectionContent
      groups={groups}
      isShort={false}
      sectionArchives={sectionArchives}
      sheikhId={sheikhId}
      archiveLabel="الكتب والمصنفات"
      emptyMessage="لا توجد كتب أو مؤلفات منشورة لهذا الشيخ حالياً"
    />
  );
}
