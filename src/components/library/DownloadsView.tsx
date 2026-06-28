'use client';

import { Download, Trash2, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDownloadsStore } from '@/stores/downloads.store';
import { useLibraryStore } from '@/stores/library.store';
import { usePlayerStore } from '@/stores/player.store';
import { deleteBlob, clearBlobs } from '@/lib/offline-db';
import { toast } from 'sonner';

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function DownloadsView() {
  const downloads = useDownloadsStore((s) => s.downloads);
  const removeDownload = useDownloadsStore((s) => s.remove);
  const items = useLibraryStore((s) => s.items);
  const open = usePlayerStore((s) => s.open);

  const totalSize = downloads.reduce((acc, d) => acc + (d.size || 0), 0);

  const handleRemove = async (itemId: string) => {
    const dl = downloads.find((d) => d.itemId === itemId);
    if (dl) {
      try { await deleteBlob(dl.blobKey); } catch { /* ignore */ }
    }
    removeDownload(itemId);
    toast.success('تم الحذف');
  };

  const handleClearAll = async () => {
    try { await clearBlobs(); } catch { /* ignore */ }
    downloads.forEach((d) => removeDownload(d.itemId));
    toast.success('تم مسح كل التنزيلات');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Download className="size-6 text-primary" />
            التنزيلات
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <HardDrive className="size-3" />
            {downloads.length} عنصر · {formatBytes(totalSize)}
          </p>
        </div>
        {downloads.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll} className="gap-2 text-destructive">
            <Trash2 className="size-4" />
            مسح الكل
          </Button>
        )}
      </div>

      {downloads.length === 0 ? (
        <div className="py-20 text-center">
          <Download className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">لا توجد تنزيلات بعد</p>
          <p className="text-xs text-muted-foreground/70 mt-1">سيتم حفظ المحتوى المنزّل للوصول إليه دون اتصال</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {downloads.map((dl) => {
            const item = items.find((i) => i.id === dl.itemId);
            if (!item) return null;
            return (
              <div key={dl.itemId} className="rounded-xl border border-border overflow-hidden bg-card">
                <button
                  onClick={() => open(item)}
                  className="w-full text-right flex gap-3 p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted shrink-0 relative">
                    {item.imageUrl ? (
                       
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center">
                        <Download className="size-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <Badge className="absolute bottom-1 right-1 text-[9px] bg-black/70 hover:bg-black/70">
                      <Download className="size-2.5" />
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2 leading-tight">{item.title}</p>
                    {item.sheikhName && <p className="text-xs text-muted-foreground mt-1">{item.sheikhName}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{formatBytes(dl.size)}</p>
                  </div>
                </button>
                <div className="border-t border-border px-3 py-2 flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">متاح دون اتصال</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleRemove(dl.itemId)}
                    aria-label="حذف"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
