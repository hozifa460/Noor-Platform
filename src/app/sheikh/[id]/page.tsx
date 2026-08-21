import type { Metadata } from 'next';
import { SheikhProfile } from '@/components/sheikh/SheikhProfile';

interface SheikhPageProps {
  params: Promise<{ id: string }>;
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
