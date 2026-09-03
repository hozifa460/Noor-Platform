'use client';

import { Sparkles, FileQuestion, BookOpen, User } from 'lucide-react';
import { BROWSE_TOTALS } from '@/lib/fatwa-browse';

export function FatwaHeroBanner() {
  return (
    <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-teal-500/20 bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-950 text-white shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-4">
          <Sparkles className="size-3.5 text-teal-400" />
          موسوعة الفتاوى والأحكام الشرعية
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3 text-teal-100">
          موسوعة فتاوى كبار علماء الأمة
        </h1>

        <p className="text-sm sm:text-base text-teal-100/90 leading-relaxed mb-6 max-w-2xl">
          أكثر من <strong className="text-teal-300 font-bold">50,000 فتوى وسؤال وجواب</strong> محققة وموثقة من كبار أئمة وعلماء العالم الإسلامي، بنصوص السؤال والجواب الكاملة وفهارس موضوعية دقيقة.
        </p>

        {/* Metrics */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
            <FileQuestion className="size-4 text-teal-400" />
            <span>
              <strong className="text-white font-bold">{BROWSE_TOTALS.total.toLocaleString('ar-SA')}</strong> فتوى محققة
            </span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
            <User className="size-4 text-emerald-400" />
            <span>
              <strong className="text-white font-bold">10</strong> من كبار العلماء والمفتين
            </span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/30 backdrop-blur-md border border-white/10">
            <BookOpen className="size-4 text-amber-400" />
            <span>
              <strong className="text-white font-bold">25</strong> باباً وتصنيفاً فقهياً
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
