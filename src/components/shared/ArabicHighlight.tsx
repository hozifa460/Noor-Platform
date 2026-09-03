import React, { useMemo } from 'react';

export interface ArabicHighlightProps {
  text: string;
  query?: string;
  className?: string;
}

const MORPHOLOGICAL_DICTIONARY: Record<string, string[]> = {
  صيام: ['صيام', 'صوم', 'صام', 'صوموا', 'يصوم', 'الصائم', 'صائمين', 'صيامه', 'صيامكم'],
  صوم: ['صيام', 'صوم', 'صام', 'صوموا', 'يصوم', 'الصائم', 'صائمين', 'صيامه'],
  صدقة: ['صدقة', 'صدقات', 'تصدقوا', 'تصدق', 'المتصدقين', 'صدقته', 'صدقاتكم'],
  صلاة: ['صلاة', 'صلوات', 'صلوا', 'يصلي', 'المصلين', 'صلاته', 'صلاتهم'],
  علم: ['علم', 'تعلموا', 'يعلم', 'العلماء', 'علمه', 'علما', 'العلم'],
  والدين: ['والدين', 'والدي', 'والديه', 'والديك', 'والداه', 'أمه', 'أبوك'],
  بر: ['بر', 'بروا', 'البر', 'أبر'],
  صبر: ['صبر', 'صابروا', 'الصابرين', 'صبره', 'يصبر', 'اصبروا'],
  كذب: ['كذب', 'كذبا', 'كذاب', 'يكذب', 'الكاذبين'],
  توبة: ['توبة', 'يتوب', 'توبوا', 'تائبا', 'التائبين'],
  استغفار: ['استغفار', 'استغفروا', 'يستغفر', 'أستغفر', 'مستغفرين'],
  نية: ['نية', 'نيات', 'النيات', 'نياتكم', 'نوى', 'ينوي'],
};

const diacritics = '[\\u0617-\\u061A\\u064B-\\u0652\\u0670\\u0640]*';

function makeWordPattern(token: string): string {
  let pat = '(?:[وفبكل]' + diacritics + ')?';
  for (const ch of token) {
    if ('[اأإآٱ]'.includes(ch)) {
      pat += '[اأإآٱ]' + diacritics;
    } else if ('[يىئ]'.includes(ch)) {
      pat += '[يىئ]' + diacritics;
    } else if ('[ةه]'.includes(ch)) {
      pat += '[ةه]' + diacritics;
    } else if ('[وؤ]'.includes(ch)) {
      pat += '[وؤ]' + diacritics;
    } else {
      pat += ch + diacritics;
    }
  }
  return pat;
}

/**
 * Builds an intelligent Arabic regex:
 * 1. Matches whole continuous multi-word phrase first (e.g. "إنما الأعمال بالنيات").
 * 2. Matches morphological derivations (e.g. searching "صيام" highlights "صوموا" and "الصائم").
 * 3. Matches individual query tokens with prefix and tashkeel tolerance.
 */
export function buildSmartArabicHighlightRegex(query: string): RegExp | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const rawTokens = trimmed.split(/\s+/).filter((t) => t.length >= 2);
  if (rawTokens.length === 0) return null;

  const patterns: string[] = [];

  // 1. Multi-word Exact Phrase pattern (joined with flexible spaces/punctuation)
  if (rawTokens.length > 1) {
    const phrasePat = rawTokens
      .map(makeWordPattern)
      .join('(?:\\s*[,،:."«»]*\\s*)');
    patterns.push(phrasePat);
  }

  // 2. Morphological variants
  const expandedTokens = new Set<string>(rawTokens);
  for (const token of rawTokens) {
    // Strip common prefixes to check dictionary
    const stripped = token.replace(/^(?:ال|[وفبكل])/, '');
    if (MORPHOLOGICAL_DICTIONARY[token]) {
      for (const v of MORPHOLOGICAL_DICTIONARY[token]) expandedTokens.add(v);
    }
    if (stripped && MORPHOLOGICAL_DICTIONARY[stripped]) {
      for (const v of MORPHOLOGICAL_DICTIONARY[stripped]) expandedTokens.add(v);
    }
  }

  // 3. Token patterns sorted by length descending so longer words match first
  const sortedTokens = Array.from(expandedTokens).sort((a, b) => b.length - a.length);
  for (const token of sortedTokens) {
    patterns.push(makeWordPattern(token));
  }

  try {
    return new RegExp('(' + patterns.join('|') + ')', 'gi');
  } catch {
    return null;
  }
}

export const ArabicHighlight: React.FC<ArabicHighlightProps> = ({
  text,
  query,
  className,
}) => {
  const items = useMemo(() => {
    if (!query || !text) return null;
    const regex = buildSmartArabicHighlightRegex(query);
    if (!regex) return null;

    const splitParts = text.split(regex);
    if (splitParts.length <= 1) return null;

    return splitParts.map((part) => {
      const isMatch = Boolean(part && regex.test(part));
      regex.lastIndex = 0;
      return { text: part, isMatch };
    });
  }, [text, query]);

  if (!items) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {items.map((item, i) => {
        if (!item.text) return null;

        if (item.isMatch) {
          return (
            <mark
              key={i}
              className="bg-amber-500/25 dark:bg-amber-400/25 text-amber-950 dark:text-amber-100 font-extrabold px-1.5 py-0.5 rounded-md border-b-2 border-amber-500/60 shadow-xs inline-block mx-0.5 select-text transition-colors"
            >
              {item.text}
            </mark>
          );
        }

        return <React.Fragment key={i}>{item.text}</React.Fragment>;
      })}
    </span>
  );
};
