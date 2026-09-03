'use client';

import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerErrorProps {
  error: string;
  libraryError?: boolean;
  url: string;
  onRetry: () => void;
}

export function PdfViewerError({
  error,
  libraryError,
  url,
  onRetry,
}: PdfViewerErrorProps) {
  return (
    <div
      className="w-full grid place-items-center bg-muted rounded-xl border border-border p-8"
      style={{ minHeight: 400 }}
    >
      <div className="text-center max-w-md">
        <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
        <p className="text-base font-bold mb-2">
          {libraryError ? 'تعذر تحميل المكتبة' : 'تعذر تحميل الكتاب'}
        </p>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="default"
            size="sm"
            onClick={onRetry}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            إعادة المحاولة
          </Button>
          {!libraryError && (
            <Button asChild variant="outline" size="sm">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                فتح في نافذة جديدة
              </a>
            </Button>
          )}
        </div>
        {libraryError && (
          <p className="text-xs text-muted-foreground/70 mt-4">
            إذا استمرت المشكلة، تحقق من اتصالك بالإنترنت ثم أعد تحميل الصفحة (F5).
          </p>
        )}
      </div>
    </div>
  );
}
