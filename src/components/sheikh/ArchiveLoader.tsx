'use client';

import { useState } from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/library.store';
import { loadArchiveFile } from '@/hooks/use-library';
import { toast } from 'sonner';

interface ArchiveLoaderProps {
  archives: string[];
  sheikhId?: string;
  label?: string;
}

export function ArchiveLoader({ archives, label }: ArchiveLoaderProps) {
  const loadedArchives = useLibraryStore((s) => s.loadedArchives);
  const [loading, setLoading] = useState(false);

  const unloaded = archives.filter((a) => !loadedArchives.has(a));
  if (unloaded.length === 0) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(unloaded.map((f) => loadArchiveFile(f)));
      const total = results.reduce((sum, r) => sum + r.length, 0);
      if (total > 0) {
        toast.success(`تم تحميل ${total} عنصر إضافي من الأرشيف`);
      } else {
        toast.error('لم يتم العثور على عناصر في الأرشيف');
      }
    } catch {
      toast.error('تعذر تحميل الأرشيف');
    } finally {
      setLoading(false);
    }
  };

  const buttonText = label ? `تحميل ${label} الأقدم` : 'تحميل المحتوى الأقدم من الأرشيف';

  return (
    <div className="mt-8 flex flex-col items-center gap-3 py-6 border-t border-border">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">
          يوجد محتوى أقدم متاح في الأرشيف
        </p>
        <p className="text-xs text-muted-foreground/70">
          {unloaded.length} ملف أرشيف · اضغط للتحميل الكسول
        </p>
      </div>
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        size="lg"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Archive className="size-4" />
        )}
        {loading ? 'جاري تحميل الأرشيف...' : buttonText}
      </Button>
    </div>
  );
}
