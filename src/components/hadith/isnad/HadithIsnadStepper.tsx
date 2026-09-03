'use client';

import { Crown, Sparkles, BookOpen, User, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { IsnadNode } from '@/types/hadith';
import { cn } from '@/lib/utils';

interface HadithIsnadStepperProps {
  nodes: IsnadNode[];
  onOpenBio: (narratorName: string) => void;
}

export function HadithIsnadStepper({
  nodes,
  onOpenBio,
}: HadithIsnadStepperProps) {
  return (
    <div className="relative px-2 sm:px-6 py-2">
      {/* Continuous luminous vertical connection line */}
      <div className="absolute right-[27px] sm:right-[43px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary/30 via-emerald-500/40 to-amber-500/40" />

      <div className="space-y-4">
        {nodes.map((node: IsnadNode, idx: number) => {
          const isFirst = idx === 0;
          const isLast = idx === nodes.length - 1;
          const isSahabi = node.role === 'الصحابي الجليل';

          return (
            <div
              key={`${node.order}-${node.name}`}
              onClick={() => onOpenBio(node.name)}
              className="relative flex items-start gap-3 sm:gap-4 group cursor-pointer"
            >
              <div
                className={cn(
                  'relative z-10 size-9 sm:size-10 rounded-2xl grid place-items-center shrink-0 font-extrabold text-xs shadow-xs transition-all group-hover:scale-105',
                  isFirst
                    ? 'bg-primary text-primary-foreground border-2 border-primary ring-4 ring-primary/15'
                    : isLast
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white border-2 border-amber-400 ring-4 ring-amber-500/20 shadow-md scale-105'
                    : isSahabi
                    ? 'bg-emerald-500 text-white border-2 border-emerald-400 ring-4 ring-emerald-500/15'
                    : 'bg-card text-foreground border-2 border-border group-hover:border-primary/50'
                )}
              >
                {isLast ? (
                  <Crown className="size-4.5" />
                ) : isFirst ? (
                  <BookOpen className="size-4" />
                ) : isSahabi ? (
                  <Sparkles className="size-4" />
                ) : (
                  <User className="size-4 text-muted-foreground group-hover:text-primary" />
                )}
              </div>

              <div
                className={cn(
                  'flex-1 p-3.5 sm:p-4 rounded-2xl border transition-all',
                  isLast
                    ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 shadow-xs'
                    : isSahabi
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 shadow-xs'
                    : isFirst
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border/70 group-hover:bg-muted/30 group-hover:border-border'
                )}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0 rounded-md border',
                        isLast
                          ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40'
                          : isSahabi
                          ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/40'
                          : isFirst
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {node.role}
                    </Badge>
                    <span className="text-[11px] font-bold text-muted-foreground/80">
                      {node.phrase}
                    </span>
                  </div>

                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="size-3 text-primary" />
                    <span>انقر للترجمة الكاملة</span>
                  </span>
                </div>

                <h5
                  className={cn(
                    'text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors',
                    isLast && 'text-amber-800 dark:text-amber-300 font-extrabold',
                    isSahabi && 'text-emerald-800 dark:text-emerald-300 font-extrabold'
                  )}
                >
                  {node.name}
                </h5>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
