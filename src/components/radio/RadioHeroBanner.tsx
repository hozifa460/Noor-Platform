'use client';

import { Flame } from 'lucide-react';

interface RadioHeroBannerProps {
  totalStations: number;
}

export function RadioHeroBanner({ totalStations }: RadioHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 border border-emerald-500/20 p-6 sm:p-10 text-white shadow-2xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>بث مباشر 24 ساعة متواصلة</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif flex items-center gap-3">
            <span>📻</span>
            <span>الإذاعات الإسلامية الكبرى</span>
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/80 leading-relaxed font-sans">
            بث مباشر متواصل لأعذب التلاوات القرآنية بأصوات كبار قراء العالم الإسلامي، مع إذاعات الحديث النبوي الشريف والتفاسير الميسرة وترجمات معاني القرآن.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-4 rounded-2xl border border-emerald-500/20 shrink-0">
          <div className="size-12 rounded-xl bg-emerald-500/20 grid place-items-center text-emerald-400">
            <Flame className="size-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-semibold">الإذاعات النشطة المؤكدة</p>
            <p className="text-2xl font-extrabold font-mono text-emerald-300">
              {totalStations || 156} إذاعة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
