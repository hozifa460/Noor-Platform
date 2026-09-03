import React, { useMemo } from 'react';

interface ArabicHighlightProps {
  text: string;
  query?: string;
  className?: string;
}

/**
 * Builds an Arabic diacritic-tolerant and prefix-aware regex for search terms.
 * Matches root letters regardless of Harakat (tashkeel), Alef/Yaa variants, and common prefixes (و، ف، ب، ك، ل).
 */
function buildArabicHighlightRegex(query: string): RegExp | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const diacritics = '[\\u0617-\\u061A\\u064B-\\u0652\\u0670\\u0640]*';
  const tokens = trimmed.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return null;

  const patterns = tokens.map((token) => {
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
  });

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
    const regex = buildArabicHighlightRegex(query);
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
              className="bg-amber-500/25 dark:bg-amber-400/25 text-amber-950 dark:text-amber-100 font-extrabold px-1 py-0.5 rounded-md border-b-2 border-amber-500/60 shadow-xs inline-block mx-0.5 select-text transition-colors"
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
