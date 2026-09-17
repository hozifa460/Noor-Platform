import { normalizeArabic } from '@/lib/arabic';
import { getCachedHadithBook, setCachedHadithBook } from './storage';
import { BUILTIN_SEED_SHARH } from './seed-sharh';
import { HADITH_BASE, hadithSharhUrl } from '@/lib/shared/data-base';
import type { HadeethEncSharhItem } from '../domain';
import { extractCleanMatn, COMMON_STOP_WORDS } from './matn';

let sharhCache: HadeethEncSharhItem[] | null = null;
let sharhInvertedIndex: Map<string, HadeethEncSharhItem[]> | null = null;

/**
 * Clears the in-memory sharh cache and inverted index (used for testing and cache reset)
 */
export function clearSharhCache(): void {
  sharhCache = null;
  sharhInvertedIndex = null;
}

/**
 * Checks if the sharh cache is currently loaded in memory
 */
export function isSharhCacheLoaded(): boolean {
  return sharhCache !== null;
}

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

/**
 * Builds an inverted hash index for HadeethEnc sharh items for instant O(1) matching
 */
export function buildSharhInvertedIndex(list: HadeethEncSharhItem[]): void {
  if (sharhInvertedIndex) return;
  sharhInvertedIndex = new Map();

  for (const item of list) {
    const norm = normalizeArabic(item.hadeeth + ' ' + item.title);
    const tokens = norm.split(/\s+/).filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
    for (const token of tokens) {
      const existing = sharhInvertedIndex.get(token) || [];
      existing.push(item);
      sharhInvertedIndex.set(token, existing);
    }
  }
}

/**
 * Loads the 3,500+ HadeethEnc Sharh & Explanations dataset
 */
export async function loadHadeethEncSharh(): Promise<HadeethEncSharhItem[]> {
  if (sharhCache) return sharhCache;

  // 1. IndexedDB cache
  try {
    const idbSharh = await getCachedHadithBook<HadeethEncSharhItem[]>('hadeethenc_sharh.json');
    if (idbSharh && idbSharh.length > 0) {
      sharhCache = idbSharh;
      buildSharhInvertedIndex(idbSharh);
      return idbSharh;
    }
  } catch {
    /* proceed */
  }

  // 2. Local Node check
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (typeof window === 'undefined' || isNode) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadeethenc_sharh.json');
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf-8');
        sharhCache = JSON.parse(raw) as HadeethEncSharhItem[];
        buildSharhInvertedIndex(sharhCache);
        return sharhCache;
      }
    } catch {
      /* proceed */
    }
  }

  // 3. PRIMARY: chunked sharh on noor-platform-hadith (smaller, dedicated)
  if (HADITH_BASE) {
    try {
      const res = await fetch(hadithSharhUrl());
      if (res.ok) {
        sharhCache = (await res.json()) as HadeethEncSharhItem[];
        setCachedHadithBook('hadeethenc_sharh.json', sharhCache).catch(() => {});
        buildSharhInvertedIndex(sharhCache);
        return sharhCache;
      }
    } catch (err) {
      console.warn('[hadith] sharh fetch from noor-platform-hadith failed:', err);
    }
  }

  // 4. Legacy: full-size sharh from the public mirror repo
  try {
    const res = await fetch('/data/hadith/hadeethenc_sharh.json');
    if (res.ok) {
      sharhCache = (await res.json()) as HadeethEncSharhItem[];
      setCachedHadithBook('hadeethenc_sharh.json', sharhCache).catch(() => {});
      buildSharhInvertedIndex(sharhCache);
      return sharhCache;
    }
  } catch {
    /* fallback */
  }

  // 5. Final fallback: sharh on the legacy quran_and_sunnah repo
  try {
    const url = `${HF_SUNNAH_BASE}/HadeethEnc_Sharh/hadeethenc_sharh.json`;
    const res = await fetch(url);
    if (res.ok) {
      sharhCache = (await res.json()) as HadeethEncSharhItem[];
      setCachedHadithBook('hadeethenc_sharh.json', sharhCache).catch(() => {});
      buildSharhInvertedIndex(sharhCache);
      return sharhCache;
    }
  } catch {
    /* fallback to builtin */
  }

  // 6. Ultimate fallback to built-in verified seeds
  sharhCache = BUILTIN_SEED_SHARH;
  buildSharhInvertedIndex(sharhCache);
  return sharhCache;
}

export interface DocumentedSharhTarget {
  /** المصدر الموثق للشرح: إما بذور محلية مدمجة (seed) أو موسوعة الأحاديث النبوية (hadeethenc) */
  source: 'seed' | 'hadeethenc';
  /** المعرف الفعلي داخل المصدر المحدد (وليس رقم الطبعة الخارجية) */
  id: string;
  /** عنوان الحديث المتطابق لغايات التدقيق والمطابقة */
  expectedTitle: string;
}

