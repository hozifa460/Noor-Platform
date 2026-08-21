import type { Metadata } from 'next';
import { DownloadsView } from '@/components/library/DownloadsView';

export const metadata: Metadata = {
  title: 'المكتبة المحملة والأوفلاين | منصة نور',
  description: 'الكتب والتلاوات المحفوظة على جهازك للقراءة والاستماع بدون إنترنت.',
  openGraph: {
    title: 'المكتبة المحملة والأوفلاين | منصة نور',
    description: 'الكتب والتلاوات المحفوظة على جهازك للقراءة والاستماع بدون إنترنت.',
  },
};

export default function DownloadsPage() {
  return <DownloadsView />;
}
