'use client';

import { Crown, Sparkles, BookOpen, User, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { IsnadNode } from '@/types/hadith';
import { cn } from '@/lib/utils';

interface HadithIsnadCanvasProps {
  nodes: IsnadNode[];
  zoomLevel: number;
  onOpenBio: (narratorName: string) => void;
}

export function HadithIsnadCanvas({
  nodes,
  zoomLevel,
  onOpenBio,
}: HadithIsnadCanvasProps) {
  return (
    <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-card/95 via-muted/20 to-card/90 border border-border/80 shadow-xs overflow-x-auto overflow-y-hidden">
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />

      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease-out',
        }}
        className="relative max-w-3xl mx-auto py-4"
      >
        <div className="space-y-8 relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-1 bg-gradient-to-b from-primary/40 via-emerald-500/50 to-amber-500/60 rounded-full hidden sm:block pointer-events-none" />

          {nodes.map((node: IsnadNode, idx: number) => {
            const isFirst = idx === 0;
            const isLast = idx === nodes.length - 1;
            const isSahabi = node.role === 'الصحابي الجليل';
            const isEven = idx % 2 === 0;

            return (
              <div
                key={`${node.order}-${node.name}`}
                onClick={() => onOpenBio(node.name)}
                className={cn(
                  'relative flex flex-col sm:flex-row items-center gap-4 transition-all cursor-pointer group',
                  isLast || isFirst
                    ? 'sm:justify-center'
                    : isEven
                    ? 'sm:flex-row-reverse sm:text-left'
                    : 'sm:flex-row sm:text-right'
                )}
              >
                {/* Node Medallion */}
                <div
                  className={cn(
                    'relative z-20 size-15 sm:size-17 rounded-3xl grid place-items-center shrink-0 font-extrabold shadow-md transition-all duration-300 group-hover:scale-110',
                    isLast
                      ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white ring-8 ring-amber-500/25 shadow-amber-500/40 shadow-xl'
                      : isSahabi
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-6 ring-emerald-500/25 shadow-emerald-500/30 shadow-lg'
                      : isFirst
                      ? 'bg-primary text-primary-foreground ring-6 ring-primary/20 shadow-primary/25 shadow-md'
                      : 'bg-card text-foreground border-2 border-border/90 group-hover:border-primary group-hover:shadow-md'
                  )}
                >
                  {isLast ? (
                    <Crown className="size-7 text-white animate-pulse" />
                  ) : isSahabi ? (
                    <Sparkles className="size-7 text-white" />
                  ) : isFirst ? (
                    <BookOpen className="size-7" />
                  ) : (
                    <User className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}

                  <span
                    className={cn(
                      'absolute -bottom-2 text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs',
                      isLast
                        ? 'bg-amber-600 text-white border-amber-300'
                        : isSahabi
                        ? 'bg-emerald-700 text-white border-emerald-400'
                        : isFirst
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    #{node.order}
                  </span>
                </div>

                {/* Branch Card */}
                <div
                  className={cn(
                    'w-full sm:w-[calc(50%-48px)] p-4 sm:p-5 rounded-3xl border transition-all duration-300 relative shadow-2xs group-hover:shadow-md',
                    isLast
                      ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40 text-center sm:max-w-md ring-1 ring-amber-500/30'
                      : isSahabi
                      ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/40 ring-1 ring-emerald-500/25'
                      : isFirst
                      ? 'bg-primary/10 border-primary/30 text-center sm:max-w-md'
                      : 'bg-card/95 border-border/80 group-hover:bg-muted/30 group-hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2 justify-between">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-lg border',
                        isLast
                          ? 'bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/40'
                          : isSahabi
                          ? 'bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-emerald-500/40'
                          : isFirst
                          ? 'bg-primary/20 text-primary border-primary/30'
                          : 'bg-muted/80 text-muted-foreground border-border'
                      )}
                    >
                      {node.role}
                    </Badge>

                    <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md text-[11px] font-bold text-muted-foreground border border-border/50">
                      <span className="text-[10px] opacity-70">صيغة التحمل:</span>
                      <span className="text-primary font-black">{node.phrase}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h5
                      className={cn(
                        'text-sm sm:text-base font-bold text-foreground transition-colors group-hover:text-primary',
                        isLast && 'text-amber-900 dark:text-amber-300 font-black text-base sm:text-lg',
                        isSahabi && 'text-emerald-900 dark:text-emerald-300 font-black'
                      )}
                    >
                      {node.name}
                    </h5>

                    <span className="text-[10px] text-muted-foreground group-hover:text-primary font-bold flex items-center gap-1 shrink-0 bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                      <Info className="size-3" />
                      <span>الترجمة</span>
                    </span>
                  </div>

                  {isSahabi && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                      رضي الله عنه وأرضاه — صحابي جليل وناقل الحديث عن النبي ﷺ
                    </p>
                  )}
                  {isLast && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium mt-1">
                      صلوات ربي وسلامه عليه — ينبوع الوحي والهداية للبشرية
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
