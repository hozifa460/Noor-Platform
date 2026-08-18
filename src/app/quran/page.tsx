import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { QuranHubView } from '@/components/quran/QuranHubView';

export const metadata: Metadata = {
  title: 'القرآن الكريم — تلاوات وتفاسير ومصاحف القراءات العشر | منصة نور',
  description: 'تصفح واستمع للقرآن الكريم كاملاً بأصوات كبار القراء وبروايات القراءات العشر المتواترة مع أمهات كتب التفسير.',
  openGraph: {
    title: 'القرآن الكريم — تلاوات وتفاسير ومصاحف القراءات العشر | منصة نور',
    description: 'تصفح واستمع للقرآن الكريم كاملاً بأصوات كبار القراء وبروايات القراءات العشر المتواترة مع أمهات كتب التفسير.',
  },
};

export default function QuranPage() {
  return (
    <AppShell>
      <QuranHubView />
    </AppShell>
  );
}
