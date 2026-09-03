'use client';

import {
  X,
  Volume2,
  BookOpen,
  RotateCcw,
  Headphones,
  Globe,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAyahRecitersForQiraah, QURAN_RECITERS } from '@/stores/quran-store';
import type { AyahItem, SurahMeta, QiraahMeta, ReciterMeta } from '@/types/quran';
import type { RiwayahReciterEntry } from '@/lib/quran/mp3quran-engine';

interface QuickAyahMenuProps {
  ayah: AyahItem | null;
  surah: SurahMeta;
  activeQiraah: QiraahMeta;
  onClose: () => void;
  isVerseLevelAvailable: boolean;
  activeReciter: ReciterMeta;
  onSelectActiveReciter: (r: ReciterMeta) => void;
  riwayahReciters: RiwayahReciterEntry[];
  activeRiwayahReciter: RiwayahReciterEntry | null;
  onSelectRiwayahReciter: (r: RiwayahReciterEntry) => void;
  onPlayAyah: (ayahNo: number) => void;
  onOpenDetailModal: () => void;
  onPlayFullSurah: () => void;
  onCopyAyah: () => void;
}

export function QuickAyahMenu({
  ayah,
  surah,
  activeQiraah,
  onClose,
  isVerseLevelAvailable,
  activeReciter,
  onSelectActiveReciter,
  riwayahReciters,
  activeRiwayahReciter,
  onSelectRiwayahReciter,
  onPlayAyah,
  onOpenDetailModal,
  onPlayFullSurah,
  onCopyAyah,
}: QuickAyahMenuProps) {
  if (!ayah) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-primary/10 grid place-items-center text-primary text-xs font-bold">
              {ayah.ayahNo}
            </div>
            <h4 className="font-bold text-sm text-foreground">
              سورة {surah.nameAr} • الآية {ayah.ayahNo}
            </h4>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="size-8 rounded-xl">
            <X className="size-4" />
          </Button>
        </div>

        {/* Ayah Calligraphy Preview */}
        <div className="p-5 bg-gradient-to-b from-primary/5 to-transparent text-center border-b border-border">
          <p className="font-quran text-xl sm:text-2xl text-foreground leading-[2.2]">
            ﴿ {ayah.textAr} ﴾
          </p>
        </div>

        {/* Reciter Selector strictly for THIS Riwayah */}
        <div className="p-3 bg-muted/30 border-b border-border space-y-1.5 text-right">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              🎙️ قراء ({activeQiraah.name.replace('مصحف القرآن الكريم - ', '').replace('مصحف المدينة النبوية - ', '')}):
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isVerseLevelAvailable
                ? getAyahRecitersForQiraah(activeQiraah.id).length
                : riwayahReciters.length}{' '}
              قراء
            </span>
          </div>

          {isVerseLevelAvailable ? (
            <select
              value={activeReciter.id}
              onChange={(e) => {
                const available = getAyahRecitersForQiraah(activeQiraah.id);
                const r =
                  available.find((x) => x.id === e.target.value) ||
                  QURAN_RECITERS.find((x) => x.id === e.target.value);
                if (r) {
                  onSelectActiveReciter(r);
                }
              }}
              className="w-full h-9 px-2.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {getAyahRecitersForQiraah(activeQiraah.id).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={activeRiwayahReciter?.reciterId || ''}
              onChange={(e) => {
                const r = riwayahReciters.find((x) => x.reciterId === Number(e.target.value));
                if (r) {
                  onSelectRiwayahReciter(r);
                }
              }}
              className="w-full h-9 px-2.5 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {riwayahReciters.map((r) => (
                <option key={`${r.reciterId}-${r.moshafId}`} value={r.reciterId}>
                  {r.reciterName} ({r.moshafName.replace(' - مرتل', '')})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Grid Buttons */}
        <div className="p-4 grid grid-cols-2 gap-2.5">
          {/* Button 1: Recite Audio */}
          <button
            onClick={() => {
              onPlayAyah(ayah.ayahNo);
              onClose();
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-bold text-xs text-right shadow-sm"
          >
            <Volume2 className="size-5 shrink-0" />
            <div>
              <div>{isVerseLevelAvailable ? `تلاوة الآية (${ayah.ayahNo})` : `سورة بالرواية (${ayah.ayahNo})`}</div>
              <div className="text-[10px] opacity-90 truncate max-w-[130px]">
                {isVerseLevelAvailable ? activeReciter.name : activeRiwayahReciter?.reciterName || 'القارئ'}
              </div>
            </div>
          </button>

          {/* Button 2: Tafsir */}
          <button
            onClick={() => {
              onOpenDetailModal();
              onClose();
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-95 transition-all font-bold text-xs text-right shadow-sm"
          >
            <BookOpen className="size-5 shrink-0" />
            <div>
              <div>تفسير الآية</div>
              <div className="text-[10px] opacity-80">الميسر والسعدي وابن كثير</div>
            </div>
          </button>

          {/* Button 3: Memorization Loop */}
          <button
            onClick={() => {
              onOpenDetailModal();
              onClose();
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
          >
            <RotateCcw className="size-5 text-amber-600 shrink-0" />
            <div>
              <div>تكرار التحفيظ</div>
              <div className="text-[10px] text-muted-foreground">3x / 5x / 10x</div>
            </div>
          </button>

          {/* Button 4: Full Surah */}
          <button
            onClick={() => {
              onPlayFullSurah();
              onClose();
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
          >
            <Headphones className="size-5 text-blue-600 shrink-0" />
            <div>
              <div>تلاوة السورة كاملة</div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {activeRiwayahReciter?.reciterName || activeReciter.name}
              </div>
            </div>
          </button>

          {/* Button 5: Translation */}
          <button
            onClick={() => {
              onOpenDetailModal();
              onClose();
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
          >
            <Globe className="size-5 text-teal-600 shrink-0" />
            <div>
              <div>التراجم العالمية</div>
              <div className="text-[10px] text-muted-foreground">85+ لغة وترجمة</div>
            </div>
          </button>

          {/* Button 6: Copy Ayah */}
          <button
            onClick={() => {
              onCopyAyah();
              onClose();
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-right transition-all text-foreground"
          >
            <Copy className="size-5 text-purple-600 shrink-0" />
            <div>
              <div>نسخ الآية</div>
              <div className="text-[10px] text-muted-foreground">مع التشكيل والرقم</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
