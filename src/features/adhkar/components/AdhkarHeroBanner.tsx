'use client';

import { Sparkles, BookOpen } from 'lucide-react';

interface AdhkarHeroBannerProps {
  totalDhikrs: number;
}

export function AdhkarHeroBanner({ totalDhikrs }: AdhkarHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-950 via-emerald-950 to-stone-900 border border-emerald-500/20 p-6 sm:p-10 text-white shadow-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>حصن المسلم وأذكار اليوم والليلة</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif flex items-center gap-3">
            <span>📿</span>
            <span>الأذكار والأدعية النبوية المأثورة</span>
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 leading-relaxed font-sans">
            موسوعة شاملة للأذكار والأدعية الثابتة عن النبي ﷺ مع عداد تسبيح تفاعلي، واستماع صوتي مباشر لكل ذكر، وفضل الذكر وتخريجه المعتمد.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-4 rounded-2xl border border-emerald-500/20 shrink-0">
          <div className="size-12 rounded-xl bg-emerald-500/20 grid place-items-center text-emerald-400">
            <BookOpen className="size-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-semibold">إجمالي الأذكار المتاحة</p>
            <p className="text-2xl font-extrabold font-mono text-emerald-300">
              {totalDhikrs || 267} ذكراً مأثوراً
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
