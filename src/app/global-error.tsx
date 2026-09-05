'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('[Noor Platform Fatal Root Error]:', error);
  }, [error]);

  const handleHardReload = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 font-sans antialiased">
        <div
          role="alert"
          aria-live="assertive"
          className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-center flex flex-col items-center"
        >
          {/* Warning Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 shadow-xs">
            <AlertTriangle className="size-8" />
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-3">
            عذراً، حدث خطأ فادح في منصة نور
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-md">
            نعتذر بشدة عن هذا الخلل غير المتوقع. واجه النظام مشكلة في تهيئة واجهة التطبيق الأساسية. يمكنك إعادة المحاولة أو الانتقال إلى الصفحة الرئيسية.
          </p>

          {/* Error digest badge if available */}
          {error?.digest && (
            <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span>رمز المتابعة:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{error.digest}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-6">
            <Button
              onClick={() => reset()}
              className="flex-1 sm:flex-initial min-w-[140px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <RotateCcw className="size-4" />
              إعادة المحاولة
            </Button>

            <Button
              onClick={handleHardReload}
              variant="outline"
              className="flex-1 sm:flex-initial min-w-[140px] gap-2"
            >
              <RefreshCw className="size-4" />
              الرئيسية
            </Button>
          </div>

          {/* Technical Details Toggle */}
          <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span>التفاصيل التقنية</span>
              {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-right overflow-x-auto text-xs font-mono text-slate-700 dark:text-slate-300 max-h-40 whitespace-pre-wrap break-words">
                <p className="font-semibold text-rose-600 dark:text-rose-400 mb-1">
                  {error?.name || 'Error'}: {error?.message || 'Unknown root layout error'}
                </p>
                {error?.stack && <p className="opacity-80 text-[11px] leading-tight">{error.stack}</p>}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
