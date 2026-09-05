'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuranStore } from '@/stores/quran-store';
import { getMp3QuranSurahUrl, type RiwayahReciterEntry } from '@/lib/quran';
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
  const [targetSeekAyah, setTargetSeekAyah] = useState<number | null>(null);

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
        console.warn('Audio play prevented or format fallback:', err);
      });
    } else {
      audio.pause();
    }
  }, [isPlayingAudio, isPlayingFullSurah, currentAudioUrl]);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration || 0;
    setDuration(dur);

    if (isPlayingFullSurah && targetSeekAyah && surahData && dur > 0) {
      const totalChars = surahData.ayahs.reduce((acc, a) => acc + a.textAr.length, 0);
      const charsBefore = surahData.ayahs
        .slice(0, Math.max(0, targetSeekAyah - 1))
        .reduce((acc, a) => acc + a.textAr.length, 0);
      const fraction = totalChars > 0 ? charsBefore / totalChars : 0;
      const targetSec = fraction * dur;
      audioRef.current.currentTime = targetSec;
      setCurrentTime(targetSec);
      setTargetSeekAyah(null);
    }
  }, [isPlayingFullSurah, targetSeekAyah, surahData]);

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
    targetSeekAyah,
    setTargetSeekAyah,
    currentAudioUrl,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleAudioEnded,
    handleSeek,
    handleFastForward,
    handleRewind,
  };
}
