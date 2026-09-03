'use client';

import { Flame, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FEATURED_ISLAMIC_CLASSICS, type FeaturedClassic } from '@/lib/featured-books';

interface FeaturedClassicsRibbonProps {
  onOpenFeatured: (classic: FeaturedClassic) => void;
}

export function FeaturedClassicsRibbon({ onOpenFeatured }: FeaturedClassicsRibbonProps) {
  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-500">
            <Flame className="size-4 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span>أمهات كتب التراث الكبرى</span>
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                روائع مختارة
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              أوثق وأجل أمهات المصنفات الإسلامية المحققة موافقة للمطبوع
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory">
        {FEATURED_ISLAMIC_CLASSICS.map((fc) => (
          <div
            key={fc.id}
            onClick={() => onOpenFeatured(fc)}
            className="group relative w-64 sm:w-72 shrink-0 snap-start p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-card/90 to-card hover:border-amber-500/50 transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between"
          >
            <div>
              {/* Top Tags */}
              <div className="flex items-center justify-between text-[11px] mb-2.5">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span>{fc.icon}</span>
                  <span>{fc.discipline}</span>
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {fc.volumes} {fc.volumes > 1 ? 'مجلدات' : 'مجلد'}
                </Badge>
              </div>

              {/* Title & Author */}
              <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1 leading-snug">
                {fc.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
                <span className="line-clamp-1 font-medium">{fc.author}</span>
                <span className="text-[10px] opacity-75 shrink-0">({fc.authorDeath})</span>
              </div>

              {/* Summary */}
              <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {fc.description}
              </p>
            </div>

            {/* Open Button */}
            <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold group-hover:underline flex items-center gap-1">
                قراءة فورية
                <ChevronLeft className="size-3 transition-transform group-hover:-translate-x-0.5" />
              </span>
              <span className="text-[10px] opacity-60 font-mono">موافق للمطبوع</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
