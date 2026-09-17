import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useQuranStore, useQuranAudio } from '../model';
import { ALL_SURAHS, QIRAAT_LIST } from '../domain';
import type { RiwayahReciterEntry } from '../infrastructure';

describe('Quran Audio Playback Rejection & Stale Request Isolation Suite', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const mockReciter: RiwayahReciterEntry = {
    reciterId: 102,
    reciterName: 'ماهر المعيقلي',
    moshafId: 102,
    moshafName: 'حفص عن عاصم - مرتل',
    server: 'https://server12.mp3quran.net/maher/',
    surahTotal: 114,
    surahList: [1, 2, 3],
    riwayahId: 'hafs',
  };

  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    if (!window.HTMLMediaElement.prototype.load) {
      window.HTMLMediaElement.prototype.load = () => {};
    } else {
      vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    }

    // Reset store state
    useQuranStore.setState({
      activeQiraah: QIRAAT_LIST[0], // Hafs
      activeSurah: ALL_SURAHS[0], // Surah 1
      surahData: {
        surahNo: 1,
        nameAr: 'الفاتحة',
        nameEn: 'Al-Fatihah',
        nameRoman: 'Al-Fatihah',
        placeOfRevelation: 'Meccan',
        totalAyahs: 7,
        ayahs: [],
      },
      isPlayingAudio: false,
      isPlayingFullSurah: false,
      currentPlayingAyah: null,
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

  it('resets UI state to stopped when current play() is rejected with NotAllowedError (e.g. autoplay policy)', async () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      const error = new Error('play() failed because the user did not interact with the document first.');
      error.name = 'NotAllowedError';
      return Promise.reject(error);
    });
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    function TestAudio() {
      const audio = useQuranAudio({ activeRiwayahReciter: mockReciter });
      return <audio ref={audio.audioRef} />;
    }

    await act(async () => {
      root?.render(<TestAudio />);
    });

    // Start playback
    await act(async () => {
      useQuranStore.getState().setIsPlayingFullSurah(true);
    });

    expect(playSpy).toHaveBeenCalled();

    // Allow promise rejection microtasks to process
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // UI state must be synchronized: reset to stopped
    expect(useQuranStore.getState().isPlayingFullSurah).toBe(false);
    expect(useQuranStore.getState().isPlayingAudio).toBe(false);
  });

  it('resets UI state when verse-by-verse play() rejects with a runtime media error', async () => {
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      return Promise.reject(new Error('Media decode error'));
    });
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    function TestAudio() {
      const audio = useQuranAudio({ activeRiwayahReciter: mockReciter });
      return <audio ref={audio.audioRef} />;
    }

    await act(async () => {
      root?.render(<TestAudio />);
    });

    // Start verse playback for ayah 1
    await act(async () => {
      useQuranStore.setState({
        currentPlayingAyah: 1,
        isPlayingAudio: true,
      });
    });

    expect(playSpy).toHaveBeenCalled();

    // Allow promise rejection microtasks to process
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // UI state must be paused
    expect(useQuranStore.getState().isPlayingAudio).toBe(false);
  });

  it('stale/delayed rejection does NOT affect newer playback request (playRequestId guard)', async () => {
    let rejectRequest1: ((reason?: unknown) => void) | null = null;
    let resolveRequest2: (() => void) | null = null;

    let callCount = 0;
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First play request returns a deferred promise that we hold open
        return new Promise<void>((_, reject) => {
          rejectRequest1 = reject;
        });
      } else {
        // Second play request returns a deferred promise that will resolve successfully
        return new Promise<void>((resolve) => {
          resolveRequest2 = resolve;
        });
      }
    });
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    function TestAudio() {
      const audio = useQuranAudio({ activeRiwayahReciter: mockReciter });
      return <audio ref={audio.audioRef} />;
    }

    await act(async () => {
      root?.render(<TestAudio />);
    });

    // 1. Trigger Request 1 (play Surah 1)
    await act(async () => {
      useQuranStore.setState({
        activeSurah: ALL_SURAHS[0], // Surah 1
        isPlayingFullSurah: true,
      });
    });

    expect(callCount).toBe(1);
    expect(rejectRequest1).not.toBeNull();

    // 2. User quickly switches to Surah 2 while Request 1 is still pending
    // This increments playRequestIdRef to 2
    await act(async () => {
      useQuranStore.setState({
        activeSurah: ALL_SURAHS[1], // Surah 2
      });
    });

    expect(callCount).toBe(2);

    // 3. Now Request 1's play() promise REJECTS with NotAllowedError / network failure
    await act(async () => {
      rejectRequest1!(new Error('Older request aborted or failed'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // CRUCIAL ASSERTION:
    // Request 1 rejection MUST BE IGNORED because playRequestIdRef has moved to 2.
    // The UI must NOT reset to false!
    expect(useQuranStore.getState().isPlayingFullSurah).toBe(true);

    // 4. Request 2 resolves successfully
    await act(async () => {
      resolveRequest2!();
      await Promise.resolve();
    });

    // Still playing for Request 2
    expect(useQuranStore.getState().isPlayingFullSurah).toBe(true);
  });

  it('ignores AbortError during rapid source changes without stopping active playback', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => {
      const abortError = new Error('The play() request was interrupted by a new load request.');
      abortError.name = 'AbortError';
      return Promise.reject(abortError);
    });
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    function TestAudio() {
      const audio = useQuranAudio({ activeRiwayahReciter: mockReciter });
      return <audio ref={audio.audioRef} />;
    }

    await act(async () => {
      root?.render(<TestAudio />);
    });

    // Start playback
    await act(async () => {
      useQuranStore.getState().setIsPlayingFullSurah(true);
    });

    // Allow microtasks to process
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // AbortError should NOT reset state (handled gracefully as routine source interruption)
    expect(useQuranStore.getState().isPlayingFullSurah).toBe(true);
  });
});
