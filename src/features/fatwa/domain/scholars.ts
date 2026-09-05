import { normalizeArabic } from '@/lib/arabic';
import type { FatwaScholar } from './types';

export const SCHOLARS_LIST: FatwaScholar[] = [
  { id: 'all', name: 'كافة العلماء', query: '' },
  { id: 'binbaz', name: 'الشيخ ابن باز', query: 'باز' },
  { id: 'othaymeen', name: 'الشيخ ابن عثيمين', query: 'عثيمين' },
  { id: 'fawzan', name: 'الشيخ صالح الفوزان', query: 'فوزان' },
  { id: 'islamqa', name: 'الإسلام سؤال وجواب', query: 'المنجد' },
  { id: 'dar_ifta', name: 'دور الإفتاء الرسمية', query: 'افتاء' },
];

/**
 * Resolves a scholar filter id to the normalized substring matched against
 * fatwa scholar names. Returns '' for 'all' (no filtering) and for unknown
 * ids — never falls back to the display name of an "all"-style pseudo-scholar,
 * which used to filter out every single fatwa.
 */
export function scholarFilterQuery(scholarId: string): string {
  if (!scholarId || scholarId === 'all') return '';
  const info = SCHOLARS_LIST.find((s) => s.id === scholarId);
  const q = info?.query || info?.name || scholarId;
  // Guard: any list entry without a real query is a display-only pseudo filter
  if (!info?.query) return '';
  return normalizeArabic(q);
}
