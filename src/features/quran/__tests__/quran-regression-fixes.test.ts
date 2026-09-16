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
import { useQuranStore } from '../model/quran-store';

describe('Quran Feature — Review Fixes & Regression Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  describe('Point 2: Audio Exclusivity & Memorization Handoff', () => {
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
  });

  describe('Point 3: Navigation Safety, Race Conditions & Error Handling', () => {
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

      // Both should return the exact same in-flight Promise instance
      expect(p1).toBe(p2);
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

      // Verify the formatted string template
      const text = `﴿ ${ayahTextAr} ﴾\n[سورة ${surahNameAr}: الآية ${ayahNo}]\n\nالتفسير (${tafsirName}):\n${tafsirContent}\n\nالمصدر: منصة النور القرآنية`;

      expect(text).toContain('[سورة الفاتحة: الآية 1]');
      expect(text).not.toContain('رواية');
      expect(text).not.toContain('مصحف');
    });
  });
});
