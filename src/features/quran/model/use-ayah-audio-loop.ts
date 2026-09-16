'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuranStore } from './quran-store';

interface UseAyahAudioLoopProps {
  audioUrl: string;
}

export function useAyahAudioLoop({ audioUrl }: UseAyahAudioLoopProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatLimit, setRepeatLimit] = useState<number>(3);
  const [repeatCount, setRepeatCount] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && audioUrl) {
      // Prevent overlapping dual playbacks: stop any global surah or ayah audio
      useQuranStore.getState().stopAudio();
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch((err) => {
        console.warn('Loop playback prevented or failed:', err);
        clearTimer();
        setIsPlaying(false);
      });
    } else {
      clearTimer();
      audioRef.current.pause();
    }

    return () => {
      clearTimer();
    };
  }, [isPlaying, audioUrl, clearTimer]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      clearTimer();
      if (audio) {
        audio.pause();
      }
    };
  }, [clearTimer]);

  const handleAudioEnded = useCallback(() => {
    const nextCount = repeatCount + 1;
    if (nextCount < repeatLimit) {
      setRepeatCount(nextCount);
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((err) => {
            console.warn('Loop repeat playback prevented or failed:', err);
            clearTimer();
            setIsPlaying(false);
          });
        }
      }, 800);
    } else {
      clearTimer();
      setIsPlaying(false);
      setRepeatCount(0);
    }
  }, [repeatCount, repeatLimit, clearTimer]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (prev) {
        clearTimer();
      }
      return !prev;
    });
  }, [clearTimer]);

  const resetLoop = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setRepeatCount(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [clearTimer]);

  return {
    audioRef,
    isPlaying,
    setIsPlaying,
    repeatLimit,
    setRepeatLimit,
    repeatCount,
    setRepeatCount,
    handleAudioEnded,
    togglePlay,
    resetLoop,
  };
}
