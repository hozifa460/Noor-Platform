import type { Metadata } from 'next';
import { Suspense } from 'react';
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
    <Suspense fallback={<div className="p-12 text-center text-muted-foreground animate-pulse">جاري تحميل نتائج البحث...</div>}>
      <SearchView />
    </Suspense>
  );
}
