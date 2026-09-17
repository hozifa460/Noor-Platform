import { describe, it, expect } from 'vitest';
import {
  normalizeReciterWords,
  matchReciterNames,
  findMatchingVerseReciter,
  findMatchingFullSurahReciter,
} from '../domain/reciter-matching';
import { QURAN_RECITERS } from '../domain/data';
import type { RiwayahReciterEntry } from '../infrastructure';

describe('Reciter Matching & Normalization Suite', () => {
  it('normalizes titles, honorifics, diacritics, and alef variants', () => {
    const w1 = normalizeReciterWords('الشيخ عبد الباسط عبد الصمد (مرتل)');
    expect(w1).toEqual(['عبدالباسط', 'عبدالصمد']);

    const w2 = normalizeReciterWords('الشيخ مشاري راشد العفاسي');
    expect(w2).toEqual(['مشاري', 'راشد', 'العفاسي']);

    const w3 = normalizeReciterWords('الدكتور أحمد بن علي العجمي');
    expect(w3).toEqual(['احمد', 'بن', 'علي', 'العجمي']);
  });

  it('matches reciter names with high accuracy', () => {
    expect(matchReciterNames('الشيخ عبد الباسط عبد الصمد (مرتل)', 'عبدالباسط عبدالصمد')).toBe(true);
    expect(matchReciterNames('الشيخ مشاري راشد العفاسي', 'مشاري العفاسي')).toBe(true);
    expect(matchReciterNames('الشيخ محمد محمود الطبلاوي', 'محمد الطبلاوي')).toBe(true);
    expect(matchReciterNames('الشيخ محمود خليل الحصري (مرتل)', 'محمود خليل الحصري')).toBe(true);
    expect(matchReciterNames('الشيخ ماهر المعيقلي', 'ماهر المعيقلي')).toBe(true);
    expect(matchReciterNames('الشيخ عبد الرحمن السديس', 'عبدالرحمن السديس')).toBe(true);
    expect(matchReciterNames('الشيخ ماهر المعيقلي', 'سعد الغامدي')).toBe(false);
  });

  it('finds matching verse reciter from full surah reciter entry', () => {
    const fullSurahReciter: RiwayahReciterEntry = {
      reciterId: 1,
      reciterName: 'ماهر المعيقلي',
      moshafId: 1,
      moshafName: 'حفص عن عاصم - مرتل',
      server: 'https://server12.mp3quran.net/maher/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };

    const match = findMatchingVerseReciter(fullSurahReciter, QURAN_RECITERS);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('muaiqly');
    expect(match?.name).toBe('الشيخ ماهر المعيقلي');
  });

  it('finds matching full surah reciter from verse reciter', () => {
    const verseReciter = QURAN_RECITERS.find((r) => r.id === 'alafasy')!;
    const mockFullSurahList: RiwayahReciterEntry[] = [
      {
        reciterId: 10,
        reciterName: 'مشاري العفاسي',
        moshafId: 10,
        moshafName: 'حفص عن عاصم',
        server: 'https://server8.mp3quran.net/afs/',
        surahTotal: 114,
        surahList: [1, 2],
      },
      {
        reciterId: 11,
        reciterName: 'أكرم العلاقمي',
        moshafId: 11,
        moshafName: 'حفص عن عاصم',
        server: 'https://server9.mp3quran.net/akrm/',
        surahTotal: 114,
        surahList: [1, 2],
      },
    ];

    const match = findMatchingFullSurahReciter(verseReciter, mockFullSurahList);
    expect(match).not.toBeNull();
    expect(match?.reciterId).toBe(10);
    expect(match?.reciterName).toBe('مشاري العفاسي');
  });

  it('returns null when no matching reciter exists', () => {
    const fullSurahReciter: RiwayahReciterEntry = {
      reciterId: 99,
      reciterName: 'أكرم العلاقمي',
      moshafId: 99,
      moshafName: 'حفص عن عاصم',
      server: 'https://server9.mp3quran.net/akrm/',
      surahTotal: 114,
      surahList: [1],
    };

    const match = findMatchingVerseReciter(fullSurahReciter, QURAN_RECITERS);
    expect(match).toBeNull();
  });
});
