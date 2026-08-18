import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { HistoryView } from '@/components/library/HistoryView';

export const metadata: Metadata = {
  title: 'سجل المشاهدة والاستماع | منصة نور',
  description: 'سجل التلاوات والمحاضرات والكتب التي تصفحتها مؤخراً.',
  openGraph: {
    title: 'سجل المشاهدة والاستماع | منصة نور',
    description: 'سجل التلاوات والمحاضرات والكتب التي تصفحتها مؤخراً.',
  },
};

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryView />
    </AppShell>
  );
}
