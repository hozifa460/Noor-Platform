import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { HadithSharhTab } from '../ui/detail-tabs/HadithSharhTab';
import type { HadeethEncSharhItem } from '../domain';

/**
 * Regression tests for the HadithSharhTab XSS fix.
 * The sharh explanation HTML is fetched from a remote dataset (HadeethEnc)
 * and was previously injected via dangerouslySetInnerHTML WITHOUT sanitization.
 * Proves: (1) malicious payloads are neutralized, (2) legitimate formatting
 * is preserved, (3) loading/empty states are unaffected.
 */

function makeSharh(explanation: string): HadeethEncSharhItem {
  return {
    id: '1',
    title: 'إنما الأعمال بالنيات',
    hadeeth: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
    grade: 'صحيح',
    explanation,
    attribution: 'موسوعة الأحاديث النبوية',
  };
}

let container: HTMLDivElement;
let root: ReactDOMClient.Root;

function renderSharhTab(sharh: HadeethEncSharhItem | null, loadingSharh = false) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(HadithSharhTab, { sharh, loadingSharh }));
  });
  return container;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
  }
  container?.remove();
});

describe('HadithSharhTab — HTML Sanitization (XSS Prevention)', () => {
  describe('1. Malicious payload neutralization', () => {
    it('does NOT execute injected <script> tags', () => {
      const flag = '__sharh_xss_script__';
      (window as unknown as Record<string, unknown>)[flag] = false;
      renderSharhTab(makeSharh('<p>شرح الحديث</p><script>window.' + flag + ' = true;</script>'));
      expect(container.querySelector('script')).toBeNull();
      expect((window as unknown as Record<string, unknown>)[flag]).toBe(false);
      expect(container.textContent).toContain('شرح الحديث');
    });

    it('does NOT execute event-handler attributes (img onerror / svg onload)', () => {
      const flag = '__sharh_xss_handler__';
      (window as unknown as Record<string, unknown>)[flag] = false;
      const html =
        '<img src="x" onerror="window.' + flag + '=true">' +
        '<svg onload="window.' + flag + '=true"></svg><p>متن آمن</p>';
      renderSharhTab(makeSharh(html));
      expect(container.querySelector('[onerror]')).toBeNull();
      expect(container.querySelector('[onload]')).toBeNull();
      expect((window as unknown as Record<string, unknown>)[flag]).toBe(false);
      expect(container.textContent).toContain('متن آمن');
    });
    it('does NOT render iframes, forms, or clickable javascript: links', () => {
      const html =
        '<iframe src="https://evil.example"></iframe>' +
        '<form action="https://evil.example"><button>سرقة</button></form>' +
        '<a href="javascript:alert(1)">رابط خبيث</a><p>شرح</p>';
      renderSharhTab(makeSharh(html));
      expect(container.querySelector('iframe')).toBeNull();
      expect(container.querySelector('form')).toBeNull();
      expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
      expect(container.textContent).toContain('شرح');
    });

    it('strips style exfiltration and URL-bearing attributes', () => {
      const html =
        '<p style="background:url(https://evil.example/x)">نص</p>' +
        '<span onclick="alert(1)" data-payload="x">مقطع</span>';
      renderSharhTab(makeSharh(html));
      expect(container.querySelector('[style]')).toBeNull();
      const span = container.querySelector('span');
      expect(span?.getAttribute('onclick')).toBeNull();
      expect(span?.getAttribute('data-payload')).toBeNull();
    });
  });

  describe('2. Legitimate formatting preservation', () => {
    it('keeps paragraphs, emphasis, blockquotes, and lists', () => {
      const html =
        '<p>قال <strong>الإمام النووي</strong> رحمه الله:</p>' +
        '<blockquote><em>هذا الحديث أصل عظيم</em></blockquote>' +
        '<ul><li>الفائدة الأولى</li><li>الفائدة الثانية</li></ul>';
      renderSharhTab(makeSharh(html));
      expect(container.querySelector('p')).not.toBeNull();
      expect(container.querySelector('strong')?.textContent).toBe('الإمام النووي');
      expect(container.querySelector('blockquote em')?.textContent).toBe('هذا الحديث أصل عظيم');
      expect(container.querySelectorAll('li')).toHaveLength(2);
    });

    it('keeps dir/lang attributes needed for mixed RTL/LTR scholarly text', () => {
      renderSharhTab(makeSharh('<div dir="rtl" lang="ar"><span class="highlight">نص موجّه</span></div>'));
      const div = container.querySelector('div[dir="rtl"]');
      expect(div).not.toBeNull();
      expect(div?.getAttribute('lang')).toBe('ar');
      expect(container.querySelector('span.highlight')?.textContent).toBe('نص موجّه');
    });
  });

  describe('3. Component states unaffected by the fix', () => {
    it('renders the loading indicator when loadingSharh is true', () => {
      renderSharhTab(null, true);
      expect(container.textContent).toContain('جاري جلب الشرح');
    });

    it('renders the empty-state guidance when sharh is null', () => {
      renderSharhTab(null);
      expect(container.textContent).toContain('لا يتوفر شرح تفصيلي');
    });

    it('still renders attribution when provided', () => {
      renderSharhTab(makeSharh('<p>شرح</p>'));
      expect(container.textContent).toContain('المصدر والعزو');
      expect(container.textContent).toContain('موسوعة الأحاديث النبوية');
    });
  });
});

