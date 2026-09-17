import { describe, it, expect } from 'vitest';
import {
  findMatchingVerseReciter,
  findMatchingFullSurahReciter,
  getReciterSyncStatus,
  VERIFIED_RECITER_MAPPINGS,
} from '../domain/reciter-matching';
import { QURAN_RECITERS, WARSH_AYAH_RECITERS } from '../domain/data';
import type { RiwayahReciterEntry } from '../infrastructure';

describe('Quran Reciter Verified Catalog ID Mapping & Cross-Sync Suite', () => {
  it('strictly maps reciters using verified catalog IDs (e.g. Alafasy, Muaiqly)', () => {
    const muaiqlyFullSurah: RiwayahReciterEntry = {
      reciterId: 102,
      reciterName: 'ماهر المعيقلي',
      moshafId: 102,
      moshafName: 'حفص عن عاصم - مرتل',
      server: 'https://server12.mp3quran.net/maher/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };

    const verseMatch = findMatchingVerseReciter(muaiqlyFullSurah, QURAN_RECITERS);
    expect(verseMatch).not.toBeNull();
    expect(verseMatch?.id).toBe('muaiqly');
    expect(verseMatch?.name).toBe('الشيخ ماهر المعيقلي');

    const alafasyVerse = QURAN_RECITERS.find((r) => r.id === 'alafasy')!;
    const mockFullSurahList: RiwayahReciterEntry[] = [
      {
        reciterId: 123,
        reciterName: 'مشاري العفاسي',
        moshafId: 123,
        moshafName: 'حفص عن عاصم',
        server: 'https://server8.mp3quran.net/afs/',
        surahTotal: 114,
        surahList: [1, 2],
      },
    ];

    const surahMatch = findMatchingFullSurahReciter(alafasyVerse, mockFullSurahList);
    expect(surahMatch).not.toBeNull();
    expect(surahMatch?.reciterId).toBe(123);
    expect(surahMatch?.reciterName).toBe('مشاري العفاسي');
  });

  it('supports reciters with multiple recordings (Muhammad Ayyoub moshafs 109 and 320)', () => {
    const ayyoubVerse = QURAN_RECITERS.find((r) => r.id === 'ayyoub');
    expect(ayyoubVerse).toBeDefined();

    // Moshaf 109 (Murattal)
    const ayyoubMurattal: RiwayahReciterEntry = {
      reciterId: 109,
      reciterName: 'محمد أيوب',
      moshafId: 109,
      moshafName: 'حفص عن عاصم - مرتل',
      server: 'https://server8.mp3quran.net/ayyub/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };
    const matchMurattal = findMatchingVerseReciter(ayyoubMurattal, QURAN_RECITERS);
    expect(matchMurattal?.id).toBe('ayyoub');

    // Moshaf 320 (Special Recitation)
    const ayyoubSpecial: RiwayahReciterEntry = {
      reciterId: 109,
      reciterName: 'محمد أيوب',
      moshafId: 320,
      moshafName: 'حفص عن عاصم - تلاوة مميزة',
      server: 'https://server8.mp3quran.net/ayyub_special/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };
    const matchSpecial = findMatchingVerseReciter(ayyoubSpecial, QURAN_RECITERS);
    expect(matchSpecial?.id).toBe('ayyoub');

    // Reverse lookup: finding full surah entry for ayyoub
    const mockAyyoubSurahs: RiwayahReciterEntry[] = [ayyoubMurattal, ayyoubSpecial];
    const fullSurahMatch = findMatchingFullSurahReciter(ayyoubVerse!, mockAyyoubSurahs);
    expect(fullSurahMatch).not.toBeNull();
    expect(fullSurahMatch?.reciterId).toBe(109);
  });

  it('supports reciters with multiple recordings (Minshawi Murattal moshafs 112 and 10924)', () => {
    const minshawiMurattalVerse = QURAN_RECITERS.find((r) => r.id === 'minshawi_murattal')!;

    const minshawiFullSurah1: RiwayahReciterEntry = {
      reciterId: 112,
      reciterName: 'محمد صديق المنشاوي',
      moshafId: 112,
      moshafName: 'حفص عن عاصم - مرتل',
      server: 'https://server10.mp3quran.net/minsh/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };
    expect(findMatchingVerseReciter(minshawiFullSurah1, QURAN_RECITERS)?.id).toBe('minshawi_murattal');

    const minshawiFullSurah2: RiwayahReciterEntry = {
      reciterId: 112,
      reciterName: 'محمد صديق المنشاوي',
      moshafId: 10924,
      moshafName: 'حفص عن عاصم - تسجيل قديم',
      server: 'https://server10.mp3quran.net/minsh_old/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };
    expect(findMatchingVerseReciter(minshawiFullSurah2, QURAN_RECITERS)?.id).toBe('minshawi_murattal');

    const reverseMatch = findMatchingFullSurahReciter(minshawiMurattalVerse, [minshawiFullSurah1]);
    expect(reverseMatch?.reciterId).toBe(112);
  });

  it('rejects unmapped reciters with no counterpart in the other mode (Akram Al-Alaqmi, Majid Al-Anzi)', () => {
    // Akram Al-Alaqmi (MP3Quran reciterId: 10) - no segmented verse audio in EveryAyah
    const akramFullSurah: RiwayahReciterEntry = {
      reciterId: 10,
      reciterName: 'أكرم العلاقمي',
      moshafId: 10,
      moshafName: 'حفص عن عاصم',
      server: 'https://server9.mp3quran.net/akrm/',
      surahTotal: 114,
      surahList: [1, 2],
    };
    expect(findMatchingVerseReciter(akramFullSurah, QURAN_RECITERS)).toBeNull();

    // Majid Al-Anzi (MP3Quran reciterId: 100) - no segmented verse audio in EveryAyah
    const majidFullSurah: RiwayahReciterEntry = {
      reciterId: 100,
      reciterName: 'ماجد العنزي',
      moshafId: 100,
      moshafName: 'حفص عن عاصم',
      server: 'https://server9.mp3quran.net/majed/',
      surahTotal: 113,
      surahList: [1, 3, 4],
    };
    expect(findMatchingVerseReciter(majidFullSurah, QURAN_RECITERS)).toBeNull();
  });

  it('rejects EveryAyah reciters with no counterpart in MP3Quran (Minshawi Mujawwad, Abdulbasit Mujawwad, Husary Muallim)', () => {
    const minshawiMujawwad = QURAN_RECITERS.find((r) => r.id === 'minshawi_mujawwad');
    expect(minshawiMujawwad).toBeDefined();

    const mockSurahReciters: RiwayahReciterEntry[] = [
      {
        reciterId: 112,
        reciterName: 'محمد صديق المنشاوي',
        moshafId: 112,
        moshafName: 'حفص عن عاصم - مرتل',
        server: 'https://server10.mp3quran.net/minsh/',
        surahTotal: 114,
        surahList: [1, 2],
      },
    ];

    // Must NOT match Minshawi Murattal (112) because mujawwad is a distinct recitation style
    expect(findMatchingFullSurahReciter(minshawiMujawwad!, mockSurahReciters)).toBeNull();

    const abdulbasitMujawwad = QURAN_RECITERS.find((r) => r.id === 'abdulbasit_mujawwad');
    expect(abdulbasitMujawwad).toBeDefined();
    expect(findMatchingFullSurahReciter(abdulbasitMujawwad!, mockSurahReciters)).toBeNull();

    const husaryMuallim = QURAN_RECITERS.find((r) => r.id === 'husary_muallim');
    expect(husaryMuallim).toBeDefined();
    expect(findMatchingFullSurahReciter(husaryMuallim!, mockSurahReciters)).toBeNull();
  });

  it('rejects ambiguous or heuristic string matching when IDs are absent or mismatched', () => {
    // Object with matching name string but wrong reciterId
    const impostorReciter = {
      reciterId: 9999,
      reciterName: 'مشاري العفاسي',
      moshafId: 9999,
      moshafName: 'حفص عن عاصم',
    };
    expect(findMatchingVerseReciter(impostorReciter, QURAN_RECITERS)).toBeNull();

    // Object with missing reciterId
    const incompleteReciter = {
      reciterName: 'ماهر المعيقلي',
    };
    expect(findMatchingVerseReciter(incompleteReciter, QURAN_RECITERS)).toBeNull();
  });

  it('provides clear sync status badges and explanations via getReciterSyncStatus', () => {
    // Synchronizable verse reciter
    const alafasyStatus = getReciterSyncStatus({ id: 'alafasy' }, 'verse');
    expect(alafasyStatus.isSynchronizable).toBe(true);
    expect(alafasyStatus.badgeText).toContain('متزامن مع السور');

    // Unsynchronizable verse reciter (e.g. Minshawi Mujawwad)
    const mujawwadStatus = getReciterSyncStatus({ id: 'minshawi_mujawwad' }, 'verse');
    expect(mujawwadStatus.isSynchronizable).toBe(false);
    expect(mujawwadStatus.badgeText).toBe('آية بآية فقط');

    // Synchronizable full surah reciter (Muhammad Ayyoub moshaf 109 & 320)
    const ayyoub109Status = getReciterSyncStatus({ reciterId: 109, moshafId: 109 }, 'surah');
    expect(ayyoub109Status.isSynchronizable).toBe(true);
    expect(ayyoub109Status.badgeText).toContain('متزامن مع الآيات');

    const ayyoub320Status = getReciterSyncStatus({ reciterId: 109, moshafId: 320 }, 'surah');
    expect(ayyoub320Status.isSynchronizable).toBe(true);

    // Unsynchronizable full surah reciter (Akram Al-Alaqmi reciterId: 10)
    const akramStatus = getReciterSyncStatus({ reciterId: 10, moshafId: 10 }, 'surah');
    expect(akramStatus.isSynchronizable).toBe(false);
    expect(akramStatus.badgeText).toBe('سورة كاملة فقط');
  });

  it('verifies that all VERIFIED_RECITER_MAPPINGS correspond to existing EveryAyah reciter IDs', () => {
    const allVerseReciters = [...QURAN_RECITERS, ...WARSH_AYAH_RECITERS];
    const validVerseIds = new Set(allVerseReciters.map((r) => r.id));
    for (const mapping of VERIFIED_RECITER_MAPPINGS) {
      expect(validVerseIds.has(mapping.verseId)).toBe(true);
      expect(typeof mapping.mp3QuranReciterId).toBe('number');
    }
  });
});
