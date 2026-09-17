import type { ReciterMeta } from './types';

/**
 * Verified, deterministic catalog mapping linking EveryAyah verse reciters
 * with MP3Quran full surah reciters and moshaf IDs.
 *
 * Rejects ambiguous/heuristic name matching completely.
 */
export interface VerifiedReciterMapping {
  verseId: string;
  mp3QuranReciterId: number;
  mp3QuranMoshafIds?: readonly number[];
  notes?: string;
}

export const VERIFIED_RECITER_MAPPINGS: readonly VerifiedReciterMapping[] = [
  // Hafs reciters
  // Minshawi: Murattal has 2 recordings in MP3Quran (112 and historical 10924).
  // Note: Minshawi Mujawwad has NO counterpart in MP3Quran Hafs.
  { verseId: 'minshawi_murattal', mp3QuranReciterId: 112, mp3QuranMoshafIds: [112, 10924], notes: 'محمد صديق المنشاوي (مرتل)' },
  { verseId: 'husary_murattal', mp3QuranReciterId: 118, mp3QuranMoshafIds: [118], notes: 'محمود خليل الحصري (مرتل)' },
  { verseId: 'abdulbasit_murattal', mp3QuranReciterId: 51, mp3QuranMoshafIds: [53], notes: 'عبد الباسط عبد الصمد (مرتل)' },
  { verseId: 'alafasy', mp3QuranReciterId: 123, mp3QuranMoshafIds: [123], notes: 'مشاري العفاسي' },
  { verseId: 'muaiqly', mp3QuranReciterId: 102, mp3QuranMoshafIds: [102], notes: 'ماهر المعيقلي' },
  { verseId: 'dossari', mp3QuranReciterId: 92, mp3QuranMoshafIds: [92], notes: 'ياسر الدوسري' },
  { verseId: 'sudais', mp3QuranReciterId: 54, mp3QuranMoshafIds: [54], notes: 'عبدالرحمن السديس' },
  { verseId: 'shuraim', mp3QuranReciterId: 31, mp3QuranMoshafIds: [31], notes: 'سعود الشريم' },
  { verseId: 'ghamadi', mp3QuranReciterId: 30, mp3QuranMoshafIds: [30], notes: 'سعد الغامدي' },
  { verseId: 'hudhaify', mp3QuranReciterId: 74, mp3QuranMoshafIds: [74], notes: 'علي بن عبدالرحمن الحذيفي' },
  { verseId: 'ajamy', mp3QuranReciterId: 5, mp3QuranMoshafIds: [5], notes: 'أحمد بن علي العجمي' },
  { verseId: 'qatami', mp3QuranReciterId: 86, mp3QuranMoshafIds: [86], notes: 'ناصر القطامي' },
  { verseId: 'abbad', mp3QuranReciterId: 81, mp3QuranMoshafIds: [81], notes: 'فارس عباد' },
  { verseId: 'budair', mp3QuranReciterId: 43, mp3QuranMoshafIds: [43], notes: 'صلاح البدير' },
  { verseId: 'tablawi', mp3QuranReciterId: 106, mp3QuranMoshafIds: [106], notes: 'محمد الطبلاوي' },
  { verseId: 'banna', mp3QuranReciterId: 121, mp3QuranMoshafIds: [121], notes: 'محمود علي البنا' },
  // Muhammad Ayyoub: has 2 recordings in MP3Quran (moshaf 109: مرتل, moshaf 320: تلاوة مميزة)
  { verseId: 'ayyoub', mp3QuranReciterId: 109, mp3QuranMoshafIds: [109, 320], notes: 'محمد أيوب - تسجيلان: مرتل (109) ومميز (320)' },
  { verseId: 'neana', mp3QuranReciterId: 9, mp3QuranMoshafIds: [9], notes: 'أحمد نعينع' },
  { verseId: 'rifai', mp3QuranReciterId: 89, mp3QuranMoshafIds: [89], notes: 'هاني الرفاعي' },
  { verseId: 'basfar', mp3QuranReciterId: 60, mp3QuranMoshafIds: [60], notes: 'عبدالله بصفر' },
  { verseId: 'qasim', mp3QuranReciterId: 67, mp3QuranMoshafIds: [67], notes: 'عبدالمحسن القاسم' },
  { verseId: 'ali_jaber', mp3QuranReciterId: 76, mp3QuranMoshafIds: [76], notes: 'علي جابر' },
  { verseId: 'qahtani', mp3QuranReciterId: 21, mp3QuranMoshafIds: [21], notes: 'خالد القحطاني' },
  { verseId: 'sahl_yassin', mp3QuranReciterId: 32, mp3QuranMoshafIds: [32], notes: 'سهل ياسين' },
  { verseId: 'suesy', mp3QuranReciterId: 77, mp3QuranMoshafIds: [77], notes: 'علي حجاج السويسي' },

  // Warsh reciters
  { verseId: 'warsh_abdulbasit', mp3QuranReciterId: 51, mp3QuranMoshafIds: [52], notes: 'عبد الباسط (ورش)' },
  { verseId: 'warsh_aldosary', mp3QuranReciterId: 178, mp3QuranMoshafIds: [178], notes: 'إبراهيم الدوسري (ورش)' },
  { verseId: 'warsh_yassin', mp3QuranReciterId: 14, mp3QuranMoshafIds: [14], notes: 'القارئ ياسين (ورش)' },
] as const;

