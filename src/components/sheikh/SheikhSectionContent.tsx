'use client';

import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MediaCard } from '@/components/media/MediaCard';
import { ArchiveLoader } from './ArchiveLoader';
import type { GroupedMediaSection } from '@/hooks/use-sheikh-profile';

interface SheikhSectionContentProps {
  groups: GroupedMediaSection[];
  isShort?: boolean;
  sectionArchives?: string[];
  sheikhId?: string;
  archiveLabel?: string;
  emptyMessage?: string;
}

export function SheikhSectionContent({
  groups,
  isShort = false,
  sectionArchives = [],
  sheikhId,
  archiveLabel,
  emptyMessage = 'لا يوجد عناصر متاحة في هذا القسم',
}: SheikhSectionContentProps) {
  if (groups.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      {groups.length === 1 ? (
        // Single group: render flat grid without accordion
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">{groups[0].title}</h3>
            <Badge variant="outline">{groups[0].items.length}</Badge>
          </div>
          <div
            className={
              isShort
                ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
            }
          >
            {groups[0].items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                variant={isShort ? 'short' : 'default'}
              />
            ))}
          </div>
        </div>
      ) : (
        // Multiple groups: render as collapsible accordion
        <Accordion
          type="multiple"
          defaultValue={[groups[0]?.title]}
          className="w-full"
        >
          {groups.map((group, idx) => (
            <AccordionItem
              key={group.title + idx}
              value={group.title}
              className="border-border"
            >
              <AccordionTrigger className="hover:no-underline py-4 px-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 text-right">
                  <span className="font-bold text-base">{group.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.items.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2">
                <div
                  className={
                    isShort
                      ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'
                      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  }
                >
                  {group.items.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      variant={isShort ? 'short' : 'default'}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Lazy archive loader */}
      {sectionArchives.length > 0 && (
        <ArchiveLoader
          archives={sectionArchives}
          sheikhId={sheikhId}
          label={archiveLabel}
        />
      )}
    </div>
  );
}
