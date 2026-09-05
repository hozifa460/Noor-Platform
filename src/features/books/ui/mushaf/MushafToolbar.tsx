'use client';

import {
  Settings2,
  ListTree,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MushafThemeStyleConfig } from '@/types/reader';

interface MushafToolbarProps {
  currentSurahNo: number;
  surahNameAr: string;
  revelationPlace: string;
  totalAyahs: number;
  onPrevSurah: () => void;
  onNextSurah: () => void;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onSwitchToPdf?: () => void;
  styles: MushafThemeStyleConfig;
}

export function MushafToolbar({
  currentSurahNo,
  surahNameAr,
  revelationPlace,
  totalAyahs: _totalAyahs,
  onPrevSurah,
  onNextSurah,
  onOpenSidebar,
  onOpenSettings,
  onClose,
  onSwitchToPdf,
  styles,
}: MushafToolbarProps) {
  return (
    <header
      className={`sticky top-0 z-40 px-4 sm:px-6 py-3 border-b flex items-center justify-between shadow-xs transition-colors duration-300 ${styles.headerBg}`}
    >
      {/* Right: Surah info & navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSidebar}
          className="gap-2 font-serif text-sm rounded-xl"
        >
          <ListTree className="size-4" />
          <span>سورة {surahNameAr}</span>
          <Badge variant="secondary" className="text-[10px]">
            {revelationPlace === 'Meccan' ? 'مكية' : 'مدنية'}
          </Badge>
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevSurah}
            disabled={currentSurahNo <= 1}
            className="size-8 rounded-lg"
            title="السورة السابقة"
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNextSurah}
            disabled={currentSurahNo >= 114}
            className="size-8 rounded-lg"
            title="السورة التالية"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>

      {/* Left: Settings & Actions */}
      <div className="flex items-center gap-2">
        {onSwitchToPdf && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitchToPdf}
            className="gap-1.5 text-xs rounded-xl hidden sm:flex"
            title="التبديل إلى نسخة الـ PDF المصورة"
          >
            <FileText className="size-3.5" />
            <span>نسخة المصحف PDF</span>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="size-9 rounded-xl"
          title="خيارات القراءة والخط"
        >
          <Settings2 className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
          title="إغلاق المصحف"
        >
          <X className="size-5" />
        </Button>
      </div>
    </header>
  );
}
