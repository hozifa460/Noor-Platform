'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSheikhProfile } from '@/hooks/use-sheikh-profile';
import { SheikhHeader } from './SheikhHeader';
import { SheikhSectionContent } from './SheikhSectionContent';
import { SheikhVideoTab } from './SheikhVideoTab';
import { SheikhAudioTab } from './SheikhAudioTab';
import { SheikhBooksTab } from './SheikhBooksTab';

interface SheikhProfileProps {
  sheikhId: string;
}

export function SheikhProfile({ sheikhId }: SheikhProfileProps) {
  const {
    sheikh,
    availableSections,
    groupedBySection,
    getSectionArchives,
    isLoading,
    notFound,
    goHome,
  } = useSheikhProfile(sheikhId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="py-20 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            جاري تحميل بيانات الشيخ...
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !sheikh) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">لم يتم العثور على الشيخ</p>
        <Button variant="outline" className="mt-4" onClick={goHome}>
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={goHome}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowRight className="size-4" />
        العودة للرئيسية
      </button>

      {/* Profile Header */}
      <SheikhHeader
        sheikh={sheikh}
        availableSectionsCount={availableSections.length}
      />

      {/* Section Tabs with Content */}
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
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                    {count}
                  </Badge>
                  {groupCount > 1 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({groupCount} مجموعات)
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {availableSections.map((s) => {
            const groups = groupedBySection[s.key] || [];
            const isShort = s.key === 'shorts';
            const sectionArchives = getSectionArchives(s.key);

            let content;
            if (s.key === 'videos' || s.key === 'shorts') {
              content = (
                <SheikhVideoTab
                  groups={groups}
                  isShort={isShort}
                  sectionArchives={sectionArchives}
                  sheikhId={sheikh.id}
                />
              );
            } else if (s.key === 'books') {
              content = (
                <SheikhBooksTab
                  groups={groups}
                  sectionArchives={sectionArchives}
                  sheikhId={sheikh.id}
                />
              );
            } else if (s.key === 'main' || s.key === 'radio' || s.key === 'fatwa') {
              content = (
                <SheikhAudioTab
                  groups={groups}
                  sectionArchives={sectionArchives}
                  sheikhId={sheikh.id}
                />
              );
            } else {
              content = (
                <SheikhSectionContent
                  groups={groups}
                  isShort={isShort}
                  sectionArchives={sectionArchives}
                  sheikhId={sheikh.id}
                />
              );
            }

            return (
              <TabsContent key={s.key} value={s.key} className="mt-6">
                {content}
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
