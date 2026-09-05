import type { Metadata } from 'next';
import { AdhkarHubView } from '@/features/adhkar';

export const metadata: Metadata = {
  title: 'الأذكار وحصن المسلم — أذكار اليوم والليلة والتسجيلات الصوتية | منصة نور',
  description: 'موسوعة أذكار حصن المسلم النبوية الصحيحة والمشكولة بالكامل مع التلاوات الصوتية النقية والسبحة الإلكترونية التفاعلية.',
  openGraph: {
    title: 'الأذكار وحصن المسلم — أذكار اليوم والليلة والتسجيلات الصوتية | منصة نور',
    description: 'موسوعة أذكار حصن المسلم النبوية الصحيحة والمشكولة بالكامل مع التلاوات الصوتية النقية والسبحة الإلكترونية التفاعلية.',
  },
};

export default function AdhkarPage() {
  return <AdhkarHubView />;
}
