import { describe, it, expect } from 'vitest';
import { sanitizeTafsirHtml } from '@/lib/shared/sanitize-html';

describe('Tafsir HTML Sanitizer (shared/sanitize-html.ts)', () => {
  it('returns empty string for empty, null, or undefined input', () => {
    expect(sanitizeTafsirHtml('')).toBe('');
    // @ts-expect-error testing invalid type
    expect(sanitizeTafsirHtml(null)).toBe('');
    // @ts-expect-error testing invalid type
    expect(sanitizeTafsirHtml(undefined)).toBe('');
  });

  it('preserves approved inline and presentational HTML tags', () => {
    const input = '<p><b>قوله تعالى:</b> <i>الرَّحْمَٰنِ الرَّحِيمِ</i> <span>أي ذو الرحمة الواسعة</span></p>';
    const sanitized = sanitizeTafsirHtml(input);
    expect(sanitized).toBe(input);
  });

  it('preserves allowed block tags and lists', () => {
    const input = '<div><blockquote>نقل الإمام الطبري في تفسيره</blockquote><ul><li>الوجه الأول</li><li>الوجه الثاني</li></ul></div>';
    const sanitized = sanitizeTafsirHtml(input);
    expect(sanitized).toContain('<blockquote>نقل الإمام الطبري في تفسيره</blockquote>');
    expect(sanitized).toContain('<ul><li>الوجه الأول</li><li>الوجه الثاني</li></ul>');
  });

  it('preserves approved attributes (class, dir, lang)', () => {
    const input = '<p dir="rtl" class="ayah-explanation" lang="ar">تفسير الآية الكريمة</p>';
    const sanitized = sanitizeTafsirHtml(input);
    expect(sanitized).toContain('dir="rtl"');
    expect(sanitized).toContain('class="ayah-explanation"');
    expect(sanitized).toContain('lang="ar"');
  });

  it('strips <script> tags and malicious inline code', () => {
    const malicious = '<p>تفسير معتبر</p><script>alert("XSS")</script>';
    const sanitized = sanitizeTafsirHtml(malicious);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert("XSS")');
    expect(sanitized).toContain('تفسير معتبر');
  });

  it('strips dangerous event handlers (onerror, onload, onclick, onmouseover)', () => {
    const attack = '<span onclick="evil()" onmouseover="steal()" onfocus="pwn()">نص تفسيري</span><img src="x" onerror="alert(1)">';
    const sanitized = sanitizeTafsirHtml(attack);
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onmouseover');
    expect(sanitized).not.toContain('onfocus');
    expect(sanitized).not.toContain('<img>');
    expect(sanitized).toContain('نص تفسيري');
  });

  it('strips <iframe>, <object>, <embed>, <form>, and <input> tags', () => {
    const attack = '<iframe src="https://evil.com"></iframe><form action="/pwn"><input type="text"></form>';
    const sanitized = sanitizeTafsirHtml(attack);
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('<form');
    expect(sanitized).not.toContain('<input');
  });

  it('strips <style> tags and dangerous styles', () => {
    const attack = '<style>body { display: none; }</style><p>البيان</p>';
    const sanitized = sanitizeTafsirHtml(attack);
    expect(sanitized).not.toContain('<style');
    expect(sanitized).toContain('البيان');
  });

  it('strips javascript: pseudo-protocol URIs and disallows <a> tags by default', () => {
    const attack = '<a href="javascript:alert(1)">انقر هنا لقراءة المزيد</a>';
    const sanitized = sanitizeTafsirHtml(attack);
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('<a ');
    // Inner text is preserved safely
    expect(sanitized).toContain('انقر هنا لقراءة المزيد');
  });

  it('strips arbitrary data-* and aria-* attributes', () => {
    const input = '<p data-secret="123" aria-hidden="true">القول الراجح</p>';
    const sanitized = sanitizeTafsirHtml(input);
    expect(sanitized).not.toContain('data-secret');
    expect(sanitized).not.toContain('aria-hidden');
    expect(sanitized).toContain('القول الراجح');
  });

  it('strips <svg> and <math> markup with embedded handlers', () => {
    const attack = '<svg onload="alert(1)"><circle cx="10" cy="10" r="5" /></svg><p>تفسير صحيح</p>';
    const sanitized = sanitizeTafsirHtml(attack);
    expect(sanitized).not.toContain('<svg');
    expect(sanitized).not.toContain('onload');
    expect(sanitized).toContain('<p>تفسير صحيح</p>');
  });

  it('falls back to safe HTML escaping in SSR mode (window is undefined)', () => {
    const originalWindow = global.window;
    try {
      // @ts-expect-error simulating SSR
      delete global.window;
      const dangerous = '<b>قوله:</b> <script>alert(1)</script>';
      const result = sanitizeTafsirHtml(dangerous);
      expect(result).toBe('&lt;b&gt;قوله:&lt;/b&gt; &lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    } finally {
      global.window = originalWindow;
    }
  });
});
