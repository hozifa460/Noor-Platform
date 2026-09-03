'use client';

import { Loader2 } from 'lucide-react';

interface PdfViewerLoadingProps {
  progress?: number;
}

export function PdfViewerLoading({ progress = 0 }: PdfViewerLoadingProps) {
  return (
    <div
      className="w-full grid place-items-center bg-muted rounded-xl border border-border p-8"
      style={{ minHeight: 400 }}
    >
      <div className="text-center max-w-sm">
        <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-2">
          جاري تحميل الكتاب...
        </p>
        {progress > 0 && (
          <>
            <div className="h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden max-w-xs mx-auto mb-1">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </p>
          </>
        )}
      </div>
    </div>
  );
}
