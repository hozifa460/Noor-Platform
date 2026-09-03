'use client';

import { Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Sheikh } from '@/lib/types';

interface SheikhHeaderProps {
  sheikh: Sheikh;
  availableSectionsCount: number;
}

export function SheikhHeader({ sheikh, availableSectionsCount }: SheikhHeaderProps) {
  const gradientBg =
    sheikh.gradientColors && sheikh.gradientColors.length >= 2
      ? {
          backgroundImage: `linear-gradient(135deg, ${sheikh.gradientColors[0]}22, ${sheikh.gradientColors[1]}22), radial-gradient(circle at 80% 20%, ${sheikh.gradientColors[0]}11, transparent 50%)`,
        }
      : {
          backgroundImage:
            'linear-gradient(135deg, oklch(0.7 0.16 162 / 0.12), oklch(0.82 0.14 84 / 0.08))',
        };

  const avatarGradient =
    sheikh.gradientColors && sheikh.gradientColors.length >= 2
      ? {
          backgroundImage: `linear-gradient(135deg, ${sheikh.gradientColors[0]}, ${sheikh.gradientColors[1]})`,
        }
      : {
          backgroundImage:
            'linear-gradient(135deg, oklch(0.7 0.16 162), oklch(0.82 0.14 84))',
        };

  return (
    <header
      className="relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8 islamic-pattern"
      style={gradientBg}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar Container with auto retry */}
        <div
          className="size-28 sm:size-32 rounded-2xl overflow-hidden grid place-items-center ring-2 ring-primary/20 shadow-xl shrink-0 relative"
          style={avatarGradient}
        >
          <img
            src={`/api/sheikh-avatar?id=${encodeURIComponent(sheikh.id)}&name=${encodeURIComponent(sheikh.name)}`}
            alt={sheikh.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried) {
                img.dataset.retried = '1';
                img.src = `/api/sheikh-avatar?id=${encodeURIComponent(sheikh.id)}&name=${encodeURIComponent(sheikh.name)}&retry=1`;
              }
            }}
          />
        </div>

        {/* Info & Stats */}
        <div className="flex-1 text-center sm:text-right">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{sheikh.name}</h1>
            {sheikh.isMainCollection && (
              <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
                <Verified className="size-3" />
                مجموعة رئيسية
              </Badge>
            )}
          </div>

          {sheikh.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-4">
              {sheikh.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
            <Badge variant="secondary">{sheikh.totalItems} عنصر</Badge>
            <Badge variant="outline">{availableSectionsCount} أقسام</Badge>
            <Badge variant="outline">{sheikh.sourceFiles.length} ملف مصدر</Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
