import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { RadioHubView } from '@/components/radio/RadioHubView';

export const metadata: Metadata = {
  title: 'الإذاعات الإسلامية المباشرة — تلاوات وقراءات 24/7 | منصة نور',
  description: 'استمع إلى أكثر من 150 إذاعة إسلامية وقرآنية تبث على مدار الساعة بأصوات مشاهير القراء وترجمات المعاني.',
  openGraph: {
    title: 'الإذاعات الإسلامية المباشرة — تلاوات وقراءات 24/7 | منصة نور',
    description: 'استمع إلى أكثر من 150 إذاعة إسلامية وقرآنية تبث على مدار الساعة بأصوات مشاهير القراء وترجمات المعاني.',
  },
};

export default function RadioPage() {
  return (
    <AppShell>
      <RadioHubView />
    </AppShell>
  );
}
