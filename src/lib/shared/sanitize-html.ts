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
