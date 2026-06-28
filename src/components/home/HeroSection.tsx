'use client';

import { Sparkles, BookOpen, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavStore } from '@/stores/nav.store';
import { useLibraryStore } from '@/stores/library.store';

export function HeroSection() {
  const setView = useNavStore((s) => s.setView);
  const sheikhCount = useLibraryStore((s) => s.sheikhs.size);
  const itemCount = useLibraryStore((s) => s.items.length);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-accent/8 to-transparent islamic-pattern p-6 sm:p-10 mb-8">
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium mb-4">
          <Sparkles className="size-3.5" />
          قاعدة بيانات موزعة على GitHub و GitLab
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight mb-3">
          منصة النور
          <span className="block text-primary text-xl sm:text-2xl mt-2 font-sans font-semibold">
            بث إسلامي احترافي من مستودعات لا مركزية
          </span>
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
          تُحمّل المنصة ملفات index.json تلقائيًا من مستودعات GitHub و GitLab، وتدمج كل المحتوى
          في قاعدة بيانات افتراضية موحدة. يتم اكتشاف المشايخ تلقائيًا من أسماء المجلدات،
          وتُبنى واجهة المستخدم ديناميكيًا من بنية JSON — دون أي تعديل في الكود.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={() => setView('sheikhs')} className="gap-2">
            <Users className="size-4" />
            تصفح المشايخ
          </Button>
          <Button size="lg" variant="outline" onClick={() => setView('live')} className="gap-2">
            <Radio className="size-4" />
            البث المباشر
          </Button>
          <Button size="lg" variant="outline" onClick={() => setView('books')} className="gap-2">
            <BookOpen className="size-4" />
            المكتبة
          </Button>
        </div>

        <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span>{sheikhCount} شيخ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-accent" />
            <span>{itemCount} عنصر وسائط</span>
          </div>
        </div>
      </div>
    </section>
  );
}
