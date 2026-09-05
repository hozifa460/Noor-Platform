import type { Metadata } from 'next';
import { FatwaLibraryView } from '@/features/fatwa';

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
