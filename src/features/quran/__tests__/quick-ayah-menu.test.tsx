import { describe, it, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QuickAyahMenu } from '../ui/QuickAyahMenu';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_RECITERS,
  findMatchingFullSurahReciter,
  type ReciterMeta,
} from '../domain';
import type { RiwayahReciterEntry } from '../infrastructure';

describe('QuickAyahMenu Integration & Reciter Selection Suite', () => {
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

  it('selecting Muhammad Ayyoub in QuickAyahMenu preserves moshaf 320 instead of reverting to 109', async () => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    // Simulate state: user had Ayyoub Special (320) selected as full surah reciter, and Alafasy as active verse reciter
    let activeRiwayahReciter: RiwayahReciterEntry | null = ayyoubSpecial;
    let activeReciter: ReciterMeta = QURAN_RECITERS.find((r) => r.id === 'alafasy')!;
    const riwayahReciters = [ayyoubMurattal, ayyoubSpecial];

    // The exact handler passed to QuickAyahMenu in QuranHubView.tsx
    const handleSelectActiveReciter = (r: ReciterMeta) => {
      activeReciter = r;
      const matchingFull = findMatchingFullSurahReciter(r, riwayahReciters, activeRiwayahReciter);
      if (matchingFull) {
        activeRiwayahReciter = matchingFull;
      }
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QuickAyahMenu
          ayah={{
            ayahNo: 1,
            ayahNoQuran: 1,
            textAr: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
            textEn: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
            juz: 1,
          }}
          surah={ALL_SURAHS[0]}
          activeQiraah={QIRAAT_LIST[0]}
          onClose={() => {}}
          isVerseLevelAvailable={true}
          activeReciter={activeReciter}
          onSelectActiveReciter={handleSelectActiveReciter}
          riwayahReciters={riwayahReciters}
          activeRiwayahReciter={activeRiwayahReciter}
          onSelectRiwayahReciter={() => {}}
          onPlayAyah={() => {}}
          onOpenDetailModal={() => {}}
          onPlayFullSurah={() => {}}
          onCopyAyah={() => {}}
        />
      );
    });

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe('alafasy');

    // User selects Muhammad Ayyoub from the QuickAyahMenu select dropdown
    await act(async () => {
      select.value = 'ayyoub';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verification 1: verse reciter is updated to Muhammad Ayyoub
    expect(activeReciter.id).toBe('ayyoub');

    // Verification 2: full surah reciter preserves moshaf 320 and does NOT revert to default 109
    expect(activeRiwayahReciter).not.toBeNull();
    expect(activeRiwayahReciter?.reciterId).toBe(109);
    expect(activeRiwayahReciter?.moshafId).toBe(320);

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
