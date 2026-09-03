'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UseTextToSpeechOptions {
  lang?: string;
  rate?: number;
}

export function useTextToSpeech({ lang = 'ar-SA', rate = 0.85 }: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string, startMessage?: string | false) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        toast.error('المتصفح لا يدعم القراءة الصوتية');
        return;
      }

      if (!text || !text.trim()) {
        toast.warning('لا يوجد نص للقراءة');
        return;
      }

      if (isSpeaking) {
        window.speechSynthesis.cancel();
        if (isMountedRef.current) setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.onend = () => {
        if (isMountedRef.current) setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (isMountedRef.current) setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      if (isMountedRef.current) setIsSpeaking(true);
      if (startMessage !== false) {
        toast.info(startMessage || 'جاري قراءة النص صوتياً...');
      }
    },
    [isSpeaking, lang, rate]
  );

  const stop = useCallback((stopMessage?: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isMountedRef.current) {
        setIsSpeaking(false);
      }
      if (stopMessage) {
        toast.info(stopMessage);
      }
    }
  }, []);

  return { isSpeaking, speak, stop, cancel: stop };
}
