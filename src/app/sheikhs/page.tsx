import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { SheikhsListView } from '@/components/sheikh/SheikhsListView';

export const metadata: Metadata = {
  title: 'موسوعة المشايخ والعلماء والقراء | منصة نور',
  description: 'دليل شامل لكبار قراء العالم الإسلامي وعلماء أهل السنة والجماعة ومكتباتهم الصوتية والمرئية.',
  openGraph: {
    title: 'موسوعة المشايخ والعلماء والقراء | منصة نور',
    description: 'دليل شامل لكبار قراء العالم الإسلامي وعلماء أهل السنة والجماعة ومكتباتهم الصوتية والمرئية.',
  },
};

export default function SheikhsPage() {
  return (
    <AppShell>
      <SheikhsListView />
    </AppShell>
  );
}
