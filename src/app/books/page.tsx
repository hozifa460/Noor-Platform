import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { BooksLibraryView } from '@/components/books/BooksLibraryView';

export const metadata: Metadata = {
  title: 'المكتبة الإسلامية الرقمية — المكتبة الشاملة والمصاحف | منصة نور',
  description: 'أكبر مكتبة إسلامية رقمية تضم أكثر من 8,500 كتاب محقق وموافق للمطبوع في التفسير والحديث والفقه والعقيدة.',
  openGraph: {
    title: 'المكتبة الإسلامية الرقمية — المكتبة الشاملة والمصاحف | منصة نور',
    description: 'أكبر مكتبة إسلامية رقمية تضم أكثر من 8,500 كتاب محقق وموافق للمطبوع في التفسير والحديث والفقه والعقيدة.',
  },
};

export default function BooksPage() {
  return (
    <AppShell>
      <BooksLibraryView />
    </AppShell>
  );
}
