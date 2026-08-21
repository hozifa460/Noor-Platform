import Link from 'next/link';
import { Sparkles, BookOpen, Radio, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/library.store';

export function HeroSection() {
  const sheikhCount = useLibraryStore((s) => s.sheikhs.size);
  const itemCount = useLibraryStore((s) => s.items.length);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-accent/8 to-transparent islamic-pattern p-6 sm:p-10 mb-8">
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium mb-4">
          <Sparkles className="size-3.5" />
          الموسوعة الإسلامية الشاملة
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight mb-3">
          منصة نور
          <span className="block text-primary text-xl sm:text-2xl mt-2 font-sans font-semibold">
            موسوعة القرآن والحديث والفتاوى والتراث
          </span>
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
          منصة إسلامية رائدة تجمع القرآن الكريم بالقراءات العشر، وأمهات كتب الحديث والتفاسير والفقه،
          وموسوعة الفتاوى الشرعية، والإذاعات الإسلامية المباشرة بجودة عالية ودقة متناهية.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/sheikhs">
              <Users className="size-4" />
              تصفح المشايخ
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/live">
              <Radio className="size-4" />
              البث المباشر
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/books">
              <BookOpen className="size-4" />
              المكتبة
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <span>{sheikhCount > 0 ? sheikhCount : 18} شيخ وقارئ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-accent" />
            <span>{itemCount > 0 ? itemCount : 8500} مادة علمية ومصنف</span>
          </div>
        </div>
      </div>
    </section>
  );
}
