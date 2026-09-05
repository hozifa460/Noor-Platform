'use client';

import { Scale, BookOpen } from 'lucide-react';
import { BROWSE_TOTALS } from '../engines/browse';

export function FatwaHeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-950 via-teal-950 to-slate-950 p-6 sm:p-10 border border-emerald-500/20 shadow-xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Scale className="size-3.5" />
            <span>فتاوى موثقة لكبار أئمة الإسلام والعلماء المعاصرين</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-serif">
            موسوعة الفتاوى الشرعية الكبرى
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/70 leading-relaxed font-sans">
            محرك بحث شرعي ذكي يتيح تصفح أكثر من 220,000 فتوى ومسألة فقهية بروابط إسنادية واضحة وإجابات مؤصلة لكبار العلماء (ابن باز، ابن عثيمين، الفوزان، ودور الإفتاء).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-5 py-4 rounded-2xl border border-emerald-500/20 shrink-0">
          <div className="size-12 rounded-xl bg-emerald-500/20 grid place-items-center text-emerald-400">
            <BookOpen className="size-6" />
          </div>
          <div>
            <p className="text-xs text-emerald-200/70 font-semibold">المسائل والفتاوى المفهرسة</p>
            <p className="text-2xl font-extrabold font-mono text-emerald-300">
              +{BROWSE_TOTALS.all.toLocaleString('ar-SA')} مسألة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
