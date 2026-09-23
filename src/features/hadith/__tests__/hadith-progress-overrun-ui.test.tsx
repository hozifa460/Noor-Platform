import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import * as ReactDOMClient from 'react-dom/client';

/**
 * UI test for the download progress BAR when the server UNDER-REPORTS
 * `Content-Length` (a proxy/CDN announcing fewer bytes than the real body),
 * driven END-TO-END through the REAL engine (`fetchJsonBounded` → progress
 * events → zustand store) and the REAL `HadithHubView` component.
 *
 * Contract under test:
 *  1. While the `download` phase is visible, the read has NOT reached
 *     `done === true` (the engine declares `preparing` only afterwards), so
 *     the percentage shown must stay BELOW 100% — even when `loadedBytes`
 *     equals the announced total exactly.
 *  2. Once `loadedBytes` EXCEED the announced total, the header has proved
 *     itself a lie → the bar switches to the INDETERMINATE style (no
 *     percentage, no «م.ب من» readout) and never goes back to a percentage.
 *  3. The «جارٍ تجهيز النتائج» stage is committed to the DOM BEFORE the
 *     results. The engine's MessageChannel yield only gives the browser an
 *     OPPORTUNITY to paint that stage — this test asserts DOM ordering, never
 *     that a frame was actually painted.
 *
 * Only the network boundary (`fetch`) and the local-FS shortcut are stubbed.
 * The body is fed through a hand-driven ReadableStream so every intermediate
 * bar state gets its own React commit before the next chunk arrives.
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
    // The book reader is unrelated to the progress bar: keep it out of the way
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

/** Await one REAL macrotask (MessageChannel is not owned by fake timers). */
function macrotaskTick(): Promise<void> {
  return new Promise<void>((resolve) => {
    const mc = new MessageChannel();
    mc.port1.onmessage = () => resolve();
    mc.port2.postMessage(null);
  });
}

describe('HadithHubView — progress bar under an under-reported Content-Length', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fetchMock.mockReset();
    loadHadithBookMock.mockReset();
    loadHadithBookMock.mockResolvedValue(emptyBook());
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

  it('keeps the bar below 100% until done and turns it indeterminate when bytes exceed the announced total', async () => {
    renderHub();

    // --- The announced Content-Length is a LIE (smaller than the body). ------
    // Split the body into three parts and announce EXACTLY parts 1+2:
    //   part 1 → loaded <  announced → determinate, strictly below 100%
    //   part 2 → loaded === announced → a raw ratio of 100% → must show 99%
    //   part 3 → loaded >  announced → INDETERMINATE (the header can't be trusted)
    const n = INDEX_BYTES.byteLength;
    const cut1 = Math.floor(n / 3);
    const cut2 = Math.floor((2 * n) / 3);
    const parts = [
      INDEX_BYTES.subarray(0, cut1),
      INDEX_BYTES.subarray(cut1, cut2),
      INDEX_BYTES.subarray(cut2),
    ];
    const announced = cut2; // parts 1+2 — and cut2 < n, so part 3 overruns it
    expect(announced).toBeGreaterThan(0);
    expect(announced).toBeLessThan(n);

    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { 'content-length': String(announced) },
        })
      )
    );

    // Record EVERY committed DOM state (a MutationObserver callback runs as a
    // microtask after each commit) plus every visible determinate bar width.
    const committedHtml: string[] = [];
    const committedText: string[] = [];
    const barWidths: { state: number; width: string }[] = [];
    const observer = new MutationObserver(() => {
      committedHtml.push(container.innerHTML);
      committedText.push(container.textContent || '');
      const at = committedHtml.length - 1;
      container
        .querySelectorAll<HTMLDivElement>('.bg-muted.overflow-hidden > .bg-primary')
        .forEach((el) => {
          if (el.style.width) barWidths.push({ state: at, width: el.style.width });
        });
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    let pending!: Promise<void>;
    try {
      // Start the search: connect → the reader waits for the first byte.
      await act(async () => {
        pending = useHadithStore.getState().runGlobalSearch(QUERY);
      });
      // Part 1: determinate progress, below the announced total.
      await act(async () => {
        controller.enqueue(parts[0]);
        await macrotaskTick();
      });
      // Part 2: loaded now EQUALS the announced total — a naive bar would show
      // 100% here even though `done === true` has not happened yet.
      await act(async () => {
        controller.enqueue(parts[1]);
        await macrotaskTick();
      });
      // Part 3: loaded EXCEEDS the announced total → indeterminate.
      await act(async () => {
        controller.enqueue(parts[2]);
        await macrotaskTick();
      });
      // Close → done === true → `preparing` (paint opportunity) → parse → results.
      await act(async () => {
        controller.close();
        await macrotaskTick();
      });
      await act(async () => {
        await pending;
      });
    } finally {
      observer.disconnect();
    }
    const html = [...committedHtml, container.innerHTML];
    const text = [...committedText, container.textContent || ''];

    // (1) A determinate bar rendered — and it NEVER reached 100% while the read
    //     was unfinished; the loaded === announced state shows 99% instead.
    expect(barWidths.length).toBeGreaterThan(0);
    expect(barWidths.some((b) => b.width === '99%')).toBe(true);
    expect(barWidths.some((b) => b.width === '100%')).toBe(false);
    const determinateAt = text.findIndex((t) => t.includes('م.ب من'));
    expect(determinateAt).toBeGreaterThan(-1);

    // (2) Once the bytes passed the announced total the bar became
    //     INDETERMINATE: pulse segment, no readout — and it never went back to
    //     a percentage afterwards.
    const indeterminateAt = html.findIndex(
      (t, i) =>
        t.includes('w-1/3 bg-primary rounded-full animate-pulse') &&
        !text[i].includes('م.ب من')
    );
    expect(indeterminateAt).toBeGreaterThan(determinateAt);
    expect(barWidths.every((b) => b.state < indeterminateAt)).toBe(true);

    // (3) The `preparing` stage is committed to the DOM BEFORE the results
    //     (DOM ordering — no claim here that a frame was actually painted).
    const preparingAt = text.findIndex((t) => t.includes('جارٍ تجهيز النتائج'));
    const resultsAt = text.findIndex((t) => t.includes('نتائج البحث الشامل'));
    expect(preparingAt).toBeGreaterThan(indeterminateAt);
    expect(text[preparingAt]).not.toContain('نتائج البحث الشامل');
    expect(text[preparingAt]).not.toContain(INDEX_TEXT);
    expect(resultsAt).toBeGreaterThan(preparingAt);

    // Results render finally, the loading copy is gone, one single request.
    const finalText = text[text.length - 1];
    expect(finalText).toContain(INDEX_TEXT);
    expect(finalText).not.toContain('جارٍ تحميل فهرس البحث');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('hadiths_core_index.json');
  });
});