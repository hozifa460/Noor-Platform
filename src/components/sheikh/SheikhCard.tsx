'use client';

import { ChevronLeft, Users, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavStore } from '@/stores/nav.store';
import { getSheikhMeta } from '@/lib/sheikh-meta';
import type { Sheikh } from '@/lib/types';

interface SheikhCardProps {
  sheikh: Sheikh;
}

/** Builds an inline CSS background using the sheikh's gradientColors. */
function gradientStyle(sheikh: Sheikh): React.CSSProperties | undefined {
  if (sheikh.gradientColors && sheikh.gradientColors.length >= 2) {
    return { backgroundImage: `linear-gradient(135deg, ${sheikh.gradientColors[0]}, ${sheikh.gradientColors[1]})` };
  }
  if (sheikh.gradientColors && sheikh.gradientColors.length === 1) {
    return { backgroundColor: sheikh.gradientColors[0] };
  }
  return undefined;
}

/** Returns the avatar URL for a sheikh — uses the /api/sheikh-avatar endpoint
 * which resolves to a real photo, YouTube channel avatar, or generated SVG. */
function avatarUrl(sheikh: Sheikh): string {
  return `/api/sheikh-avatar?id=${encodeURIComponent(sheikh.id)}&name=${encodeURIComponent(sheikh.name)}`;
}

export function SheikhCard({ sheikh }: SheikhCardProps) {
  const openSheikh = useNavStore((s) => s.openSheikh);

  const sectionCount = Object.entries(sheikh.sections)
    .filter(([_, items]) => items.length > 0).length;

  return (
    <button
      onClick={() => openSheikh(sheikh.id)}
      className="group relative w-full text-right rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 p-4 flex flex-col items-center"
    >
      <div className="relative mb-3">
        <div
          className="size-20 rounded-full overflow-hidden grid place-items-center ring-2 ring-border group-hover:ring-primary/30 transition-all relative"
          style={gradientStyle(sheikh) || { backgroundImage: 'linear-gradient(135deg, oklch(0.7 0.16 162), oklch(0.82 0.14 84))' }}
        >
          {/* Real avatar image — covers the gradient background.
              The /api/sheikh-avatar endpoint resolves to:
                1. Curated photo (for famous sheikhs)
                2. YouTube channel avatar (for synced sheikhs)
                3. Generated SVG (fallback for all others) */}
          { }
          <img
            src={avatarUrl(sheikh)}
            alt={sheikh.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // Retry once with a cache-busting param, then give up.
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried) {
                img.dataset.retried = '1';
                img.src = avatarUrl(sheikh) + '&retry=1';
              } else {
                img.style.display = 'none';
              }
            }}
          />
        </div>
        {sheikh.isMainCollection && (
          <div className="absolute -bottom-1 -left-1 size-7 rounded-full bg-accent text-accent-foreground grid place-items-center ring-2 ring-card" title="مجموعة رئيسية">
            <Verified className="size-4" />
          </div>
        )}
      </div>

      <h3 className="font-bold text-sm line-clamp-2 leading-tight mb-1">{sheikh.name}</h3>
      {sheikh.bio && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-3 min-h-[2.2em]">
          {sheikh.bio}
        </p>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <Badge variant="secondary" className="text-[10px]">
          {sheikh.totalItems} عنصر
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {sectionCount} أقسام
        </Badge>
      </div>

      <div className="absolute top-3 left-3 size-7 rounded-full bg-background/80 backdrop-blur grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronLeft className="size-4" />
      </div>
    </button>
  );
}
