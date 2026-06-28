'use client';

/**
 * Skeleton placeholder for a MediaCard. Shows a shimmering empty card while
 * real data is loading. Matches the layout of the default MediaCard variant.
 */
export function MediaCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
      {/* Thumbnail */}
      <div className="aspect-video w-full bg-muted" />
      {/* Title */}
      <div className="p-3">
        <div className="h-3.5 w-full bg-muted rounded mb-2" />
        <div className="h-3.5 w-2/3 bg-muted rounded mb-2" />
        <div className="h-2.5 w-1/2 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a horizontal rail of media cards (used in home page section
 * rails while data is loading).
 */
export function MediaRailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-56 sm:w-64 shrink-0">
          <MediaCardSkeleton />
        </div>
      ))}
    </div>
  );
}
