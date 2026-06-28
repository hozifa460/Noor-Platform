'use client';

import { useState } from 'react';
import { Loader2, ExternalLink, FileText } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  title?: string;
}

/**
 * In-site PDF viewer using an iframe with Google Docs Viewer as fallback.
 * The PDF opens directly inside the platform — no redirect to archive.org.
 *
 * Strategy:
 *   1. Try direct iframe embed (works for CORS-enabled PDFs)
 *   2. Fallback: Google Docs Viewer (renders any PDF in-browser)
 */
export function PdfViewer({ url, title }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // Google Docs Viewer can render any PDF without CORS issues
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="w-full">
      <div className="relative aspect-[3/4] sm:aspect-[4/3] w-full bg-muted rounded-xl overflow-hidden border border-border">
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <div className="text-center">
              <Loader2 className="size-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">جاري تحميل الكتاب...</p>
            </div>
          </div>
        )}

        {/* Primary: Google Docs Viewer (works for all PDFs, no CORS issues) */}
        <iframe
          src={googleViewerUrl}
          title={title || 'PDF viewer'}
          className="w-full h-full"
          style={{ border: 'none' }}
          onLoad={() => setLoading(false)}
          onError={() => setUseFallback(true)}
        />

        {useFallback && (
          <div className="absolute inset-0 grid place-items-center bg-muted p-6">
            <div className="text-center">
              <FileText className="size-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">تعذر عرض الكتاب داخل الموقع</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                <ExternalLink className="size-4" />
                فتح الكتاب في نافذة جديدة
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