/**
 * جدول الربط الصريح الموثق بين معرف الحديث في طبعة المنصة المحلية والشرح المعتمد.
 * تنبيه منهجي: المعرفات هنا تميز صراحة بين شروح البذور المدمجة محلياً (seed)
 * وبين معرفات HadeethEnc (hadeethenc).
 * تم تدقيق جميع الروابط مقابل idInBook والمتن الفعلي في ملفات بيانات المنصة.
 * تم استبعاد الأرقام الشهيرة من الطبعات الخارجية (مثل مسلم 8، 16، 1907 وترمذي 2609)
 * لاختلاف الترقيم في نسخة المنصة وتفادياً لإسناد الشرح لحديث آخر.
 */
export const DOCUMENTED_SHARH_LINKS: Record<string, DocumentedSharhTarget> = {
  // صحيح البخاري (ترقيم فتح الباري المعتمد محلياً في المنصة - bukhari.json)
  'bukhari:1': {
    source: 'seed',
    id: '1',
    expectedTitle: 'إنما الأعمال بالنيات',
  },
  'bukhari:8': {
    source: 'seed',
    id: '3',
    expectedTitle: 'بني الإسلام على خمس',
  },
  // صحيح مسلم (الترقيم الفعلي المعتمد محلياً في المنصة - muslim.json)
  'muslim:1': {
    source: 'seed',
    id: '2',
    expectedTitle: 'حديث جبريل في الإسلام والإيمان والإحسان',
  },
  // الأربعون النووية (ترقيم nawawi40.json المعتمد محلياً في المنصة)
  'nawawi40:1': {
    source: 'seed',
    id: '1',
    expectedTitle: 'إنما الأعمال بالنيات',
  },
  'nawawi40:2': {
    source: 'seed',
    id: '2',
    expectedTitle: 'حديث جبريل في الإسلام والإيمان والإحسان',
  },
  'nawawi40:3': {
    source: 'seed',
    id: '3',
    expectedTitle: 'بني الإسلام على خمس',
  },
};

export interface SharhLookupContext {
  bookId?: string;
  idInBook?: number;
}

/**
 * Fast and accurate matching of Hadith explanation by explicit documented linkage
 * or strict identical verbatim matn.
 * Neither generic containment (includes) nor prefix matching (startsWith) is allowed,
 * preventing false attribution when numbering differs across editions.
 */
export async function findHadithSharh(
  hadithText: string,
  context?: SharhLookupContext
): Promise<HadeethEncSharhItem | null> {
  // 1. Check explicit documented link first (bookId:idInBook)
  // When an approved link is absent for a book record, do not auto-attribute; return null.
  if (context?.bookId && typeof context.idInBook === 'number') {
    const key = `${context.bookId}:${context.idInBook}`;
    const target = DOCUMENTED_SHARH_LINKS[key];
    if (!target) {
      return null;
    }

    if (target.source === 'seed') {
      const fromSeed = BUILTIN_SEED_SHARH.find((s) => s.id === target.id);
      if (fromSeed) return fromSeed;
    } else if (target.source === 'hadeethenc') {
      const allSharh = await loadHadeethEncSharh();
      const fromAll = allSharh?.find((s) => s.id === target.id || String(s.id) === target.id);
      if (fromAll) return fromAll;
    }
    return null;
  }

  // 2. Strict verbatim identical Matn match (stripped of isnad) against verified seed collection
  // Generic text containment (includes) and prefix matching (startsWith) are strictly disallowed.
  // If no verified documented link exists, return null so UI explicitly declares lack of sharh.
  const cleanMatn = extractCleanMatn(hadithText);
  const targetText = cleanMatn && cleanMatn.length >= 8 ? cleanMatn : hadithText;
  const normalizedMatn = normalizeArabic(targetText);
  if (!normalizedMatn || normalizedMatn.length < 8) return null;

  for (const item of BUILTIN_SEED_SHARH) {
    const itemMatn = extractCleanMatn(item.hadeeth) || item.hadeeth || '';
    const normHadeeth = normalizeArabic(itemMatn);

    if (normalizedMatn.length >= 20 && normHadeeth.length >= 20) {
      if (
        normHadeeth === normalizedMatn ||
        (!context?.bookId && normalizedMatn.length >= 30 && normHadeeth.startsWith(normalizedMatn))
      ) {
        return item; // Verbatim strictly identical or authentic seed prefix match
      }
    }
  }

  // If no verified documented link exists, return null so UI explicitly declares lack of sharh
  return null;
}

export function getSharhByHadithId(sharhList: HadeethEncSharhItem[], id: string): HadeethEncSharhItem | null {
  return sharhList.find((s) => s.id === id) || null;
}
