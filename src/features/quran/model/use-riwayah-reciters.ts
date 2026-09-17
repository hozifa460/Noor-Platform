'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuranStore } from './quran-store';
import {
  getRecitersForRiwayah,
  type RiwayahReciterEntry,
} from '../infrastructure';
import type { QiraahMeta } from '../domain';

export function useRiwayahReciters() {
  const activeQiraah = useQuranStore((s) => s.activeQiraah);
  const [prevQiraahId, setPrevQiraahId] = useState(activeQiraah.id);
  const [riwayahReciters, setRiwayahReciters] = useState<RiwayahReciterEntry[]>([]);
  const [activeRiwayahReciter, setActiveRiwayahReciter] = useState<RiwayahReciterEntry | null>(null);
  const [isLoadingReciters, setIsLoadingReciters] = useState<boolean>(false);

  // Invalidate previous reciter immediately during render pass upon Riwayah change
  if (prevQiraahId !== activeQiraah.id) {
    setPrevQiraahId(activeQiraah.id);
    setActiveRiwayahReciter(null);
    setRiwayahReciters([]);
    setIsLoadingReciters(true);
  }

  useEffect(() => {
    let isCancelled = false;

    getRecitersForRiwayah(activeQiraah.id)
      .then((list) => {
        if (!isCancelled) {
          setRiwayahReciters(list);
          const currentSurahNo = useQuranStore.getState().activeSurah.number;
          const best =
            list.find(
              (r) => Array.isArray(r.surahList) && r.surahList.includes(currentSurahNo)
            ) || (list.length > 0 ? list[0] : null);
          setActiveRiwayahReciter(best);
          setIsLoadingReciters(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoadingReciters(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeQiraah.id]);

  /**
   * Switch Riwayah safely:
   * - If already on the same Riwayah, do NOT clear existing recordings.
   * - If recordings were cleared/empty for any reason, reload them explicitly.
   */
  const handleSelectQiraah = useCallback(
    (q: QiraahMeta) => {
      if (q.id === activeQiraah.id) {
        if (riwayahReciters.length === 0 || !activeRiwayahReciter) {
          setIsLoadingReciters(true);
          getRecitersForRiwayah(q.id)
            .then((list) => {
              setRiwayahReciters(list);
              const currentSurahNo = useQuranStore.getState().activeSurah.number;
              const best =
                list.find(
                  (r) => Array.isArray(r.surahList) && r.surahList.includes(currentSurahNo)
                ) || (list.length > 0 ? list[0] : null);
              setActiveRiwayahReciter(best);
              setIsLoadingReciters(false);
            })
            .catch(() => {
              setIsLoadingReciters(false);
            });
        }
        return;
      }
      setActiveRiwayahReciter(null);
      setRiwayahReciters([]);
      useQuranStore.getState().setActiveQiraah(q);
    },
    [activeQiraah.id, riwayahReciters.length, activeRiwayahReciter]
  );

  return {
    riwayahReciters,
    setRiwayahReciters,
    activeRiwayahReciter,
    setActiveRiwayahReciter,
    isLoadingReciters,
    setIsLoadingReciters,
    handleSelectQiraah,
  };
}
