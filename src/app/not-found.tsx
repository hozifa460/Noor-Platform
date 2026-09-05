'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  BookOpen,
  Scroll,
  Library,
  HelpCircle,
  Radio,
  Home,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const HUBS = [
  {
    title: 'القرآن الكريم',
    desc: 'المصحف الشريف بالقراءات وتلاوات كبار القراء',
    href: '/quran',
    icon: BookOpen,
    accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    title: 'الحديث النبوي',
    desc: 'أمهات كتب الحديث والسنن والتحقيق والتخريج',
    href: '/hadith',
    icon: Scroll,
    accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    title: 'المكتبة الإسلامية',
    desc: 'كتب التراث والمصادر الفقهية والعقدية والأدبية',
    href: '/books',
    icon: Library,
    accent: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
  },
  {
    title: 'الفتاوى الشرعية',
    desc: 'أكثر من 200,000 فتوى لكبار العلماء والمفتين',
    href: '/fatwa',
    icon: HelpCircle,
    accent: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    title: 'الإذاعات الإسلامية',
    desc: 'بث مباشر على مدار الساعة للقرآن والتلاوات النادرة',
    href: '/radio',
    icon: Radio,
    accent: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    title: 'الأذكار وحصن المسلم',
    desc: 'أذكار اليوم والليلة والأدعية المأثورة مع الاستماع الصوتي',
    href: '/adhkar',
    icon: Sparkles,
    accent: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
];

export default function NotFound() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <div
      className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="w-full max-w-3xl mx-auto text-center space-y-8">
        {/* Top Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-semibold shadow-xs">
          <Compass className="size-3.5" />
          <span>خطأ 404 • الصفحة غير موجودة</span>
        </div>

        {/* Large Decorative 404 Heading */}
        <div className="relative">
          <div className="text-7xl sm:text-9xl font-black tracking-widest text-primary/10 select-none">
            404
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground font-sans">
              لم نتمكن من العثور على الصفحة
            </h1>
          </div>
        </div>

        {/* Informative Subtitle */}
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          يبدو أن الرابط الذي طلبته غير متوفر أو تم نقله إلى موقع آخر. يمكنك البحث عن الموضوع أو الانتقال مباشرة إلى الأقسام الرئيسية للمنصة أدناه.
        </p>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto relative flex items-center">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في القرآن، الأحاديث، الكتب، الفتاوى..."
            className="pl-24 pr-11 h-12 rounded-xl bg-card border-border shadow-xs text-sm focus-visible:ring-primary/40 text-foreground"
          />
          <Search className="absolute right-3.5 size-4 text-muted-foreground pointer-events-none" />
          <Button
            type="submit"
            size="sm"
            className="absolute left-1.5 h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
          >
            بحث
          </Button>
        </form>

        {/* Quick Hub Navigation Cards */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400" />
              أقسام منصة نور الرئيسية
            </h2>
            <Link
              href="/"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              الصفحة الرئيسية
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-right">
            {HUBS.map((hub) => {
              const Icon = hub.icon;
              return (
                <Link
                  key={hub.href}
                  href={hub.href}
                  className="group relative flex items-start gap-3.5 p-4 rounded-xl bg-card hover:bg-muted/50 border border-border/70 hover:border-primary/40 shadow-xs hover:shadow-sm transition-all duration-200"
                >
                  <div
                    className={`size-10 shrink-0 rounded-lg flex items-center justify-center border ${hub.accent}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      <span>{hub.title}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {hub.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="pt-2">
          <Button asChild variant="outline" className="gap-2 px-6 rounded-xl">
            <Link href="/">
              <Home className="size-4" />
              العودة إلى الصفحة الرئيسية
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
