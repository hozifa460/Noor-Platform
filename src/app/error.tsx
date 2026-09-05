'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log error to client console for observability and debugging
    console.error('[Noor Platform Error Boundary]:', error);
  }, [error]);

  const handleHardReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[70vh] flex flex-col items-center justify-center p-4 sm:p-8 text-center"
      dir="rtl"
    >
      <div className="w-full max-w-lg mx-auto bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm backdrop-blur-xs flex flex-col items-center">
        {/* Warning Icon with amber / emerald aesthetic */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 shadow-xs animate-in zoom-in-90 duration-300">
          <AlertTriangle className="size-8" />
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans mb-3">
          عذراً، حدث خطأ غير متوقع
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 max-w-md">
          نعتذر عن هذا الخلل المؤقت في منصة نور. نسعى دائماً لتقديم تجربة موثوقة، وقد تم تسجيل تفاصيل الخطأ للعمل على معالجته فوراً.
        </p>

        {/* Error digest badge if available */}
        {error?.digest && (
          <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-mono text-muted-foreground border border-border">
            <span>رمز المتابعة:</span>
            <span className="font-semibold text-foreground">{error.digest}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-6">
          <Button
            onClick={() => reset()}
            className="flex-1 sm:flex-initial min-w-[140px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <RotateCcw className="size-4" />
            إعادة المحاولة
          </Button>

          <Button
            asChild
            variant="outline"
            className="flex-1 sm:flex-initial min-w-[140px] gap-2"
          >
            <Link href="/">
              <Home className="size-4" />
              الرئيسية
            </Link>
          </Button>

          <Button
            onClick={handleHardReload}
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground text-xs"
            title="إعادة تحميل الصفحة بالكامل"
          >
            <RefreshCw className="size-3.5" />
            تحديث الصفحة
          </Button>
        </div>

        {/* Technical Details Toggle */}
        <div className="w-full pt-4 border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span>التفاصيل التقنية</span>
            {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-3 p-3 rounded-lg bg-muted/70 border border-border/70 text-right overflow-x-auto text-xs font-mono text-muted-foreground max-h-40 whitespace-pre-wrap break-words">
              <p className="font-semibold text-destructive mb-1">{error?.name || 'Error'}: {error?.message || 'Unknown error occurred'}</p>
              {error?.stack && <p className="opacity-80 text-[11px] leading-tight">{error.stack}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
