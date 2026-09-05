'use client';

import DOMPurify, { type Config } from 'dompurify';

/**
 * Sanitizes tafsir / translation HTML that comes from third-party APIs
 * (qurancdn, alquran.cloud) before it is rendered via dangerouslySetInnerHTML.
 *
 * Only presentational inline markup is kept. Scripts, event handlers,
 * iframes, forms, styles and any URL-bearing attribute are stripped so a
 * compromised upstream cannot execute code in the reader.
 */
const TAFSIR_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'sup', 'sub',
    'span', 'div', 'blockquote', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ],
  ALLOWED_ATTR: ['class', 'dir', 'lang'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
};

export function sanitizeTafsirHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') {
    // SSR: fall back to escaping — the component renders client-side anyway.
    return html.replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'));
  }
  return DOMPurify.sanitize(html, TAFSIR_CONFIG) as string;
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function stripTagsLinear(str: string): string {
  let out = '';
  let inTag = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '<') {
      inTag = true;
    } else if (char === '>') {
      inTag = false;
    } else if (!inTag) {
      out += char;
    }
  }
  return out
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g, (entity) => HTML_ENTITY_MAP[entity] || entity)
    .trim();
}

/**
 * Robustly strips HTML tags to produce safe plain text without vulnerable regexes.
 * Uses DOMPurify + DOMParser in the browser, and safe linear state parsing in SSR.
 * Used for clipboard copy operations and plain text formatting.
 */
export function stripHtmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') {
    return stripTagsLinear(html);
  }
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], KEEP_CONTENT: true }) as string;
  try {
    const doc = new DOMParser().parseFromString(clean, 'text/html');
    return (doc.body.textContent || clean).trim();
  } catch {
    return clean.trim();
  }
}

