'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';

const ViewComponent = dynamic(() => import('@/components/books/BooksLibraryView').then(m => m.BooksLibraryView), {
  ssr: false,
});

export default function BooksPage() {
  return (
    <AppShell>
      <ViewComponent />
    </AppShell>
  );
}
