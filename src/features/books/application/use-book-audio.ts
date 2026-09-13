'use client';

import { useTextToSpeech } from '@/hooks/use-text-to-speech';
import type { BookChapterChunk } from '../domain';

export function useBookAudio(chunkData: BookChapterChunk | null) {
  const { isSpeaking, speak: ttsSpeak, stop: ttsStop } = useTextToSpeech({
    lang: 'ar-SA',
    rate: 0.9,
  });

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      ttsStop('تم إيقاف القراءة الصوتية');
      return;
    }
    if (!chunkData?.paragraphs?.length) return;
    const fullText = chunkData.paragraphs.map((p) => p.text).join(' ');
    ttsSpeak(fullText.slice(0, 4000), 'بدأت القراءة الصوتية للنص');
  };

  return {
    isSpeaking,
    ttsStop,
    handleToggleSpeech,
  };
}