/**
 * Finds a matching verse-by-verse reciter for a given full surah reciter
 * strictly using documented catalog IDs.
 *
 * Rejects heuristic guessing; returns null if no counterpart exists.
 */
export function findMatchingVerseReciter<
  T extends { reciterId?: number; moshafId?: number; reciterName?: string }
>(
  fullSurahReciter: T | null | undefined,
  verseReciters: ReciterMeta[]
): ReciterMeta | null {
  if (!fullSurahReciter || typeof fullSurahReciter.reciterId !== 'number' || !Array.isArray(verseReciters)) {
    return null;
  }

  const mapping = VERIFIED_RECITER_MAPPINGS.find((m) => {
    if (m.mp3QuranReciterId !== fullSurahReciter.reciterId) return false;
    if (m.mp3QuranMoshafIds && typeof fullSurahReciter.moshafId === 'number') {
      return m.mp3QuranMoshafIds.includes(fullSurahReciter.moshafId);
    }
    return true;
  });

  if (!mapping) return null;

  return verseReciters.find((vr) => vr.id === mapping.verseId) || null;
}

/**
 * Finds a matching full surah reciter for a given verse-by-verse reciter
 * strictly using documented catalog IDs.
 *
 * Rejects heuristic guessing; returns null if no counterpart exists
 * (e.g. minshawi_mujawwad, abdulbasit_mujawwad, husary_muallim).
 */
export function findMatchingFullSurahReciter<
  T extends { reciterId?: number; moshafId?: number; reciterName?: string }
>(
  verseReciter: ReciterMeta | null | undefined,
  fullSurahReciters: T[]
): T | null {
  if (!verseReciter || !verseReciter.id || !Array.isArray(fullSurahReciters)) {
    return null;
  }

  const mapping = VERIFIED_RECITER_MAPPINGS.find((m) => m.verseId === verseReciter.id);
  if (!mapping) return null;

  return (
    fullSurahReciters.find((fs) => {
      if (fs.reciterId !== mapping.mp3QuranReciterId) return false;
      if (mapping.mp3QuranMoshafIds && typeof fs.moshafId === 'number') {
        return mapping.mp3QuranMoshafIds.includes(fs.moshafId);
      }
      return true;
    }) || null
  );
}

/**
 * Provides clear UI explanation and status for a reciter's availability across modes.
 */
export function getReciterSyncStatus(
  reciter: { id?: string; reciterId?: number; moshafId?: number },
  mode: 'verse' | 'surah'
): {
  isSynchronizable: boolean;
  badgeText: string;
  explanation: string;
} {
  if (mode === 'verse') {
    const isMapped = VERIFIED_RECITER_MAPPINGS.some((m) => m.verseId === reciter.id);
    return isMapped
      ? {
          isSynchronizable: true,
          badgeText: 'متزامن مع السور ✓',
          explanation: 'يتوفر لهذا القارئ تسجيل سورة كاملة وتلاوة آية بآية متزامنة',
        }
      : {
          isSynchronizable: false,
          badgeText: 'آية بآية فقط',
          explanation: 'تسجيل آية بآية فقط (لا يوجد له تسجيل سورة كاملة مطابق)',
        };
  }

  const isMapped = VERIFIED_RECITER_MAPPINGS.some((m) => {
    if (m.mp3QuranReciterId !== reciter.reciterId) return false;
    if (m.mp3QuranMoshafIds && typeof reciter.moshafId === 'number') {
      return m.mp3QuranMoshafIds.includes(reciter.moshafId);
    }
    return true;
  });

  return isMapped
    ? {
        isSynchronizable: true,
        badgeText: 'متزامن مع الآيات ✓',
        explanation: 'يتوفر لهذا القارئ تسجيل سورة كاملة وتلاوة آية بآية متزامنة',
      }
    : {
        isSynchronizable: false,
        badgeText: 'سورة كاملة فقط',
        explanation: 'تسجيل سور كاملة فقط (لا تتوفر له تلاوة مقطعة آية بآية)',
      };
}
