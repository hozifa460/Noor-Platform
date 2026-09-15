'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuranStore } from './quran-store';
import { getMp3QuranSurahUrl, type RiwayahReciterEntry } from '../infrastructure';
import { getWarshAyahAudioNumber } from '@/lib/shared';

interface UseQuranAudioProps {
  activeRiwayahReciter: RiwayahReciterEntry | null;
}

export function useQuranAudio({ activeRiwayahReciter }: UseQuranAudioProps) {
  const activeQiraah = useQuranStore((s) => s.activeQiraah);
  const activeSurah = useQuranStore((s) => s.activeSurah);
  const surahData = useQuranStore((s) => s.surahData);
  const activeReciter = useQuranStore((s) => s.activeReciter);
  const currentPlayingAyah = useQuranStore((s) => s.currentPlayingAyah);
  const isPlayingAudio = useQuranStore((s) => s.isPlayingAudio);
  const playNextAyah = useQuranStore((s) => s.playNextAyah);

  const [isPlayingFullSurah, setIsPlayingFullSurah] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentAudioUrl = useMemo(() => {
    if (isPlayingFullSurah && activeRiwayahReciter) {
      return getMp3QuranSurahUrl(activeRiwayahReciter.server, activeSurah.number);
    }
    if (!currentPlayingAyah || !surahData) return null;
    const sStr = String(surahData.surahNo).padStart(3, '0');
    const adjustedAyahNo =
      activeQiraah.id === 'warsh'
        ? getWarshAyahAudioNumber(surahData.surahNo, currentPlayingAyah)
        : currentPlayingAyah;
    const aStr = String(adjustedAyahNo).padStart(3, '0');
    return `https://everyayah.com/data/${activeReciter.subfolder}/${sStr}${aStr}.mp3`;
  }, [
    currentPlayingAyah,
    surahData,
    activeReciter,
    isPlayingFullSurah,
    activeRiwayahReciter,
    activeSurah.number,
    activeQiraah.id,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentAudioUrl && audio.src !== currentAudioUrl) {
      audio.src = currentAudioUrl;
    }

    if ((isPlayingAudio || isPlayingFullSurah) && currentAudioUrl) {
      audio.play().catch((err) => {
        console.warn('Audio play prevented or failed:', err);
        // Synchronize state with reality if play was rejected
        if (isPlayingAudio) {
          useQuranStore.getState().pauseAudio();
        }
        if (isPlayingFullSurah) {
          setIsPlayingFullSurah(false);
        }
      });
    } else {
      audio.pause();
    }
  }, [isPlayingAudio, isPlayingFullSurah, currentAudioUrl]);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || 0;
    setDuration(dur);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || isSeeking) return;
    setCurrentTime(audioRef.current.currentTime);
  }, [isSeeking]);

  const handleAudioEnded = useCallback(() => {
    if (isPlayingFullSurah) {
      setIsPlayingFullSurah(false);
      setCurrentTime(0);
      return;
    }
    playNextAyah();
  }, [isPlayingFullSurah, playNextAyah]);

  const handleAudioError = useCallback(() => {
    console.warn('Audio resource load failed or was aborted');
    if (isPlayingAudio) {
      useQuranStore.getState().pauseAudio();
    }
    if (isPlayingFullSurah) {
      setIsPlayingFullSurah(false);
    }
  }, [isPlayingAudio, isPlayingFullSurah]);

  const handleSeek = useCallback((val: number) => {
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  }, []);

  const handleFastForward = useCallback(() => {
    if (!audioRef.current) return;
    const next = Math.min(duration, audioRef.current.currentTime + 10);
    audioRef.current.currentTime = next;
    setCurrentTime(next);
  }, [duration]);

  const handleRewind = useCallback(() => {
    if (!audioRef.current) return;
    const prev = Math.max(0, audioRef.current.currentTime - 10);
    audioRef.current.currentTime = prev;
    setCurrentTime(prev);
  }, []);

  return {
    audioRef,
    currentTime,
    duration,
    isSeeking,
    setIsSeeking,
    isPlayingFullSurah,
    setIsPlayingFullSurah,
    currentAudioUrl,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleAudioEnded,
    handleAudioError,
    handleSeek,
    handleFastForward,
    handleRewind,
  };
}
