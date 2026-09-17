'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Check, Headphones, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QIRAAT_LIST } from '../domain';
import type { QiraahMeta } from '../domain';
import { cn } from '@/lib/utils';

interface QiraahModalProps {
  open: boolean;
  onClose: () => void;
  activeQiraah: QiraahMeta;
  onSelectQiraah: (qiraah: QiraahMeta) => void;
}

export function QiraahModal({
  open,
  onClose,
  activeQiraah,
  onSelectQiraah,
}: QiraahModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'seven' | 'three_complementary'>('all');
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Keyboard navigation & Focus Trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return QIRAAT_LIST.filter((item) => {
      const matchTab =
        selectedTab === 'all' || item.group === selectedTab;
      if (!matchTab) return false;

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.narrator.toLowerCase().includes(q) ||
        (item.imam && item.imam.toLowerCase().includes(q)) ||
        item.origin.toLowerCase().includes(q) ||
        (item.tariq && item.tariq.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedTab]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="اختيار القراءة والرواية القرآنية"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-card w-full max-w-3xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <BookOpen className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
                اختيار القراءة والرواية
                <Badge variant="secondary" className="text-[11px] font-mono">
                  {QIRAAT_LIST.length} رواية متواترة
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                تصفح مصاحف القراءات العشر المتواترة برواياتها مع تمييز الأنماط المتاحة
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            onClick={onClose}
            aria-label="إغلاق النافذة"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-3 sm:p-4 border-b border-border bg-card space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الرواية، القارئ، الراوي، أو الطريق..."
              className="pr-9 h-10 rounded-xl bg-muted/40 text-sm"
              autoFocus
            />
          </div>

          {/* Classification Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold no-scrollbar">
            <button
              onClick={() => setSelectedTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all whitespace-nowrap',
                selectedTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              جميع الروايات ({QIRAAT_LIST.length})
            </button>
            <button
              onClick={() => setSelectedTab('seven')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all whitespace-nowrap',
                selectedTab === 'seven'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              القراءات السبع الكبرى (15)
            </button>
            <button
              onClick={() => setSelectedTab('three_complementary')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all whitespace-nowrap',
                selectedTab === 'three_complementary'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              الثلاث المتممة للعشر (6)
            </button>
          </div>
        </div>

        {/* Riwayaat Cards List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredList.length > 0 ? (
            filteredList.map((item) => {
              const isSelected = activeQiraah.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectQiraah(item);
                    onClose();
                  }}
                  className={cn(
                    'p-3.5 sm:p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                      : 'bg-muted/20 border-border/70 hover:bg-muted/50 hover:border-border'
                  )}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base text-foreground">
                        {item.name}
                      </span>
                      {item.tariq && (
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                          {item.tariq}
                        </Badge>
                      )}
                      {item.id === 'hafs' && (
                        <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                          <Sparkles className="size-2.5" />
                          النص المكتمل
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {item.narrator} • {item.origin}
                    </div>

                    {/* Capabilities badges */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {item.pdfUrl ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                          <FileText className="size-3" />
                          مصحف مصور (604 ص)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                          <AlertCircle className="size-3" />
                          المصحف المصور قيد التوثيق
                        </span>
                      )}

                      {item.hasAudioSurahs ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                          <Headphones className="size-3" />
                          تلاوات السور كاملة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-[10px]">
                          لا تتوفر تسجيلات حالياً
                        </span>
                      )}

                      {item.hasDigitalText && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/20 text-[10px] font-bold">
                          قراءة متصلة وتفاعلية
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:justify-center shrink-0">
                    {isSelected ? (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                        <Check className="size-3.5" />
                        المختارة حالياً
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectQiraah(item);
                          onClose();
                        }}
                      >
                        اختيار الرواية
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
              <Search className="size-6 mx-auto opacity-50" />
              <p>لم يتم العثور على روايات مطابقة لعبارة البحث: &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
