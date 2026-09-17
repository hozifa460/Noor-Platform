import { describe, it, expect, beforeEach } from 'vitest';
import {
  QIRAAT_LIST,
  getQiraahPdfUrl,
  isAyahAudioSupportedForQiraah,
  getAyahRecitersForQiraah,
  QURAN_RECITERS,
  WARSH_AYAH_RECITERS,
} from '../domain';
import {
  isSurahAvailableInRecording,
  type RiwayahReciterEntry,
} from '../infrastructure';
import { useQuranStore } from '../model';
import { QURANIC_MUS_HAFS } from '@/data/books/quranic-mus-hafs';

describe('Quran Riwayat, Multi-Reciter Bindings & Hafs Decoupling Suite', () => {
  beforeEach(() => {
    useQuranStore.setState({
      activeQiraah: QIRAAT_LIST[0],
      isPlayingAudio: false,
      currentPlayingAyah: null,
      highlightedTarget: null,
      isWordExplorerOpen: false,
      isSearchModalOpen: false,
    });
  });

  describe('1. Hafs Decoupling from Shuaba PDF & Canonical Structure', () => {
    it('hafs has pdfUrl null and does not link to quran_shoaba_from_asem.pdf', () => {
      const hafs = QIRAAT_LIST.find((q) => q.id === 'hafs');
      expect(hafs).toBeDefined();
      expect(hafs?.pdfUrl).toBeNull();
      expect(getQiraahPdfUrl('hafs')).toBeNull();
    });

    it('books catalog quran-hafs has empty pdfUrl and does not point to shoaba', () => {
      const hafsBook = QURANIC_MUS_HAFS.find((b) => b.id === 'quran-hafs');
      expect(hafsBook).toBeDefined();
      expect(hafsBook?.pdfUrl).toBe('');
    });

    it('shoaba resolves to quran_shoaba_from_asem.pdf correctly', () => {
      const shoaba = QIRAAT_LIST.find((q) => q.id === 'shoaba');
      expect(shoaba).toBeDefined();
      expect(shoaba?.pdfUrl).toContain('quran_shoaba_from_asem.pdf');
      expect(getQiraahPdfUrl('shoaba')).toContain('quran_shoaba_from_asem.pdf');
    });

    it('warsh resolves to quran_warsh.pdf correctly', () => {
      const warsh = QIRAAT_LIST.find((q) => q.id === 'warsh');
      expect(warsh).toBeDefined();
      expect(warsh?.pdfUrl).toContain('quran_warsh.pdf');
      expect(getQiraahPdfUrl('warsh')).toContain('quran_warsh.pdf');
    });

    it('QIRAAT_LIST contains 21 canonical Riwayat entries and zero EveryAyah reciters', () => {
      expect(QIRAAT_LIST.length).toBe(21);
      // Ensure no reciter persons leaked into the list
      const invalidEntries = QIRAAT_LIST.filter(
        (q) =>
          q.name.includes('عبد الباسط') ||
          q.name.includes('المنشاوي') ||
          q.name.includes('العفاسي') ||
          q.name.includes('الحصري')
      );
      expect(invalidEntries).toHaveLength(0);
    });

    it('all riwayat in QIRAAT_LIST have valid group (seven or three_complementary) and imam', () => {
      for (const q of QIRAAT_LIST) {
        expect(['seven', 'three_complementary']).toContain(q.group);
        expect(q.imam).toBeTruthy();
        expect(typeof q.hasDigitalText).toBe('boolean');
        expect(typeof q.hasAudioSurahs).toBe('boolean');
        expect(typeof q.hasVerseAudio).toBe('boolean');
      }
    });

    it('distinguishes Al-Duri an Abi Amr from Al-Duri an Al-Kisa\'i', () => {
      const douriAbiAmr = QIRAAT_LIST.find((q) => q.id === 'aldori-abu-amr');
      const douriAlkesaei = QIRAAT_LIST.find((q) => q.id === 'aldori-alkesaei');
      expect(douriAbiAmr).toBeDefined();
      expect(douriAlkesaei).toBeDefined();
      expect(douriAbiAmr?.imam).toContain('أبو عمرو');
      expect(douriAlkesaei?.imam).toContain('الكسائي');
      expect(douriAbiAmr?.pdfUrl).toBeNull();
      expect(douriAlkesaei?.pdfUrl).toBeTruthy();
    });

    it('includes warsh-asbahani with valid pdfUrl', () => {
      const asbahani = QIRAAT_LIST.find((q) => q.id === 'warsh-asbahani');
      expect(asbahani).toBeDefined();
      expect(asbahani?.tariq).toContain('الأصبهاني');
      expect(asbahani?.pdfUrl).toContain('quran_warsh_from_nafea_from_way_alasbahani.pdf');
    });
  });

  describe('2. Capability Matrix & Audio Compatibility', () => {
    it('isAyahAudioSupportedForQiraah is true ONLY for Hafs and Warsh', () => {
      expect(isAyahAudioSupportedForQiraah('hafs')).toBe(true);
      expect(isAyahAudioSupportedForQiraah('warsh')).toBe(true);

      const otherRiwayat = QIRAAT_LIST.filter(
        (q) => q.id !== 'hafs' && q.id !== 'warsh'
      );
      expect(otherRiwayat.length).toBe(19);

      for (const q of otherRiwayat) {
        expect(isAyahAudioSupportedForQiraah(q.id)).toBe(false);
        expect(getAyahRecitersForQiraah(q.id)).toEqual([]);
      }
    });

    it('getAyahRecitersForQiraah returns distinct catalogs for Hafs and Warsh', () => {
      const hafsReciters = getAyahRecitersForQiraah('hafs');
      const warshReciters = getAyahRecitersForQiraah('warsh');

      expect(hafsReciters.length).toBe(QURAN_RECITERS.length);
      expect(warshReciters.length).toBe(WARSH_AYAH_RECITERS.length);
      expect(hafsReciters).toEqual(QURAN_RECITERS);
    });
  });

  describe('3. MP3Quran Reciter Surah Availability Guard', () => {
    it('isSurahAvailableInRecording returns true for 114-surah complete reciters', () => {
      const completeReciter: RiwayahReciterEntry = {
        reciterId: 1,
        reciterName: 'قارئ كامل',
        moshafId: 10,
        moshafName: 'المصحف الكامل',
        server: 'https://server.example.com/',
        surahTotal: 114,
        surahList: Array.from({ length: 114 }, (_, i) => i + 1),
      };

      for (let s = 1; s <= 114; s++) {
        expect(isSurahAvailableInRecording(completeReciter, s)).toBe(true);
      }
      expect(isSurahAvailableInRecording(completeReciter, 115)).toBe(false);
      expect(isSurahAvailableInRecording(completeReciter, 0)).toBe(false);
    });

    it('isSurahAvailableInRecording accurately respects partial surahList', () => {
      // Simulating Ahmad Deeban in Hisham (27 surahs)
      const partialReciter: RiwayahReciterEntry = {
        reciterId: 99,
        reciterName: 'أحمد ديبان',
        moshafId: 12,
        moshafName: 'رواية هشام',
        server: 'https://server14.mp3quran.net/deban/',
        surahTotal: 2,
        surahList: [1, 20],
      };

      expect(isSurahAvailableInRecording(partialReciter, 1)).toBe(true);
      expect(isSurahAvailableInRecording(partialReciter, 20)).toBe(true);
      expect(isSurahAvailableInRecording(partialReciter, 2)).toBe(false);
      expect(isSurahAvailableInRecording(partialReciter, 10)).toBe(false);
      expect(isSurahAvailableInRecording(partialReciter, 114)).toBe(false);
    });

    it('isSurahAvailableInRecording safely handles null or empty reciter', () => {
      expect(isSurahAvailableInRecording(null, 1)).toBe(false);
      expect(isSurahAvailableInRecording(undefined as unknown as RiwayahReciterEntry, 1)).toBe(false);
      const emptyReciter: RiwayahReciterEntry = {
        reciterId: 0,
        reciterName: 'x',
        moshafId: 0,
        moshafName: 'x',
        server: 'x',
        surahTotal: 0,
        surahList: [],
      };
      expect(isSurahAvailableInRecording(emptyReciter, 1)).toBe(false);
    });
  });

  describe('4. Store Transitions, Riwayah Switching & Search Navigation', () => {
    it('switching Riwayah halts any active audio playback', () => {
      useQuranStore.setState({ isPlayingAudio: true, currentPlayingAyah: 5 });

      const qaloon = QIRAAT_LIST.find((q) => q.id === 'qaloon')!;
      useQuranStore.getState().setActiveQiraah(qaloon);

      const state = useQuranStore.getState();
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      expect(state.activeQiraah.id).toBe('qaloon');
    });

    it('navigateToAyah always resets activeQiraah to hafs and sets viewMode to interactive', () => {
      // Start in a non-Hafs Riwayah and in pdf-page mode
      const shoaba = QIRAAT_LIST.find((q) => q.id === 'shoaba')!;
      useQuranStore.setState({
        activeQiraah: shoaba,
        viewMode: 'pdf-page',
        isSearchModalOpen: true,
        isPlayingAudio: true,
        currentPlayingAyah: 2,
      });

      useQuranStore.getState().navigateToAyah(2, 255);

      const state = useQuranStore.getState();
      expect(state.activeQiraah.id).toBe('hafs');
      expect(state.viewMode).toBe('interactive');
      expect(state.isSearchModalOpen).toBe(false);
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      expect(state.activeSurah.number).toBe(2);
      expect(state.highlightedTarget).toEqual({ surahNo: 2, ayahNo: 255 });
    });
  });
});
