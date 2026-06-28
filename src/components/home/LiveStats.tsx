'use client';

import { useEffect, useState, useRef } from 'react';
import { Users, Video, Radio, BookOpen } from 'lucide-react';
import { useLibraryStore } from '@/stores/library.store';

/** Animated counter that counts up from 0 to target. Re-triggers when target changes. */
function useCountUp(target: number, duration = 1500): { count: number; ref: React.RefObject<HTMLDivElement | null> } {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const animatedTargetRef = useRef(-1);

  useEffect(() => {
    // Skip if target hasn't changed or is 0.
    if (target === 0 || target === animatedTargetRef.current) return;
    animatedTargetRef.current = target;

    const el = ref.current;
    if (!el) {
      // No ref yet — just animate immediately.
      const start = Date.now();
      const animate = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(target * eased));
        if (progress < 1) requestAnimationFrame(animate);
        else setCount(target);
      };
      requestAnimationFrame(animate);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const start = Date.now();
          const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(target);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

/** Formats a number with Arabic locale. */
function formatArabic(n: number): string {
  return n.toLocaleString('ar-EG');
}

export function LiveStats() {
  const items = useLibraryStore((s) => s.items);
  const sheikhs = useLibraryStore((s) => s.sheikhsArray);

  const itemCount = items.length;
  const sheikhCount = sheikhs.length;
  const videoCount = items.filter((i) => i.section === 'videos' || i.section === 'shorts').length;

  const { count: animItems, ref: itemsRef } = useCountUp(itemCount);
  const { count: animSheikhs, ref: sheikhsRef } = useCountUp(sheikhCount);
  const { count: animVideos, ref: videosRef } = useCountUp(videoCount);

  if (itemCount === 0) return null;

  const stats = [
    {
      icon: Users,
      label: 'مشايخ',
      value: animSheikhs,
      ref: sheikhsRef,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Video,
      label: 'فيديوهات وشورتس',
      value: animVideos,
      ref: videosRef,
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: BookOpen,
      label: 'إجمالي المحتوى',
      value: animItems,
      ref: itemsRef,
      color: 'from-rose-500 to-pink-600',
    },
  ];

  return (
    <section className="mb-8">
      <div className="grid grid-cols-3 gap-3 sm:gap-4" dir="ltr">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              ref={stat.ref}
              className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 overflow-hidden group hover:border-primary/30 transition-colors"
            >
              <div className={`absolute -top-6 -right-6 size-20 rounded-full bg-gradient-to-br ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className="relative flex items-center gap-3">
                <div className={`size-10 sm:size-12 rounded-xl bg-gradient-to-br ${stat.color} grid place-items-center shrink-0 shadow-lg`}>
                  <Icon className="size-5 sm:size-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-lg sm:text-2xl tabular-nums" dir="rtl">
                    {formatArabic(stat.value)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate" dir="rtl">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
