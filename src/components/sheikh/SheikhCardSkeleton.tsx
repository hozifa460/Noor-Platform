'use client';

/**
 * Skeleton placeholder for a SheikhCard. Shows a shimmering empty card while
 * real data is loading. Matches the layout of SheikhCard exactly.
 */
export function SheikhCardSkeleton() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-card border border-border p-4 flex flex-col items-center animate-pulse">
      {/* Avatar circle */}
      <div className="size-20 rounded-full bg-muted mb-3" />

      {/* Name line */}
      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
      <div className="h-3 w-1/2 bg-muted rounded mb-3" />

      {/* Bio lines */}
      <div className="h-2.5 w-full bg-muted rounded mb-1.5 min-h-[2.2em]" />
      <div className="h-2.5 w-5/6 bg-muted rounded mb-3" />

      {/* Badges */}
      <div className="flex items-center gap-2 mt-auto">
        <div className="h-4 w-12 bg-muted rounded" />
        <div className="h-4 w-10 bg-muted rounded" />
      </div>
    </div>
  );
}
