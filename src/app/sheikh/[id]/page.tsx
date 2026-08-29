import type { Metadata } from 'next';
import { SheikhProfile } from '@/components/sheikh/SheikhProfile';
import { SHEIKH_META } from '@/lib/sheikh-meta';

interface SheikhPageProps {
  params: Promise<{ id: string }>;
}

// Pre-render every known sheikh ID at build time so static export
// (`output: 'export'`) has a real page for each one. New / unknown IDs
// can still be served client-side from the SheikhProfile component.
export function generateStaticParams() {
  return Object.keys(SHEIKH_META).map((id) => ({ id }));
}

export const metadata: Metadata = {
  title: 'المكتبة العلمية للشيخ | منصة نور',
  description: 'المكتبة الصوتية والمرئية الكاملة للشيخ مع الدروس والمحاضرات والسلاسل العلمية.',
};

export default async function SheikhPage({ params }: SheikhPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  return <SheikhProfile sheikhId={decodedId} />;
}
