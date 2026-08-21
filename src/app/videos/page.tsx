import type { Metadata } from 'next';
import { SectionView } from '@/components/library/SectionView';

export const metadata: Metadata = {
  title: 'الفيديوهات والمحاضرات المرئية | منصة نور',
  description: 'مكتبة مرئية شاملة للمحاضرات والدروس الإسلامية وسلاسل المشايخ الموثقة.',
};

export default function VideosPage() {
  return <SectionView section="videos" />;
}
