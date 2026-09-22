import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import * as ReactDOMClient from 'react-dom/client';
import type { GlobalSearchResultItem, HadithBookData, HadithBookMeta, HadithItem } from '../domain';

/**
 * Directed UI test for the global-search failure → retry → success flow:
 *   1. the index load fails  → the error card + "إعادة المحاولة" button appear;
 *   2. the user clicks retry → the reload succeeds → results render.
 * The component is driven through the REAL zustand store; only the network
 * boundary (`searchAcrossAllBooks` / `loadHadithBook`) is mocked.
 */

const searchAcrossAllBooksMock = vi.fn();
const loadHadithBookMock = vi.fn();

vi.mock('../infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../infrastructure')>();
  return {
    ...actual,
    searchAcrossAllBooks: (...args: unknown[]) => searchAcrossAllBooksMock(...args),
    loadHadithBook: (...args: unknown[]) => loadHadithBookMock(...args),
  };
});

import { HadithHubView } from '../ui/HadithHubView';
import { useHadithStore } from '../model/hadith-store';
import { MicroIndexLoadError } from '../infrastructure';

const BOOK: HadithBookMeta = {
  id: 'bukhari',
  nameAr: 'صحيح البخاري',
  nameEn: 'Sahih al-Bukhari',
  authorAr: 'الإمام البخاري',
  authorEn: 'Al-Bukhari',
  fileName: 'bukhari.json',
  hadithCount: 7277,
  category: 'sahih',
  description: 'أصح كتاب بعد كتاب الله',
};

const HADITH: HadithItem = {
  id: 1,
  idInBook: 1,
  chapterId: 1,
  bookId: 1,
  arabic: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى',
};

const RESULTS: GlobalSearchResultItem[] = [{ hadith: HADITH, book: BOOK }];

function emptyBook(): HadithBookData {
  return {
    id: 1,
    metadata: { id: 1, length: 0, arabic: { title: 'بخاري', author: 'البخاري' } },
    chapters: [],
    hadiths: [],
  };
}

let container: HTMLDivElement;
let root: ReactDOMClient.Root;

function renderHub() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  act(() => {
    root.render(React.createElement(HadithHubView));
  });
}

function clickByText(text: string) {
  const btn = Array.from(container.querySelectorAll('button')).find((b) =>
    (b.textContent || '').includes(text)
  );
  expect(btn, `button containing "${text}"`).toBeTruthy();
  act(() => {
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  searchAcrossAllBooksMock.mockReset();
  loadHadithBookMock.mockReset();
  loadHadithBookMock.mockResolvedValue(emptyBook());
  useHadithStore.setState({
    searchMode: 'global',
    searchQuery: 'النيات',
    globalResults: [],
    globalSearchError: null,
    searchingGlobal: false,
    bookData: null,
  });
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  vi.restoreAllMocks();
});

describe('HadithHubView — global search failure → retry → results', () => {
  it('shows the error card + retry button on load failure, then renders results on retry success', async () => {
    // Attempt 1: index unavailable.
    searchAcrossAllBooksMock.mockRejectedValueOnce(new MicroIndexLoadError('timeout'));

    renderHub();
    await act(async () => {
      await useHadithStore.getState().runGlobalSearch('النيات');
    });

    // 1) Failure surface is visible; the "no results" copy must NOT be shown.
    const failureText = container.textContent || '';
    expect(failureText).toContain('تعذّر تحميل فهرس البحث الشامل');
    expect(failureText).toContain('إعادة المحاولة');
    expect(failureText).not.toContain('لم نعثر على أحاديث مطابقة');

    // 2) Retry succeeds → results render.
    searchAcrossAllBooksMock.mockResolvedValueOnce(RESULTS);
    clickByText('إعادة المحاولة');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const afterRetry = container.textContent || '';
    expect(afterRetry).not.toContain('تعذّر تحميل فهرس البحث الشامل');
    expect(afterRetry).toContain('نتائج البحث الشامل');
    expect(afterRetry).toContain('إنما الأعمال بالنيات');
    expect(searchAcrossAllBooksMock).toHaveBeenCalledTimes(2);
  });

  it('shows a specific message for an invalid-payload failure', async () => {
    searchAcrossAllBooksMock.mockRejectedValueOnce(new MicroIndexLoadError('invalid-payload'));
    renderHub();
    await act(async () => {
      await useHadithStore.getState().runGlobalSearch('النيات');
    });
    const text = container.textContent || '';
    expect(text).toContain('تعذّر تحميل فهرس البحث الشامل');
    expect(text).toContain('بيانات غير صالحة');
    expect(text).toContain('إعادة المحاولة');
  });

  it('renders the genuine "no results" state when the search succeeds with zero matches', async () => {
    searchAcrossAllBooksMock.mockResolvedValueOnce([]);
    renderHub();
    await act(async () => {
      await useHadithStore.getState().runGlobalSearch('النيات');
    });
    const text = container.textContent || '';
    expect(text).toContain('لم نعثر على أحاديث مطابقة');
    expect(text).not.toContain('تعذّر تحميل فهرس البحث الشامل');
  });
  // NOTE: the loading-STAGE behaviour (and its transition) is covered
  // end-to-end against the REAL engine in hadith-global-search-stages-ui.test.tsx
  // — deliberately not by emitting a synthetic progress event from here.
});