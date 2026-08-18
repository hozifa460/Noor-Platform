'use client';

import { useState } from 'react';
import { Sparkles, Bot, X, BookOpen, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ─── Floating Button ────────────────────────────────────────── */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 sm:left-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'group relative flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300',
            'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white',
            'hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-900/40 hover:scale-105 active:scale-95',
            'border border-emerald-400/30 ring-4 ring-emerald-500/20'
          )}
          aria-label="مساعد الذكاء الاصطناعي"
        >
          {/* Pulsing ambient glow */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 opacity-40 blur-sm group-hover:opacity-75 transition-opacity animate-pulse" />

          <div className="relative flex items-center justify-center size-8 rounded-full bg-white/20 backdrop-blur-sm shadow-inner">
            <Bot className="size-5 text-white animate-bounce group-hover:animate-none" />
            <Sparkles className="size-3 text-amber-300 absolute -top-1 -right-1 animate-spin" />
          </div>

          <div className="relative text-right hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold leading-tight">مساعد نور الذكي</span>
              <Badge className="bg-amber-400 text-stone-950 hover:bg-amber-300 text-[9px] font-extrabold px-1.5 py-0 rounded-full h-4">
                قريباً
              </Badge>
            </div>
            <p className="text-[10px] text-emerald-100/90 font-medium">باحث فقهي وإسلامي</p>
          </div>

          {/* Small badge for mobile */}
          <span className="relative sm:hidden text-[11px] font-bold">الذكاء الاصطناعي</span>
        </button>
      </div>

      {/* ─── Coming Soon Modal Dialog ────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-7 text-right animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Background Decorative Glow */}
            <div className="absolute top-0 right-0 size-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 size-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 left-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>

            {/* Modal Content */}
            <div className="space-y-5">
              {/* Icon Header */}
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white grid place-items-center shadow-lg shadow-emerald-900/20 border border-emerald-400/30">
                  <Bot className="size-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground font-serif">
                      المساعد الإسلامي الذكي (فقيه)
                    </h2>
                  </div>
                  <Badge variant="outline" className="mt-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-semibold">
                    ✨ ميزة قيد الإطلاق قريباً
                  </Badge>
                </div>
              </div>

              {/* Main Notice */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-sm leading-relaxed space-y-2">
                <p className="font-bold flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-500 shrink-0" />
                  <span>سيتم إضافة نموذج الذكاء الاصطناعي قريباً بإذن الله!</span>
                </p>
                <p className="text-xs text-muted-foreground leading-normal">
                  نعمل حالياً على دمج محرك البحث والاستدلال الفقهي المتقدم للإجابة عن أسئلتكم واستفساراتكم الشرعية بدقة وأمانة علمية تامة.
                </p>
              </div>

              {/* Upcoming Features List */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-foreground">أبرز ما سيقدمه المساعد الذكي:</p>
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>إجابات فقهية موثقة بالأدلة الصريحة من الكتاب والسنة وفتاوى كبار العلماء.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>التحقق الدقيق من صحة الأحاديث وتخريجها دون أي توليد عشوائي.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>ربط فوري ومباشر بمكتبة أمهات الكتب والتلاوات القرآنية في المنصة.</span>
                  </div>
                </div>
              </div>

              {/* Footer Button */}
              <div className="pt-2">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20"
                >
                  حسناً، بانتظار الإطلاق 🚀
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
