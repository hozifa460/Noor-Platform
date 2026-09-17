'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  const latestRequestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Invalidate previous reciter immediately during render pass upon Riwayah change
  if (prevQiraahId !== activeQiraah.id) {
    setPrevQiraahId(activeQiraah.id);
    setActiveRiwayahReciter(null);
    setRiwayahReciters([]);
    setIsLoadingReciters(true);
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      latestRequestIdRef.current += 1;
    };
  }, []);

  const fetchReciters = useCallback((targetQiraahId: string) => {
    const reqId = ++latestRequestIdRef.current;

    getRecitersForRiwayah(targetQiraahId)
      .then((list) => {
        // Discard stale responses:
        // 1. If component unmounted
        if (!isMountedRef.current) return;
        // 2. If a newer request was started
        if (reqId !== latestRequestIdRef.current) return;
        // 3. If active Riwayah in store has changed
        if (targetQiraahId !== useQuranStore.getState().activeQiraah.id) return;

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
        if (!isMountedRef.current) return;
        if (reqId !== latestRequestIdRef.current) return;
        if (targetQiraahId !== useQuranStore.getState().activeQiraah.id) return;
        setIsLoadingReciters(false);
      });

    return reqId;
  }, []);

  useEffect(() => {
    fetchReciters(activeQiraah.id);
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [activeQiraah.id, fetchReciters]);

  /**
   * Reload reciters for the active Riwayah explicitly.
   */
  const reloadReciters = useCallback(
    (force = true) => {
      const currentQiraah = useQuranStore.getState().activeQiraah.id;
      if (force || riwayahReciters.length === 0 || !activeRiwayahReciter) {
        setIsLoadingReciters(true);
        fetchReciters(currentQiraah);
      }
    },
    [fetchReciters, riwayahReciters.length, activeRiwayahReciter]
  );

  /**
   * Switch Riwayah or reload safely:
   * - If already on the same Riwayah: do NOT clear existing recordings; reload explicitly if empty.
   * - If switching to a new Riwayah: immediately invalidate in-flight requests, reset state, and update store.
   */
  const selectQiraah = useCallback(
    (q: QiraahMeta) => {
      if (q.id === activeQiraah.id) {
        if (riwayahReciters.length === 0 || !activeRiwayahReciter) {
          reloadReciters(true);
        }
        return;
      }
      latestRequestIdRef.current += 1;
      setActiveRiwayahReciter(null);
      setRiwayahReciters([]);
      setIsLoadingReciters(true);
      useQuranStore.getState().setActiveQiraah(q);
    },
    [activeQiraah.id, riwayahReciters.length, activeRiwayahReciter, reloadReciters]
  );

  return {
    riwayahReciters,
    setRiwayahReciters,
    activeRiwayahReciter,
    setActiveRiwayahReciter,
    isLoadingReciters,
    setIsLoadingReciters,
    selectQiraah,
    handleSelectQiraah: selectQiraah,
    reloadReciters,
  };
}
