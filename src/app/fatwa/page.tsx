import type { Metadata } from 'next';
import { FatwaLibraryView } from '@/components/fatwa/FatwaLibraryView';

export const metadata: Metadata = {
  title: 'موسوعة الفتاوى الشرعية — فتاوى كبار العلماء | منصة نور',
  description: 'موسوعة الفتاوى الإسلامية الموثقة لكبار أئمة الإسلام والعلماء المعاصرين مصنفة ومفهرسة بدقة عالية.',
  openGraph: {
    title: 'موسوعة الفتاوى الشرعية — فتاوى كبار العلماء | منصة نور',
    description: 'موسوعة الفتاوى الإسلامية الموثقة لكبار أئمة الإسلام والعلماء المعاصرين مصنفة ومفهرسة بدقة عالية.',
  },
};

export default function FatwaPage() {
  return <FatwaLibraryView />;
}
