'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuranStore } from './quran-store';
import {
  getMp3QuranSurahUrl,
  isSurahAvailableInRecording,
  type RiwayahReciterEntry,
} from '../infrastructure';
import { getAyahAudioUrl, isAyahAudioSupportedForQiraah } from '../domain';

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
  const isPlayingFullSurah = useQuranStore((s) => s.isPlayingFullSurah);
  const setIsPlayingFullSurah = useQuranStore((s) => s.setIsPlayingFullSurah);
  const registerAudioElement = useQuranStore((s) => s.registerAudioElement);
  const playNextAyah = useQuranStore((s) => s.playNextAyah);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    registerAudioElement(audioRef.current);
    return () => {
      registerAudioElement(null);
    };
  }, [registerAudioElement]);

  const currentAudioUrl = useMemo(() => {
    if (isPlayingFullSurah) {
      if (!activeRiwayahReciter) return null;
      // In the playback path, reject any recording that lacks riwayahId or does not match activeQiraah
      if (!activeRiwayahReciter.riwayahId || activeRiwayahReciter.riwayahId !== activeQiraah.id) {
        return null;
      }
      // Strict unified guard: verify current surah exists in reciter's recorded surahList and matches activeQiraah
      if (!isSurahAvailableInRecording(activeRiwayahReciter, activeSurah.number, activeQiraah.id)) {
        return null;
      }
      return getMp3QuranSurahUrl(activeRiwayahReciter.server, activeSurah.number);
    }
    if (!currentPlayingAyah || !surahData || !isAyahAudioSupportedForQiraah(activeQiraah.id)) {
      return null;
    }
    return getAyahAudioUrl(
      activeReciter.subfolder,
      surahData.surahNo,
      currentPlayingAyah,
      activeQiraah.id
    );
  }, [
    currentPlayingAyah,
    surahData,
    activeReciter.subfolder,
    isPlayingFullSurah,
    activeRiwayahReciter,
    activeSurah.number,
    activeQiraah.id,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Strict guard: if no valid audio URL exists, clean up audio element and stop playback
    if (!currentAudioUrl) {
      if (audio.src) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      if (isPlayingFullSurah) {
        setIsPlayingFullSurah(false);
      }
      if (isPlayingAudio) {
        useQuranStore.getState().pauseAudio();
      }
      return;
    }

    // When audio URL changes (e.g. reciter switched or next ayah/surah selected), update src
    const isUrlChanged = audio.src !== currentAudioUrl;
    if (isUrlChanged) {
      audio.src = currentAudioUrl;
      audio.currentTime = 0;
    }

    if (isPlayingAudio || isPlayingFullSurah) {
      audio.play().catch((err: unknown) => {
        const error = err as Error;
        // Ignore AbortError when changing audio sources (HTML5 media spec interrupts previous load)
        // Also ignore NotAllowedError in environments with strict autoplay policy
        if (error?.name === 'AbortError' || error?.name === 'NotAllowedError') {
          return;
        }
        console.warn('Audio play prevented or failed:', err);
        // Synchronize state with reality if play was genuinely rejected
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
  }, [isPlayingAudio, isPlayingFullSurah, currentAudioUrl, setIsPlayingFullSurah]);

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
  }, [isPlayingFullSurah, playNextAyah, setIsPlayingFullSurah]);

  const handleAudioError = useCallback(() => {
    console.warn('Audio resource load failed or was aborted');
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (isPlayingAudio) {
      useQuranStore.getState().pauseAudio();
    }
    if (isPlayingFullSurah) {
      setIsPlayingFullSurah(false);
    }
  }, [isPlayingAudio, isPlayingFullSurah, setIsPlayingFullSurah]);

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
