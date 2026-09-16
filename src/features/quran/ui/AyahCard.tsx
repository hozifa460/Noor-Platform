'use client';

import { useMemo } from 'react';
import { Play, Pause, Copy, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type AyahItem, type QuranWordTarget, tokenizeAyahWords } from '../domain';
import { cn } from '@/lib/utils';

interface AyahCardProps {
  ayah: AyahItem;
  surahNo?: number;
  isPlaying: boolean;
  isAudioSupported?: boolean;
  onPlay: () => void;
  onOpenDetail: () => void;
  onCopy: (e: React.MouseEvent) => void;
  isCopied: boolean;
  isHighlighted?: boolean;
  fontSize: number;
  showTranslation: boolean;
  translationText?: string;
  translationDirection?: 'rtl' | 'ltr';
  isEnglishTranslation?: boolean;
  onWordClick?: (target: QuranWordTarget) => void;
  selectedWordIndex?: number | null;
}

export function AyahCard({
  ayah,
  surahNo,
  isPlaying,
  isAudioSupported = true,
  onPlay,
  onOpenDetail,
  onCopy,
  isCopied,
  isHighlighted = false,
  fontSize,
  showTranslation,
  translationText,
  translationDirection = 'ltr',
  isEnglishTranslation = true,
  onWordClick,
  selectedWordIndex,
}: AyahCardProps) {
  const words = useMemo(() => tokenizeAyahWords(ayah.textAr), [ayah.textAr]);
  return (
    <div
      id={`ayah-${ayah.ayahNo}`}
      className={cn(
        'group relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 text-right',
        isPlaying
          ? 'bg-primary/5 border-primary/60 shadow-lg ring-2 ring-primary/20 -translate-y-0.5'
          : 'bg-card border-border/80 hover:border-primary/40 hover:shadow-sm',
        isHighlighted && 'ring-2 sm:ring-4 ring-primary ring-offset-2 ring-offset-background border-primary shadow-2xl bg-primary/10 transition-all duration-500'
      )}
    >
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'size-7 sm:size-8 rounded-full text-xs font-mono font-bold grid place-items-center border',
              isPlaying
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-border text-muted-foreground'
            )}
          >
            {ayah.ayahNo}
          </span>
          {ayah.isSajdah && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
              سجدة تلاوة ۩
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className={cn('size-8 rounded-lg', !isAudioSupported && 'opacity-40 cursor-not-allowed')}
            disabled={!isAudioSupported}
            onClick={isAudioSupported ? onPlay : undefined}
            title={
              !isAudioSupported
                ? 'تلاوة مقاطع الآيات غير متوفرة لهذه الرواية'
                : isPlaying
                ? 'إيقاف مؤقت'
                : 'استماع للآية'
            }
          >
            {isPlaying ? (
              <Pause className="size-4 text-primary" />
            ) : (
              <Play className="size-4 text-muted-foreground group-hover:text-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onOpenDetail}
            title="التفسير والإعراب والترجمة"
          >
            <BookOpen className="size-4 text-muted-foreground group-hover:text-primary" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg"
            onClick={onCopy}
            title="نسخ نص الآية"
          >
            {isCopied ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <Copy className="size-4 text-muted-foreground group-hover:text-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Ayah Text */}
      <div
        className="font-serif leading-loose select-text cursor-pointer hover:text-primary transition-colors text-stone-900 dark:text-stone-100"
        style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 2.2}px` }}
        onClick={onOpenDetail}
      >
        {onWordClick && surahNo ? (
          words.map((token, idx) => {
            const isSelected = token.type === 'word' && selectedWordIndex === token.wordIndex;
            return (
              <span key={token.type === 'word' ? `word-${token.wordIndex}` : `waqf-${idx}`}>
                {idx > 0 && ' '}
                {token.type === 'waqf' ? (
                  <span className="inline-block px-0.5 text-muted-foreground/80">
                    {token.text}
                  </span>
                ) : (
                  <span
                    id={`word-token-${surahNo}-${ayah.ayahNo}-${token.wordIndex}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`استكشف كلمة: ${token.text}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onWordClick && token.wordIndex) {
                        onWordClick({
                          surahNo,
                          ayahNo: ayah.ayahNo,
                          wordIndex: token.wordIndex,
                          wordText: token.text,
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onWordClick && token.wordIndex) {
                          onWordClick({
                            surahNo,
                            ayahNo: ayah.ayahNo,
                            wordIndex: token.wordIndex,
                            wordText: token.text,
                          });
                        }
                      }
                    }}
                    className={cn(
                      'inline-block px-1 py-0.5 rounded-lg transition-colors cursor-pointer',
                      'hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      isSelected && 'bg-primary/20 text-primary font-bold ring-1 ring-primary/40'
                    )}
                    title={`استكشف كلمة: ${token.text}`}
                  >
                    {token.text}
                  </span>
                )}
              </span>
            );
          })
        ) : (
          ayah.textAr
        )}
        <span className="inline-block mx-2 text-primary font-mono text-base select-none">
          ﴿{ayah.ayahNo}﴾
        </span>
      </div>

      {/* Translation if enabled */}
      {showTranslation && (
        <div
          dir={translationDirection}
          className={cn(
            'mt-3 pt-3 border-t border-border/50 text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed',
            translationDirection === 'rtl' ? 'text-right' : 'text-left'
          )}
        >
          {translationText ? (
            translationText
          ) : isEnglishTranslation ? (
            ayah.textEn
          ) : (
            <span className="italic opacity-60">الترجمة غير متوفرة لهذه الآية</span>
          )}
        </div>
      )}
    </div>
  );
}
