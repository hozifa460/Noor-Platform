import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import * as ReactDOMClient from 'react-dom/client';

/**
 * Directed UI test for the global-search LOADING STAGES, driven END-TO-END
 * through the REAL engine (the real `fetchJsonBounded` → `loadHadithMicroIndex-
 * Outcome` → `searchAcrossAllBooks`), the REAL zustand store and the REAL
 * component. Nothing about the progress protocol is faked here: the stage
 * transitions must be produced by the production code path, because that is
 * what the user's browser runs.
 *
 * Chain under test:
 *   stage 1 «جارٍ تحميل فهرس البحث...»  (bytes arriving; determinate bar when the
 *                                      Content-Length is trustworthy)
 *   stage 2 «جارٍ تجهيز النتائج...»     (body FULLY read, BEFORE JSON.parse and
 *                                      before index validation)
 *   results                             (only when the search really resolves)
 *
 * Only the network boundary (`fetch`) and the local-FS shortcut are stubbed.
 */

// Force the BROWSER path: in vitest `process.versions.node` exists, which would
// otherwise route the loader into the local-FS branch (and the real fixture)
// instead of the stubbed fetch.
vi.mock('node:fs', () => ({
  default: { existsSync: () => false, readFileSync: () => { throw new Error('no fs in test'); } },
}));
vi.mock('fs', () => ({
  default: { existsSync: () => false, readFileSync: () => { throw new Error('no fs in test'); } },
  existsSync: () => false,
  readFileSync: () => { throw new Error('no fs in test'); },
}));

const loadHadithBookMock = vi.fn();

vi.mock('../infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../infrastructure')>();
  return {
    ...actual,
    // The book reader is unrelated to the search stages: keep it out of the way
    // so the ONLY network call the component can make is the micro-index one.
    // `searchAcrossAllBooks` stays REAL — that is the path under test.
    loadHadithBook: (...args: unknown[]) => loadHadithBookMock(...args),
  };
});

import { HadithHubView } from '../ui/HadithHubView';
import { useHadithStore } from '../model/hadith-store';

const QUERY = 'النيات';
const INDEX_TEXT = 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى';
/** Minimal but structurally VALID micro-index (books/grades/items contract). */
const INDEX_PAYLOAD = { books: ['bukhari'], grades: ['صحيح'], items: [[0, 1, 1, INDEX_TEXT, 0]] };
const INDEX_BYTES = new TextEncoder().encode(JSON.stringify(INDEX_PAYLOAD));

const fetchMock = vi.fn();

/** A structurally valid EMPTY book (the reader is not what this test covers). */
function emptyBook() {
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


describe('HadithHubView — global-search loading stages (real engine)', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fetchMock.mockReset();
    loadHadithBookMock.mockReset();
    loadHadithBookMock.mockResolvedValue(emptyBook());
    // A REAL streaming Response, un-encoded, with a truthful Content-Length →
    // the engine may report a trustworthy total (determinate), and the body is
    // read once, by the single request under test.
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(INDEX_BYTES, {
          status: 200,
          headers: { 'content-length': String(INDEX_BYTES.byteLength) },
        })
      )
    );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    useHadithStore.setState({
      searchMode: 'global',
      searchQuery: QUERY,
      globalResults: [],
      globalSearchError: null,
      searchingGlobal: false,
      globalSearchProgress: null,
      bookData: null,
    });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders stage 1 → stage 2 (before results) → results, from one single request', async () => {
    renderHub();

    // 1) Record the phase transitions the REAL engine pushes through the store.
    const progressEvents: { phase?: string; totalBytes?: number | null }[] = [];
    const unsubscribe = useHadithStore.subscribe((s) => {
      const p = s.globalSearchProgress;
      if (p) progressEvents.push({ phase: p.phase, totalBytes: p.totalBytes });
    });

    // 2) Record EVERY committed DOM state: a MutationObserver callback runs as a
    //    microtask after each commit, so an intermediate stage can never be
    //    skipped over (unlike polling, which could miss it).
    const committedStates: string[] = [];
    const observer = new MutationObserver(() => {
      committedStates.push(container.textContent || '');
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });

    let pending!: Promise<void>;
    try {
      await act(async () => {
        pending = useHadithStore.getState().runGlobalSearch(QUERY);
      });
      await act(async () => {
        await pending;
      });
    } finally {
      observer.disconnect();
      unsubscribe();
    }

    const states = [...committedStates, container.textContent || ''];

    // The engine really ran the staged protocol: connect → download → preparing.
    const phases = progressEvents.map((e) => e.phase);
    expect(phases).toContain('connect');
    expect(phases).toContain('download');
    expect(phases).toContain('preparing');
    expect(phases.indexOf('preparing')).toBeGreaterThan(phases.indexOf('download'));
    // A trustworthy total was reported for the download → the determinate branch
    // (the tiny payload simply rounds to 0.0 MB in the readout).
    expect(
      progressEvents.some((e) => e.phase === 'download' && typeof e.totalBytes === 'number')
    ).toBe(true);
    expect(states.some((t) => t.includes('م.ب من'))).toBe(true);

    // Stage 1 was committed (bytes arriving).
    const stage1At = states.findIndex((t) => t.includes('جارٍ تحميل فهرس البحث'));
    expect(stage1At).toBeGreaterThan(-1);

    // Stage 2 was committed AFTER stage 1 and — critically — BEFORE any result:
    // no false completion while the index is still being prepared.
    const stage2At = states.findIndex((t) => t.includes('جارٍ تجهيز النتائج'));
    expect(stage2At).toBeGreaterThan(stage1At);
    expect(states[stage2At]).not.toContain('نتائج البحث الشامل');
    expect(states[stage2At]).not.toContain(INDEX_TEXT);

    // Results only render afterwards, and the loading copy is gone.
    const resultsAt = states.findIndex((t) => t.includes('نتائج البحث الشامل'));
    expect(resultsAt).toBeGreaterThan(stage2At);
    const finalText = states[states.length - 1];
    expect(finalText).toContain('نتائج البحث الشامل');
    expect(finalText).toContain(INDEX_TEXT);
    expect(finalText).not.toContain('جارٍ تجهيز النتائج');
    expect(finalText).not.toContain('جارٍ تحميل فهرس البحث');

    // No second download: exactly one request, to the index itself.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('hadiths_core_index.json');
  });
});
