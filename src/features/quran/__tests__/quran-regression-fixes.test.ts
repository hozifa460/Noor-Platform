import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getAyahRecitersForQiraah,
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
      }
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

      // Mock fetch with delayed responses
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

      // User starts navigating to Surah 1, then rapidly navigates to Surah 2
      useQuranStore.getState().setActiveSurah(ALL_SURAHS[0]); // Surah 1
      useQuranStore.getState().setActiveSurah(ALL_SURAHS[1]); // Surah 2

      // Suppose Surah 1 finishes AFTER Surah 2
      resolveSurah2(null);
      await new Promise((r) => setTimeout(r, 10));

      expect(useQuranStore.getState().surahData?.surahNo).toBe(2);

      // Now Surah 1 resolves very late
      resolveSurah1(null);
      await new Promise((r) => setTimeout(r, 10));

      // Surah 2 MUST NOT be overwritten by the stale Surah 1 response!
      expect(useQuranStore.getState().surahData?.surahNo).toBe(2);
      expect(useQuranStore.getState().surahData?.nameAr).toBe('البقرة');
    });

    it('sets surahLoadError to true and clears old surahData when load fails', async () => {
      // Simulate existing Surah 1 data
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

      // Mock fetch rejection
      vi.stubGlobal('fetch', () => Promise.reject(new Error('Network offline')));

      // Navigate to Surah 3 and await its completion
      useQuranStore.getState().setActiveSurah(ALL_SURAHS[2]);
      await useQuranStore.getState().loadSurah(3);

      const state = useQuranStore.getState();
      expect(state.surahLoadError).toBe(true);
      expect(state.loadingSurah).toBe(false);
      // Stale surah 1 data MUST NOT remain under Surah 3 title!
      expect(state.surahData).toBeNull();
    });
  });

  describe('Point 4: Translation Consistency & Integrity', () => {
    it('verifies translation direction metadata for RTL and LTR languages', () => {
      const urdu = QURAN_TRANSLATIONS.find((t) => t.code === 'ur-junagarhi');
      expect(urdu?.direction).toBe('rtl');

      const english = QURAN_TRANSLATIONS.find((t) => t.code === 'en-saheeh');
      expect(english?.direction).toBe('ltr');

      const french = QURAN_TRANSLATIONS.find((t) => t.code === 'fr-montada');
      expect(french?.direction).toBe('ltr');
    });

    it('does not silently return English for missing verses in non-English translation', async () => {
      // Stub loadTranslationFile to simulate a French translation missing a particular ayah
      vi.stubGlobal('fetch', () =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            suras: {
              '1': [
                { aya: '1', translation: 'Au nom d’Allah, le Tout Miséricordieux...' },
                // Verse 2 is missing
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
});
