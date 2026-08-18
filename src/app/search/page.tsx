import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { SearchView } from '@/components/search/SearchView';

export const metadata: Metadata = {
  title: 'البحث الشامل في العلوم الإسلامية | منصة نور',
  description: 'محرك بحث إسلامي فوري يبحث في آيات القرآن الكريم والأحاديث النبوية وكتب التراث والفتاوى.',
  openGraph: {
    title: 'البحث الشامل في العلوم الإسلامية | منصة نور',
    description: 'محرك بحث إسلامي فوري يبحث في آيات القرآن الكريم والأحاديث النبوية وكتب التراث والفتاوى.',
  },
};

export default function SearchPage() {
  return (
    <AppShell>
      <SearchView />
    </AppShell>
  );
}
