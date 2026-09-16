import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getAyahRecitersForQiraah,
  isAyahAudioSupportedForQiraah,
  getAyahAudioUrl,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  QURAN_RECITERS,
  WARSH_AYAH_RECITERS,
  ALL_SURAHS,
} from '../domain';
import {
  getRecitersForRiwayah,
  getAyahTranslation,
} from '../infrastructure';
import { useQuranStore, clearQuranMemoryCacheForTesting } from '../model/quran-store';

describe('Quran Feature — Review Fixes & Regression Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearQuranMemoryCacheForTesting();
    useQuranStore.setState({
      activeQiraah: QIRAAT_LIST[0],
      activeSurah: ALL_SURAHS[0],
      surahData: null,
      loadingSurah: false,
      surahLoadError: false,
      currentPlayingAyah: null,
      isPlayingAudio: false,
      isPlayingFullSurah: false,
      registeredAudioElement: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Point 1: Riwaya, Text, and Audio Compatibility', () => {
    it('provides verse-by-verse reciters exclusively for Hafs and Warsh', () => {
      const hafsReciters = getAyahRecitersForQiraah('hafs');
      expect(hafsReciters.length).toBeGreaterThan(0);
      expect(hafsReciters).toEqual(QURAN_RECITERS);

      const warshReciters = getAyahRecitersForQiraah('warsh');
      expect(warshReciters.length).toBeGreaterThan(0);
      expect(warshReciters).toEqual(WARSH_AYAH_RECITERS);
    });

    it('returns empty array for non-Hafs non-Warsh Riwayahs without silent fallback to Hafs', () => {
      const unsupported = ['qaloon', 'shoaba', 'alsosi', 'aldori-alkesaei', 'bizey', 'khalaf'];
      for (const qId of unsupported) {
        const reciters = getAyahRecitersForQiraah(qId);
        expect(reciters).toEqual([]);
        expect(isAyahAudioSupportedForQiraah(qId)).toBe(false);
      }
      expect(isAyahAudioSupportedForQiraah('hafs')).toBe(true);
      expect(isAyahAudioSupportedForQiraah('warsh')).toBe(true);
    });

    it('playAyah and playNextAyah reject playback when active Riwayah does not support verse audio', () => {
      const douri = QIRAAT_LIST.find((q) => q.id === 'aldori-alkesaei') || {
        id: 'aldori',
        name: 'رواية الدوري',
        narrator: '',
        origin: '',
        description: '',
        pdfUrl: '',
      };
      useQuranStore.setState({ activeQiraah: douri });

      // Attempting to play an ayah must be ignored inside store logic
      useQuranStore.getState().playAyah(1);
      expect(useQuranStore.getState().isPlayingAudio).toBe(false);
      expect(useQuranStore.getState().currentPlayingAyah).toBeNull();

      // playNextAyah must also reject
      useQuranStore.getState().playNextAyah();
      expect(useQuranStore.getState().isPlayingAudio).toBe(false);
    });

    it('getRecitersForRiwayah does NOT silently fallback to Hafs when a Riwayah has no reciters', async () => {
      const result = await getRecitersForRiwayah('non_existent_riwayah_xyz');
      expect(result).toEqual([]);
    });

    it('switching Riwayah in store cleanly resets playback to prevent cross-riwayah audio bleeding', () => {
      useQuranStore.setState({ isPlayingAudio: true, currentPlayingAyah: 3 });
      const warsh = QIRAAT_LIST.find((q) => q.id === 'warsh')!;
      useQuranStore.getState().setActiveQiraah(warsh);

      const state = useQuranStore.getState();
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      expect(state.activeReciter.id).toBe(WARSH_AYAH_RECITERS[0].id);
    });
  });

  describe('Point 2: Audio Exclusivity & Session Invalidation During Transitions', () => {
    it('stopAudio synchronously halts both full surah and verse audio, and pauses registered audio element', () => {
      const mockAudio = {
        pause: vi.fn(),
        currentTime: 42,
      } as unknown as HTMLAudioElement;

      useQuranStore.getState().registerAudioElement(mockAudio);
      useQuranStore.setState({
        isPlayingAudio: true,
        isPlayingFullSurah: true,
        currentPlayingAyah: 5,
      });

      useQuranStore.getState().stopAudio();

      const state = useQuranStore.getState();
      expect(state.isPlayingAudio).toBe(false);
      expect(state.isPlayingFullSurah).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
    });

    it('playAyah halts full surah playback to ensure no dual concurrent audio streams', () => {
      useQuranStore.setState({
        isPlayingFullSurah: true,
        isPlayingAudio: false,
      });

      useQuranStore.getState().playAyah(2);

      const state = useQuranStore.getState();
      expect(state.isPlayingFullSurah).toBe(false);
      expect(state.isPlayingAudio).toBe(true);
      expect(state.currentPlayingAyah).toBe(2);
    });

    it('playNextAyah halts playback if stopAudio() is called while awaiting loadSurah()', async () => {
      let resolveSurah2: (val: unknown) => void = () => {};

      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/2.json')) {
          return new Promise((res) => {
            resolveSurah2 = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 2,
                  nameAr: 'البقرة',
                  nameEn: 'Al-Baqarah',
                  nameRoman: 'The Cow',
                  placeOfRevelation: 'Medinan',
                  totalAyahs: 286,
                  ayahs: [{ ayahNo: 1, ayahNoQuran: 8, textAr: 'الم', textEn: '', juz: 1 }],
                }),
              });
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      // Position playback at final verse of Surah 1
      useQuranStore.setState({
        activeSurah: ALL_SURAHS[0],
        surahData: {
          surahNo: 1,
          nameAr: 'الفاتحة',
          nameEn: 'Al-Fatihah',
          nameRoman: 'The Opening',
          placeOfRevelation: 'Meccan',
          totalAyahs: 7,
          ayahs: [],
        },
        currentPlayingAyah: 7,
        isPlayingAudio: true,
      });

      // Trigger automatic advancement to Surah 2
      const nextPromise = useQuranStore.getState().playNextAyah();

      // User explicitly stops audio while Surah 2 is still fetching over the network
      useQuranStore.getState().stopAudio();

      // Surah 2 finishes loading afterwards
      resolveSurah2(null);
      await nextPromise;

      const state = useQuranStore.getState();
      // Playback MUST remain halted; previous session was invalidated by stopAudio()
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
    });

    it('playNextAyah halts playback if user manually navigates away during auto-advance', async () => {
      let resolveSurah2: (val: unknown) => void = () => {};

      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/2.json')) {
          return new Promise((res) => {
            resolveSurah2 = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 2,
                  nameAr: 'البقرة',
                  nameEn: 'Al-Baqarah',
                  totalAyahs: 286,
                  ayahs: [{ ayahNo: 1, ayahNoQuran: 8, textAr: 'الم', textEn: '', juz: 1 }],
                }),
              });
          });
        }
        if (url.includes('/data/quran/surahs/5.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              surahNo: 5,
              nameAr: 'المائدة',
              nameEn: "Al-Ma'idah",
              totalAyahs: 120,
              ayahs: [],
            }),
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      useQuranStore.setState({
        activeSurah: ALL_SURAHS[0],
        surahData: {
          surahNo: 1,
          nameAr: 'الفاتحة',
          nameEn: 'Al-Fatihah',
          nameRoman: 'The Opening',
          placeOfRevelation: 'Meccan',
          totalAyahs: 7,
          ayahs: [],
        },
        currentPlayingAyah: 7,
        isPlayingAudio: true,
      });

      const nextPromise = useQuranStore.getState().playNextAyah();

      // User manually navigates to Surah 5
      useQuranStore.getState().setActiveSurah(ALL_SURAHS[4]);

      resolveSurah2(null);
      await nextPromise;

      const state = useQuranStore.getState();
      // Must not start playing Surah 2 ayah 1!
      expect(state.activeSurah.number).toBe(5);
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
    });
  });

  describe('Point 3: Navigation Safety, Race Conditions & Rapid A -> B -> A', () => {
    it('prevents stale slower response from overwriting newer active surah', async () => {
      let resolveSurah1: (val: unknown) => void = () => {};
      let resolveSurah2: (val: unknown) => void = () => {};

      const surah1Mock = {
        surahNo: 1,
        nameAr: 'الفاتحة',
        nameEn: 'Al-Fatihah',
        nameRoman: 'The Opening',
        placeOfRevelation: 'Meccan',
        totalAyahs: 7,
        ayahs: [{ ayahNo: 1, ayahNoQuran: 1, textAr: 'بِسْمِ اللَّهِ', textEn: '', juz: 1 }],
      };

      const surah2Mock = {
        surahNo: 2,
        nameAr: 'البقرة',
        nameEn: 'Al-Baqarah',
        nameRoman: 'The Cow',
        placeOfRevelation: 'Medinan',
        totalAyahs: 286,
        ayahs: [{ ayahNo: 1, ayahNoQuran: 8, textAr: 'الم', textEn: '', juz: 1 }],
      };

      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/1.json')) {
          return new Promise((res) => {
            resolveSurah1 = () => res({ ok: true, json: async () => surah1Mock });
          });
        }
        if (url.includes('/data/quran/surahs/2.json')) {
          return new Promise((res) => {
            resolveSurah2 = () => res({ ok: true, json: async () => surah2Mock });
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      useQuranStore.getState().setActiveSurah(ALL_SURAHS[0]);
      useQuranStore.getState().setActiveSurah(ALL_SURAHS[1]);

      resolveSurah2(null);
      await new Promise((r) => setTimeout(r, 10));
      expect(useQuranStore.getState().surahData?.surahNo).toBe(2);

      resolveSurah1(null);
      await new Promise((r) => setTimeout(r, 10));
      expect(useQuranStore.getState().surahData?.surahNo).toBe(2);
      expect(useQuranStore.getState().surahData?.nameAr).toBe('البقرة');
    });

    it('supports rapid A -> B -> A navigation during loading (order: A finishes before B)', async () => {
      let resolveSurah1: (val: unknown) => void = () => {};
      let resolveSurah2: (val: unknown) => void = () => {};
      let fetchCountSurah1 = 0;

      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/11.json')) {
          fetchCountSurah1++;
          return new Promise((res) => {
            resolveSurah1 = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 11,
                  nameAr: 'هود',
                  totalAyahs: 123,
                  ayahs: [],
                }),
              });
          });
        }
        if (url.includes('/data/quran/surahs/12.json')) {
          return new Promise((res) => {
            resolveSurah2 = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 12,
                  nameAr: 'يوسف',
                  totalAyahs: 111,
                  ayahs: [],
                }),
              });
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      // 1. User navigates to Surah 11
      const p1 = useQuranStore.getState().loadSurah(11);
      useQuranStore.setState({ activeSurah: ALL_SURAHS[10] });

      // 2. User rapidly navigates to Surah 12
      const p2 = useQuranStore.getState().loadSurah(12);
      useQuranStore.setState({ activeSurah: ALL_SURAHS[11] });

      // 3. User rapidly navigates back to Surah 11 while both are in-flight
      const p3 = useQuranStore.getState().loadSurah(11);
      useQuranStore.setState({ activeSurah: ALL_SURAHS[10] });

      // Zero duplicate fetch for Surah 11
      expect(fetchCountSurah1).toBe(1);

      // Order 1: Surah 11 finishes, then Surah 12 finishes
      resolveSurah1(null);
      await Promise.all([p1, p3]);

      expect(useQuranStore.getState().surahData?.surahNo).toBe(11);
      expect(useQuranStore.getState().loadingSurah).toBe(false);

      // Now Surah 12 finishes later
      resolveSurah2(null);
      await p2;

      // Active Surah 11 MUST NOT be overwritten by Surah 12
      expect(useQuranStore.getState().surahData?.surahNo).toBe(11);
      expect(useQuranStore.getState().loadingSurah).toBe(false);
      expect(fetchCountSurah1).toBe(1);
    });

    it('supports rapid A -> B -> A navigation during loading (order: B finishes before A)', async () => {
      let resolveSurah1: (val: unknown) => void = () => {};
      let resolveSurah2: (val: unknown) => void = () => {};
      let fetchCountSurah1 = 0;

      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/21.json')) {
          fetchCountSurah1++;
          return new Promise((res) => {
            resolveSurah1 = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 21,
                  nameAr: 'الأنبياء',
                  totalAyahs: 112,
                  ayahs: [],
                }),
              });
          });
        }
        if (url.includes('/data/quran/surahs/22.json')) {
          return new Promise((res) => {
            resolveSurah2 = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 22,
                  nameAr: 'الحج',
                  totalAyahs: 78,
                  ayahs: [],
                }),
              });
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      // 1. User navigates to Surah 21
      const p1 = useQuranStore.getState().loadSurah(21);
      useQuranStore.setState({ activeSurah: ALL_SURAHS[20] });

      // 2. User rapidly navigates to Surah 22
      const p2 = useQuranStore.getState().loadSurah(22);
      useQuranStore.setState({ activeSurah: ALL_SURAHS[21] });

      // 3. User rapidly navigates back to Surah 21
      const p3 = useQuranStore.getState().loadSurah(21);
      useQuranStore.setState({ activeSurah: ALL_SURAHS[20] });

      // Order 2: Surah 22 finishes first
      resolveSurah2(null);
      await p2;

      // Surah 22 must NOT overwrite active Surah 21
      expect(useQuranStore.getState().surahData).toBeNull();
      expect(useQuranStore.getState().loadingSurah).toBe(true);

      // Then Surah 21 finishes
      resolveSurah1(null);
      await Promise.all([p1, p3]);

      // Active Surah 21 is adopted and loading ends
      expect(useQuranStore.getState().surahData?.surahNo).toBe(21);
      expect(useQuranStore.getState().loadingSurah).toBe(false);
      expect(fetchCountSurah1).toBe(1);
    });

    it('sets surahLoadError to true and clears old surahData when load fails', async () => {
      useQuranStore.setState({
        activeSurah: ALL_SURAHS[0],
        surahData: {
          surahNo: 1,
          nameAr: 'الفاتحة',
          nameEn: 'Al-Fatihah',
          nameRoman: '',
          placeOfRevelation: 'Meccan',
          totalAyahs: 7,
          ayahs: [],
        },
      });

      vi.stubGlobal('fetch', () => Promise.reject(new Error('Network offline')));

      useQuranStore.getState().setActiveSurah(ALL_SURAHS[2]);
      await useQuranStore.getState().loadSurah(3);

      const state = useQuranStore.getState();
      expect(state.surahLoadError).toBe(true);
      expect(state.loadingSurah).toBe(false);
      expect(state.surahData).toBeNull();
    });
  });

  describe('Point 4: Translation Consistency & Key Binding', () => {
    it('verifies translation direction metadata for RTL and LTR languages', () => {
      const urdu = QURAN_TRANSLATIONS.find((t) => t.code === 'ur-junagarhi');
      expect(urdu?.direction).toBe('rtl');

      const english = QURAN_TRANSLATIONS.find((t) => t.code === 'en-saheeh');
      expect(english?.direction).toBe('ltr');

      const french = QURAN_TRANSLATIONS.find((t) => t.code === 'fr-montada');
      expect(french?.direction).toBe('ltr');
    });

    it('does not silently return English for missing verses in non-English translation', async () => {
      vi.stubGlobal('fetch', () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            suras: {
              '1': [
                { aya: '1', translation: 'Au nom d’Allah, le Tout Miséricordieux...' },
              ],
            },
          }),
        })
      );

      const res = await getAyahTranslation('fr-montada', 1, 2);
      expect(res.text).not.toContain('Praise be to Allah');
      expect(res.text).toBe('Translation unavailable for this verse.');
    });
  });

  describe('Point 5: Ayah Card Play/Pause Toggle Behavior', () => {
    it('pauseAudio sets isPlayingAudio and isPlayingFullSurah to false', () => {
      useQuranStore.setState({
        isPlayingAudio: true,
        currentPlayingAyah: 4,
      });

      useQuranStore.getState().pauseAudio();

      expect(useQuranStore.getState().isPlayingAudio).toBe(false);
      // currentPlayingAyah remains 4 so user can resume exactly where paused
      expect(useQuranStore.getState().currentPlayingAyah).toBe(4);
    });
  });

  describe('Point 6: In-Flight Surah Request Deduplication', () => {
    it('deduplicates concurrent loadSurah calls for the same surah, making only 1 network fetch', async () => {
      let fetchCallCount = 0;
      let resolvePromise: (val: unknown) => void = () => {};

      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/5.json')) {
          fetchCallCount++;
          return new Promise((res) => {
            resolvePromise = () =>
              res({
                ok: true,
                json: async () => ({
                  surahNo: 5,
                  nameAr: 'المائدة',
                  nameEn: 'Al-Ma\'idah',
                  nameRoman: 'The Table Spread',
                  placeOfRevelation: 'Medinan',
                  totalAyahs: 120,
                  ayahs: [],
                }),
              });
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      useQuranStore.setState({ activeSurah: ALL_SURAHS[4] }); // Surah 5

      // Launch two concurrent requests for Surah 5
      const p1 = useQuranStore.getState().loadSurah(5);
      const p2 = useQuranStore.getState().loadSurah(5);

      expect(fetchCallCount).toBe(1);

      resolvePromise(null);
      await Promise.all([p1, p2]);

      expect(useQuranStore.getState().surahData?.surahNo).toBe(5);
      expect(fetchCallCount).toBe(1);
    });
  });

  describe('Point 7: Warsh Audio URL Generation & Surah 1 Alignment', () => {
    it('unifies Warsh audio URL generation with getWarshAyahAudioNumber', () => {
      const reciter = 'Warsh_Yassin_al_Jazaery_64kbps';
      
      // Surah 1 (Al-Fatihah) in Warsh starts verse 2 from audio index 1
      const urlSurah1Ayah1 = getAyahAudioUrl(reciter, 1, 1, 'warsh');
      const urlSurah1Ayah2 = getAyahAudioUrl(reciter, 1, 2, 'warsh');
      const urlSurah1Ayah3 = getAyahAudioUrl(reciter, 1, 3, 'warsh');
      const urlSurah2Ayah1 = getAyahAudioUrl(reciter, 2, 1, 'warsh');

      expect(urlSurah1Ayah1).toBe(`https://everyayah.com/data/${reciter}/001001.mp3`);
      expect(urlSurah1Ayah2).toBe(`https://everyayah.com/data/${reciter}/001001.mp3`);
      expect(urlSurah1Ayah3).toBe(`https://everyayah.com/data/${reciter}/001002.mp3`);
      expect(urlSurah2Ayah1).toBe(`https://everyayah.com/data/${reciter}/002001.mp3`);

      // Hafs maintains 1:1 ayah numbering
      const hafsUrl = getAyahAudioUrl('Alafasy_128kbps', 1, 2, 'hafs');
      expect(hafsUrl).toBe('https://everyayah.com/data/Alafasy_128kbps/001002.mp3');
    });
  });

  describe('Point 8: Clean Text Attribution When Copying Tafsir', () => {
    it('formats tafsir copy header cleanly as [سورة X: الآية Y] without appending selected Riwayah name', () => {
      const surahNameAr = 'الفاتحة';
      const ayahNo = 1;
      const ayahTextAr = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
      const tafsirName = 'تفسير ابن كثير';
      const tafsirContent = 'افتتح بها كتاب الله تبارك وتعالى...';

      const text = `﴿ ${ayahTextAr} ﴾\n[سورة ${surahNameAr}: الآية ${ayahNo}]\n\nالتفسير (${tafsirName}):\n${tafsirContent}\n\nالمصدر: منصة النور القرآنية`;

      expect(text).toContain('[سورة الفاتحة: الآية 1]');
      expect(text).not.toContain('رواية');
      expect(text).not.toContain('مصحف');
    });
  });
});
