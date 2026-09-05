'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAyahAudioLoopProps {
  audioUrl: string;
}

export function useAyahAudioLoop({ audioUrl }: UseAyahAudioLoopProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [repeatLimit, setRepeatLimit] = useState<number>(3);
  const [repeatCount, setRepeatCount] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(console.warn);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl]);

  const handleAudioEnded = useCallback(() => {
    const nextCount = repeatCount + 1;
    if (nextCount < repeatLimit) {
      setRepeatCount(nextCount);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.warn);
        }
      }, 800);
    } else {
      setIsPlaying(false);
      setRepeatCount(0);
    }
  }, [repeatCount, repeatLimit]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const resetLoop = useCallback(() => {
    setIsPlaying(false);
    setRepeatCount(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

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
