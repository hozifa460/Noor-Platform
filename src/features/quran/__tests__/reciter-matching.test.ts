import { describe, it, expect } from 'vitest';
import {
  findMatchingVerseReciter,
  findMatchingFullSurahReciter,
  getReciterSyncStatus,
  VERIFIED_RECITER_MAPPINGS,
} from '../domain/reciter-matching';
import { QURAN_RECITERS, WARSH_AYAH_RECITERS } from '../domain/data';
import type { RiwayahReciterEntry } from '../infrastructure';

describe('Quran Reciter Verified Catalog ID Mapping & Multi-Recording Suite', () => {
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
    expect(surahMatch?.moshafId).toBe(123);
    expect(surahMatch?.reciterName).toBe('مشاري العفاسي');
  });

  it('strictly rejects recordings with missing or invalid moshafId even with a valid reciterId', () => {
    // Valid reciterId (123 for Alafasy) but moshafId is missing/undefined
    const missingMoshafReciter = {
      reciterId: 123,
      reciterName: 'مشاري العفاسي',
      moshafName: 'حفص عن عاصم',
      server: 'https://server8.mp3quran.net/afs/',
      surahTotal: 114,
      surahList: [1, 2],
    } as unknown as RiwayahReciterEntry;

    // 1. findMatchingVerseReciter must reject it and return null
    const verseMatch = findMatchingVerseReciter(missingMoshafReciter, QURAN_RECITERS);
    expect(verseMatch).toBeNull();

    // 2. getReciterSyncStatus must mark it non-synchronizable
    const syncStatus = getReciterSyncStatus(missingMoshafReciter, 'surah');
    expect(syncStatus.isSynchronizable).toBe(false);
    expect(syncStatus.badgeText).toBe('سورة كاملة فقط');

    // 3. Valid reciterId with an unregistered/mismatched moshafId
    const invalidMoshafReciter = {
      reciterId: 123,
      moshafId: 99999,
      reciterName: 'مشاري العفاسي',
    } as RiwayahReciterEntry;
    expect(findMatchingVerseReciter(invalidMoshafReciter, QURAN_RECITERS)).toBeNull();
    expect(getReciterSyncStatus(invalidMoshafReciter, 'surah').isSynchronizable).toBe(false);
  });

  describe('Multi-recording disambiguation, order independence, and selection retention', () => {
    const ayyoubVerse = QURAN_RECITERS.find((r) => r.id === 'ayyoub')!;

    const ayyoubMurattal: RiwayahReciterEntry = {
      reciterId: 109,
      reciterName: 'محمد أيوب',
      moshafId: 109,
      moshafName: 'حفص عن عاصم - مرتل',
      server: 'https://server8.mp3quran.net/ayyub/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };

    const ayyoubSpecial: RiwayahReciterEntry = {
      reciterId: 109,
      reciterName: 'محمد أيوب',
      moshafId: 320,
      moshafName: 'حفص عن عاصم - تلاوة مميزة',
      server: 'https://server8.mp3quran.net/ayyub_special/',
      surahTotal: 114,
      surahList: [1, 2, 3],
    };

    it('chooses documented canonical defaultMoshafId (109) regardless of input list ordering when no prior selection exists', () => {
      // Order 1: Murattal (109) first, Special (320) second
      const matchForward = findMatchingFullSurahReciter(ayyoubVerse, [ayyoubMurattal, ayyoubSpecial]);
      expect(matchForward).not.toBeNull();
      expect(matchForward?.moshafId).toBe(109);

      // Order 2: Special (320) first, Murattal (109) second (reversed order)
      const matchReversed = findMatchingFullSurahReciter(ayyoubVerse, [ayyoubSpecial, ayyoubMurattal]);
      expect(matchReversed).not.toBeNull();
      // Must STILL be 109 (never blindly take the first element in the array)
      expect(matchReversed?.moshafId).toBe(109);
    });

    it('retains currently selected recording if it is valid among matching candidates', () => {
      // User currently has Special (320) selected
      const currentSelection = ayyoubSpecial;

      // In forward list order: preserves 320
      const match1 = findMatchingFullSurahReciter(
        ayyoubVerse,
        [ayyoubMurattal, ayyoubSpecial],
        currentSelection
      );
      expect(match1?.moshafId).toBe(320);

      // In reversed list order: preserves 320
      const match2 = findMatchingFullSurahReciter(
        ayyoubVerse,
        [ayyoubSpecial, ayyoubMurattal],
        currentSelection
      );
      expect(match2?.moshafId).toBe(320);
    });

    it('QuickAyahMenu onSelectActiveReciter handler in QuranHubView preserves Muhammad Ayyoub moshaf 320 instead of reverting to 109', () => {
      // User currently has Ayyoub Special (moshaf 320) selected as full surah reciter
      let activeRiwayahReciter: RiwayahReciterEntry | null = ayyoubSpecial;
      let activeReciter = QURAN_RECITERS.find((r) => r.id === 'alafasy')!;
      const riwayahReciters = [ayyoubMurattal, ayyoubSpecial];

      // Exact handler from QuranHubView.tsx:
      // onSelectActiveReciter={(r) => {
      //   setActiveReciter(r);
      //   const matchingFull = findMatchingFullSurahReciter(r, riwayahReciters, activeRiwayahReciter);
      //   if (matchingFull) {
      //     setActiveRiwayahReciter(matchingFull);
      //   }
      // }}
      const handleSelectActiveReciter = (r: typeof activeReciter) => {
        activeReciter = r;
        const matchingFull = findMatchingFullSurahReciter(r, riwayahReciters, activeRiwayahReciter);
        if (matchingFull) {
          activeRiwayahReciter = matchingFull;
        }
      };

      // User selects Muhammad Ayyoub verse reciter via QuickAyahMenu
      handleSelectActiveReciter(ayyoubVerse);

      // Verify verse reciter switched
      expect(activeReciter.id).toBe('ayyoub');
      // Crucial verification: preserves moshaf 320 and does NOT revert to default 109
      expect(activeRiwayahReciter).not.toBeNull();
      expect(activeRiwayahReciter?.reciterId).toBe(109);
      expect(activeRiwayahReciter?.moshafId).toBe(320);
    });

    it('refuses ambiguous synchronization when multiple candidates exist but documented default is absent and no selection exists', () => {
      // List contains only Special (320) which is NOT the canonical default (109)
      // Without previous selection, it refuses ambiguous assumption and returns null
      const match = findMatchingFullSurahReciter(ayyoubVerse, [ayyoubSpecial], null);
      expect(match).toBeNull();
    });

    it('supports Minshawi Murattal multiple recordings (112 and 10924) with documented priority (112)', () => {
      const minshawiMurattalVerse = QURAN_RECITERS.find((r) => r.id === 'minshawi_murattal')!;

      const minshawi112: RiwayahReciterEntry = {
        reciterId: 112,
        reciterName: 'محمد صديق المنشاوي',
        moshafId: 112,
        moshafName: 'حفص عن عاصم - مرتل',
        server: 'https://server10.mp3quran.net/minsh/',
        surahTotal: 114,
        surahList: [1, 2, 3],
      };

      const minshawi10924: RiwayahReciterEntry = {
        reciterId: 112,
        reciterName: 'محمد صديق المنشاوي',
        moshafId: 10924,
        moshafName: 'حفص عن عاصم - تسجيل قديم',
        server: 'https://server10.mp3quran.net/minsh_old/',
        surahTotal: 114,
        surahList: [1, 2, 3],
      };

      // Both map to minshawi_murattal in reverse
      expect(findMatchingVerseReciter(minshawi112, QURAN_RECITERS)?.id).toBe('minshawi_murattal');
      expect(findMatchingVerseReciter(minshawi10924, QURAN_RECITERS)?.id).toBe('minshawi_murattal');

      // Forward lookup picks default 112 even if 10924 is first in array
      const matchReversed = findMatchingFullSurahReciter(minshawiMurattalVerse, [minshawi10924, minshawi112]);
      expect(matchReversed?.moshafId).toBe(112);

      // Preserves 10924 if user already had it selected
      const matchPreserved = findMatchingFullSurahReciter(minshawiMurattalVerse, [minshawi112, minshawi10924], minshawi10924);
      expect(matchPreserved?.moshafId).toBe(10924);
    });
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

    expect(findMatchingFullSurahReciter(minshawiMujawwad!, mockSurahReciters)).toBeNull();

    const abdulbasitMujawwad = QURAN_RECITERS.find((r) => r.id === 'abdulbasit_mujawwad');
    expect(abdulbasitMujawwad).toBeDefined();
    expect(findMatchingFullSurahReciter(abdulbasitMujawwad!, mockSurahReciters)).toBeNull();

    const husaryMuallim = QURAN_RECITERS.find((r) => r.id === 'husary_muallim');
    expect(husaryMuallim).toBeDefined();
    expect(findMatchingFullSurahReciter(husaryMuallim!, mockSurahReciters)).toBeNull();
  });

  it('uses neutral availability wording «متوفر في المسارين» without implying temporal synchronization', () => {
    // Synchronizable verse reciter
    const alafasyStatus = getReciterSyncStatus({ id: 'alafasy' }, 'verse');
    expect(alafasyStatus.isSynchronizable).toBe(true);
    expect(alafasyStatus.badgeText).toBe('متوفر في المسارين ✓');
    expect(alafasyStatus.explanation).toBe('يتوفر لهذا القارئ تسجيل سورة كاملة وتلاوة آية بآية');
    expect(alafasyStatus.explanation).not.toContain('متزامنة');

    // Unsynchronizable verse reciter
    const mujawwadStatus = getReciterSyncStatus({ id: 'minshawi_mujawwad' }, 'verse');
    expect(mujawwadStatus.isSynchronizable).toBe(false);
    expect(mujawwadStatus.badgeText).toBe('آية بآية فقط');

    // Synchronizable full surah reciter (Muhammad Ayyoub moshaf 109 & 320)
    const ayyoub109Status = getReciterSyncStatus({ reciterId: 109, moshafId: 109 }, 'surah');
    expect(ayyoub109Status.isSynchronizable).toBe(true);
    expect(ayyoub109Status.badgeText).toBe('متوفر في المسارين ✓');

    const ayyoub320Status = getReciterSyncStatus({ reciterId: 109, moshafId: 320 }, 'surah');
    expect(ayyoub320Status.isSynchronizable).toBe(true);
    expect(ayyoub320Status.badgeText).toBe('متوفر في المسارين ✓');

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
      expect(typeof mapping.defaultMoshafId).toBe('number');
      expect(mapping.mp3QuranMoshafIds.includes(mapping.defaultMoshafId)).toBe(true);
    }
  });
});
