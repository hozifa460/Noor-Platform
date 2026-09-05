/**
 * Centralized TypeScript definitions for the Hadith & Sunnah domain.
 */

export * from '@/lib/hadith';
export * from '@/lib/hadith';

export interface NarratorScholarlyOpinion {
  scholar: string;
  opinion: string;
}

export interface NarratorProfile {
  id: string;
  name: string;
  fullName: string;
  kunya?: string;
  tabaqah: string; // الطبقة والجيل
  grade: string; // حكم الجرح والتعديل
  gradeType: 'sahabi' | 'thiqah' | 'saduq' | 'maqbul' | 'daif';
  death?: string; // سنة ومكان الوفاة
  residence?: string; // بلد الإقامة
  lineage?: string; // النسب والقبيلة
  briefBio: string; // نبذة موجزة
  teachers?: string[]; // أبرز الشيوخ
  students?: string[]; // أبرز التلاميذ
  scholarlyOpinions: NarratorScholarlyOpinion[];
}

export type IsnadNodeRole =
  | 'المصنف'
  | 'شيخ المصنف'
  | 'راوٍ'
  | 'التابعي'
  | 'الصحابي الجليل'
  | 'خاتم الأنبياء ﷺ';

export interface IsnadNode {
  order: number;
  role: IsnadNodeRole;
  name: string;
  phrase: string;
  isSahabi?: boolean;
}

export interface ParsedIsnad {
  hasSanad: boolean;
  nodes: IsnadNode[];
  sanadText: string;
  matnText: string;
  narratorCount: number;
  chainTypeArabic: string;
}

export interface GradeFilterOption {
  id: 'all' | 'muttafaqun' | 'sahih' | 'hasan' | 'daif' | 'mawdu';
  name: string;
  dotColor?: string;
  activeClass?: string;
}
