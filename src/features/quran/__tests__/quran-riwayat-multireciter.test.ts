import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  getQiraahPdfUrl,
  isAyahAudioSupportedForQiraah,
  getAyahRecitersForQiraah,
  getAyahAudioUrl,
  QURAN_RECITERS,
  WARSH_AYAH_RECITERS,
} from '../domain';
import * as mp3Engine from '../infrastructure';
import {
  isSurahAvailableInRecording,
  type RiwayahReciterEntry,
} from '../infrastructure';
import { useQuranStore, useQuranAudio, useRiwayahReciters } from '../model';
import { QURANIC_MUS_HAFS } from '@/data/books/quranic-mus-hafs';

describe('Quran Riwayat, Multi-Reciter Bindings & Hafs Decoupling Suite', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useQuranStore.setState({
      activeQiraah: QIRAAT_LIST[0],
      activeSurah: ALL_SURAHS[0],
      isPlayingAudio: false,
      isPlayingFullSurah: false,
      currentPlayingAyah: null,
      highlightedTarget: null,
      isWordExplorerOpen: false,
      isSearchModalOpen: false,
    });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    vi.restoreAllMocks();
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

    it('unifies playback condition: rejects when reciter riwayahId does not match activeQiraahId even if surah is in list', () => {
      const reciter: RiwayahReciterEntry = {
        reciterId: 50,
        reciterName: 'قارئ ورش',
        moshafId: 7,
        moshafName: 'رواية ورش',
        server: 'https://server.example.com/',
        surahTotal: 114,
        surahList: Array.from({ length: 114 }, (_, i) => i + 1),
        riwayahId: 'warsh',
      };

      // Matches active Riwayah -> true
      expect(isSurahAvailableInRecording(reciter, 1, 'warsh')).toBe(true);

      // Incompatible Riwayah -> strictly false
      expect(isSurahAvailableInRecording(reciter, 1, 'shoaba')).toBe(false);
      expect(isSurahAvailableInRecording(reciter, 1, 'hafs')).toBe(false);
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

    it('transitioning from Warsh to Hafs via search navigation updates activeReciter to Hafs and verifies subsequent playback URL belongs to Hafs', async () => {
      // 1. Setup in Warsh with Warsh reciter playing
      const warsh = QIRAAT_LIST.find((q) => q.id === 'warsh')!;
      const warshReciter = WARSH_AYAH_RECITERS[0];
      useQuranStore.setState({
        activeQiraah: warsh,
        activeReciter: warshReciter,
        isPlayingAudio: true,
        isPlayingFullSurah: true,
        currentPlayingAyah: 1,
      });

      // Verify initial audio URL was for Warsh
      const warshUrl = getAyahAudioUrl(warshReciter.subfolder, 2, 255, 'warsh');
      expect(warshUrl).toContain('warsh/warsh_Abdul_Basit_128kbps');

      // 2. Navigate via search to Hafs text
      await useQuranStore.getState().navigateToAyah(2, 255);

      const state = useQuranStore.getState();
      // Audio must be halted
      expect(state.isPlayingAudio).toBe(false);
      expect(state.isPlayingFullSurah).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      // Qiraah must be Hafs
      expect(state.activeQiraah.id).toBe('hafs');
      // activeReciter must be updated to a compatible Hafs reciter
      expect(QURAN_RECITERS.some((r) => r.id === state.activeReciter.id)).toBe(true);
      expect(state.activeReciter.id).not.toBe(warshReciter.id);

      // 3. Verify subsequent verse audio URL belongs to Hafs (no warsh/ prefix, standard EveryAyah Hafs path)
      const subsequentHafsUrl = getAyahAudioUrl(
        state.activeReciter.subfolder,
        2,
        255,
        state.activeQiraah.id
      );
      expect(subsequentHafsUrl).not.toContain('warsh/');
      expect(subsequentHafsUrl).toContain(state.activeReciter.subfolder);
      expect(subsequentHafsUrl).toContain('002255.mp3');
    });

    it('hook useQuranAudio: preserves user-selected reciter when changing surah and disables playback for unrecorded surah without replacing reciter', async () => {
      const hisham = QIRAAT_LIST.find((q) => q.id === 'hisham')!;
      useQuranStore.setState({
        activeQiraah: hisham,
        activeSurah: ALL_SURAHS[0], // Surah 1 (Al-Fatiha)
        isPlayingFullSurah: true,
      });

      // Reciter with partial surah coverage: only surahs 1 and 20
      const selectedReciter: RiwayahReciterEntry = {
        reciterId: 99,
        reciterName: 'أحمد ديبان',
        moshafId: 12,
        moshafName: 'رواية هشام',
        server: 'https://server14.mp3quran.net/deban/',
        surahTotal: 2,
        surahList: [1, 20],
        riwayahId: 'hisham',
      };

      const hookResultRef = { current: null as unknown as ReturnType<typeof useQuranAudio> };
      function TestAudioComponent() {
        const audio = useQuranAudio({ activeRiwayahReciter: selectedReciter });
        useEffect(() => {
          hookResultRef.current = audio;
        });
        return React.createElement('div', null, audio.currentAudioUrl || 'none');
      }

      await act(async () => {
        root?.render(React.createElement(TestAudioComponent));
      });

      // In Surah 1: surah is available, audio URL must be valid
      expect(hookResultRef.current.currentAudioUrl).toBe('https://server14.mp3quran.net/deban/001.mp3');

      // Surah changes in store to Surah 2 (Al-Baqarah - unrecorded for this reciter)
      await act(async () => {
        useQuranStore.getState().setActiveSurah(ALL_SURAHS[1]);
        useQuranStore.getState().setIsPlayingFullSurah(true);
      });

      // The selected reciter remains unchanged, but playback is disabled (URL is null)
      expect(hookResultRef.current.currentAudioUrl).toBeNull();

      // Surah changes to Surah 20 (Ta-Ha - recorded)
      await act(async () => {
        useQuranStore.getState().setActiveSurah(ALL_SURAHS[19]);
        useQuranStore.getState().setIsPlayingFullSurah(true);
      });

      expect(hookResultRef.current.currentAudioUrl).toBe('https://server14.mp3quran.net/deban/020.mp3');
    });

    it('hook useRiwayahReciters: invalidates previous reciter immediately during actual delayed request, blocking playback until new list arrives', async () => {
      const warsh = QIRAAT_LIST.find((q) => q.id === 'warsh')!;
      const shoaba = QIRAAT_LIST.find((q) => q.id === 'shoaba')!;

      useQuranStore.setState({
        activeQiraah: warsh,
        activeSurah: ALL_SURAHS[0],
        isPlayingFullSurah: true,
      });

      let resolveShoabaPromise!: (value: RiwayahReciterEntry[]) => void;
      const delayedShoabaPromise = new Promise<RiwayahReciterEntry[]>((resolve) => {
        resolveShoabaPromise = resolve;
      });

      vi.spyOn(mp3Engine, 'getRecitersForRiwayah').mockImplementation(async (riwayahId: string) => {
        if (riwayahId === 'shoaba') {
          return delayedShoabaPromise;
        }
        return [
          {
            reciterId: 10,
            reciterName: 'قارئ ورش',
            moshafId: 5,
            moshafName: 'رواية ورش',
            server: 'https://server.example.com/warsh/',
            surahTotal: 114,
            surahList: [1, 2, 3],
            riwayahId: 'warsh',
          },
        ];
      });

      const recitersHookRef = { current: null as unknown as ReturnType<typeof useRiwayahReciters> };
      const audioHookRef = { current: null as unknown as ReturnType<typeof useQuranAudio> };

      function TestIntegrationComponent() {
        const recitersHook = useRiwayahReciters();
        const audioHook = useQuranAudio({ activeRiwayahReciter: recitersHook.activeRiwayahReciter });
        useEffect(() => {
          recitersHookRef.current = recitersHook;
          audioHookRef.current = audioHook;
        });
        return React.createElement(
          'div',
          null,
          React.createElement('span', { 'data-testid': 'url' }, audioHook.currentAudioUrl || 'none')
        );
      }

      // Step 1: Initial mount on Warsh
      await act(async () => {
        root?.render(React.createElement(TestIntegrationComponent));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(recitersHookRef.current.activeRiwayahReciter?.riwayahId).toBe('warsh');
      expect(audioHookRef.current.currentAudioUrl).toBe('https://server.example.com/warsh/001.mp3');

      // Step 2: User switches to Shoaba with delayed response
      await act(async () => {
        recitersHookRef.current.handleSelectQiraah(shoaba);
      });

      // Step 3: During delayed request window, previous reciter MUST be null, list empty, audio URL blocked
      // Even if full surah playback is attempted during the delay window:
      await act(async () => {
        useQuranStore.getState().setIsPlayingFullSurah(true);
      });
      expect(recitersHookRef.current.activeRiwayahReciter).toBeNull();
      expect(recitersHookRef.current.riwayahReciters).toHaveLength(0);
      expect(recitersHookRef.current.isLoadingReciters).toBe(true);
      expect(audioHookRef.current.currentAudioUrl).toBeNull();

      // Step 4: Resolve the delayed response with Shoaba reciters
      await act(async () => {
        resolveShoabaPromise([
          {
            reciterId: 20,
            reciterName: 'قارئ شعبة',
            moshafId: 8,
            moshafName: 'رواية شعبة',
            server: 'https://server.example.com/shoaba/',
            surahTotal: 1,
            surahList: [1],
            riwayahId: 'shoaba',
          },
        ]);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // User initiates playback for the new Shoaba surah
      await act(async () => {
        useQuranStore.getState().setIsPlayingFullSurah(true);
      });

      // Step 5: New reciter active and playback works for Shoaba surah 1
      expect(recitersHookRef.current.activeRiwayahReciter?.riwayahId).toBe('shoaba');
      expect(recitersHookRef.current.riwayahReciters).toHaveLength(1);
      expect(recitersHookRef.current.isLoadingReciters).toBe(false);
      expect(audioHookRef.current.currentAudioUrl).toBe('https://server.example.com/shoaba/001.mp3');
    });

    it('hook useRiwayahReciters: re-selecting active Hafs twice preserves reciter and playback availability without wiping', async () => {
      const hafs = QIRAAT_LIST.find((q) => q.id === 'hafs')!;
      useQuranStore.setState({
        activeQiraah: hafs,
        activeSurah: ALL_SURAHS[0],
        isPlayingFullSurah: true,
      });

      vi.spyOn(mp3Engine, 'getRecitersForRiwayah').mockResolvedValue([
        {
          reciterId: 1,
          reciterName: 'مشاري العفاسي',
          moshafId: 1,
          moshafName: 'حفص عن عاصم',
          server: 'https://server8.mp3quran.net/afs/',
          surahTotal: 114,
          surahList: Array.from({ length: 114 }, (_, i) => i + 1),
          riwayahId: 'hafs',
        },
      ]);

      const recitersHookRef = { current: null as unknown as ReturnType<typeof useRiwayahReciters> };
      const audioHookRef = { current: null as unknown as ReturnType<typeof useQuranAudio> };

      function TestHafsComponent() {
        const recitersHook = useRiwayahReciters();
        const audioHook = useQuranAudio({ activeRiwayahReciter: recitersHook.activeRiwayahReciter });
        useEffect(() => {
          recitersHookRef.current = recitersHook;
          audioHookRef.current = audioHook;
        });
        return React.createElement('div', null);
      }

      await act(async () => {
        root?.render(React.createElement(TestHafsComponent));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Initial load: reciter and audio available
      expect(recitersHookRef.current.activeRiwayahReciter?.reciterName).toBe('مشاري العفاسي');
      expect(recitersHookRef.current.riwayahReciters).toHaveLength(1);
      expect(audioHookRef.current.currentAudioUrl).toBe('https://server8.mp3quran.net/afs/001.mp3');

      // 1st re-selection of Hafs: MUST NOT wipe reciter or audio
      await act(async () => {
        recitersHookRef.current.handleSelectQiraah(hafs);
      });

      expect(recitersHookRef.current.activeRiwayahReciter).not.toBeNull();
      expect(recitersHookRef.current.activeRiwayahReciter?.reciterName).toBe('مشاري العفاسي');
      expect(recitersHookRef.current.riwayahReciters).toHaveLength(1);
      expect(audioHookRef.current.currentAudioUrl).toBe('https://server8.mp3quran.net/afs/001.mp3');

      // 2nd re-selection of Hafs: STILL preserved and playback available
      await act(async () => {
        recitersHookRef.current.handleSelectQiraah(hafs);
      });

      expect(recitersHookRef.current.activeRiwayahReciter).not.toBeNull();
      expect(recitersHookRef.current.activeRiwayahReciter?.reciterName).toBe('مشاري العفاسي');
      expect(recitersHookRef.current.riwayahReciters).toHaveLength(1);
      expect(audioHookRef.current.currentAudioUrl).toBe('https://server8.mp3quran.net/afs/001.mp3');
    });

    it('playback path: rejects recording lacking riwayahId or mismatching active Riwayah in both isSurahAvailableInRecording and useQuranAudio', async () => {
      const hafs = QIRAAT_LIST.find((q) => q.id === 'hafs')!;
      useQuranStore.setState({
        activeQiraah: hafs,
        activeSurah: ALL_SURAHS[0],
        isPlayingFullSurah: true,
      });

      // 1. Reciter lacking riwayahId entirely (undefined)
      const reciterNoRiwayah: RiwayahReciterEntry = {
        reciterId: 10,
        reciterName: 'قارئ بدون هوية رواية',
        moshafId: 1,
        moshafName: 'مجهول',
        server: 'https://server.example.com/',
        surahTotal: 114,
        surahList: [1, 2, 3],
      };

      expect(isSurahAvailableInRecording(reciterNoRiwayah, 1, 'hafs')).toBe(false);

      const hookResultRef = { current: null as unknown as ReturnType<typeof useQuranAudio> };
      function TestAudioComponent({ r }: { r: RiwayahReciterEntry }) {
        const audio = useQuranAudio({ activeRiwayahReciter: r });
        useEffect(() => {
          hookResultRef.current = audio;
        });
        return React.createElement('div', null);
      }

      await act(async () => {
        root?.render(React.createElement(TestAudioComponent, { r: reciterNoRiwayah }));
      });
      expect(hookResultRef.current.currentAudioUrl).toBeNull();

      // 2. Reciter with mismatching riwayahId ('warsh' on active 'hafs')
      const reciterWarsh: RiwayahReciterEntry = {
        ...reciterNoRiwayah,
        riwayahId: 'warsh',
      };

      expect(isSurahAvailableInRecording(reciterWarsh, 1, 'hafs')).toBe(false);

      await act(async () => {
        root?.render(React.createElement(TestAudioComponent, { r: reciterWarsh }));
      });
      expect(hookResultRef.current.currentAudioUrl).toBeNull();

      // 3. Reciter with valid matching riwayahId ('hafs')
      const reciterHafs: RiwayahReciterEntry = {
        ...reciterNoRiwayah,
        riwayahId: 'hafs',
      };

      expect(isSurahAvailableInRecording(reciterHafs, 1, 'hafs')).toBe(true);

      await act(async () => {
        root?.render(React.createElement(TestAudioComponent, { r: reciterHafs }));
      });
      expect(hookResultRef.current.currentAudioUrl).toBe('https://server.example.com/001.mp3');
    });
  });
});
