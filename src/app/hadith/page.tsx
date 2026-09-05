import type { Metadata } from 'next';
import { HadithHubView } from '@/features/hadith';

export const metadata: Metadata = {
  title: 'الموسوعة الحديثية الشاملة — كتب السنة وشروحها | منصة نور',
  description: 'بحث متقدم وتخريج فوري لأحاديث النبي ﷺ من كتب الصحاح والسنن والمسانيد مع بيان الأحكام والشروح المعتمدة.',
  openGraph: {
    title: 'الموسوعة الحديثية الشاملة — كتب السنة وشروحها | منصة نور',
    description: 'بحث متقدم وتخريج فوري لأحاديث النبي ﷺ من كتب الصحاح والسنن والمسانيد مع بيان الأحكام والشروح المعتمدة.',
  },
};

export default function HadithPage() {
  return <HadithHubView />;
}
