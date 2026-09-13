import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useEBookReader } from '../ui/ebook/use-ebook-reader';
import { clearChunkCache, clearMetaCache } from '../infrastructure/text/chapters';
import type { MediaItem } from '@/lib/types';
import { toast } from 'sonner';

type ReaderHookState = ReturnType<typeof useEBookReader>;

describe('useEBookReader & useBookOrchestration — Behavioral & Precision Navigation Tests', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const originalFetch = global.fetch;

  const mockBookItem: MediaItem = {
    id: 'ebook-test-book',
    title: 'كتاب الاختبار المعماري',
    section: 'books',
  };

  const sampleMetaResponse = {
    meta: {
      bookId: 'test-book',
      title: 'كتاب الاختبار المعماري',
      author: 'المؤلف التجريبي',
      totalChapters: 5,
    },
    toc: [
      { id: 't-1', title: 'الباب الأول', chapterIndex: 1, pageNumber: 5, pageId: 100, isMapped: true },
      { id: 't-2', title: 'فصل ضمن الباب الأول', chapterIndex: 1, pageNumber: 15, pageId: 200, isMapped: true },
      { id: 't-3', title: 'الباب الثاني', chapterIndex: 2, pageNumber: 25, pageId: 300, isMapped: true },
      { id: 't-4', title: 'عنوان غير محقق', chapterIndex: 0, pageNumber: undefined, isMapped: false },
    ],
  };

  const sampleChunk1 = {
    bookId: 'test-book',
    chapterIndex: 1,
    title: 'المقطع 1',
    startPage: 1,
    endPage: 20,
    paragraphs: [
      { id: 'p-1', text: 'بداية الباب الأول في المقطع الأول', pageNumber: 1, pageId: 50 },
      { id: 'p-2', text: 'نص صفحة خمسة ضمن المقطع الأول', pageNumber: 5, pageId: 100 },
      { id: 'p-3', text: 'نص صفحة خمسة عشر في نفس المقطع الأول', pageNumber: 15, pageId: 200 },
    ],
    wordCount: 150,
  };

  const sampleChunk2 = {
    bookId: 'test-book',
    chapterIndex: 2,
    title: 'المقطع 2',
    startPage: 21,
    endPage: 40,
    paragraphs: [
      { id: 'p-4', text: 'نص الباب الثاني في المقطع الثاني', pageNumber: 25, pageId: 300 },
    ],
    wordCount: 100,
  };

  beforeEach(() => {
    clearChunkCache();
    clearMetaCache();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    global.fetch = originalFetch;
    clearChunkCache();
    clearMetaCache();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. does NOT re-fetch chapter chunks when display preferences change', async () => {
    let chunkFetchCount = 0;

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('meta.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleMetaResponse,
        } as Response;
      }
      if (u.includes('chunk_1.json')) {
        chunkFetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => sampleChunk1,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    let hookRef = null as unknown as ReaderHookState;

    function TestReaderComponent() {
      const reader = useEBookReader(mockBookItem);
      React.useEffect(() => {
        hookRef = reader;
      });
      return (
        <div>
          <div data-testid="chapter">{reader.currentChapter}</div>
          <div data-testid="fontsize">{reader.fontSize}</div>
          <div data-testid="theme">{reader.theme}</div>
        </div>
      );
    }

    await act(async () => {
      root?.render(<TestReaderComponent />);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(chunkFetchCount).toBe(1);
    expect(hookRef?.currentChapter).toBe(1);
    expect(hookRef?.chunkData?.chapterIndex).toBe(1);

    // Change all display preferences sequentially
    await act(async () => {
      hookRef?.setFontSize(26);
      hookRef?.setTheme('sepia');
      hookRef?.setTashkeel('none');
      hookRef?.setFontFamily('naskh');
      hookRef?.setFocusMode(true);
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    // Preferences updated properly
    expect(hookRef?.fontSize).toBe(26);
    expect(hookRef?.theme).toBe('sepia');
    expect(hookRef?.tashkeel).toBe('none');
    expect(hookRef?.fontFamily).toBe('naskh');
    expect(hookRef?.focusMode).toBe(true);

    // Chunk was NOT re-fetched!
    expect(chunkFetchCount).toBe(1);
  });

  it('2. handles jumping within the same chunk by updating targetPageNumber/targetPageId without re-fetching', async () => {
    let chunkFetchCount = 0;

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('meta.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleMetaResponse,
        } as Response;
      }
      if (u.includes('chunk_1.json')) {
        chunkFetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => sampleChunk1,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    let hookRef = null as unknown as ReaderHookState;

    function TestReaderComponent() {
      const reader = useEBookReader(mockBookItem);
      React.useEffect(() => {
        hookRef = reader;
      });
      return <div>chapter {reader.currentChapter}</div>;
    }

    await act(async () => {
      root?.render(<TestReaderComponent />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(chunkFetchCount).toBe(1);
    expect(hookRef?.currentChapter).toBe(1);
    expect(hookRef?.targetPageNumber).toBeNull();
    expect(hookRef?.targetPageId).toBeNull();

    // User clicks heading t-2 in TOC which belongs to the same chapter (chapterIndex: 1, pageNumber: 15, pageId: 200)
    await act(async () => {
      hookRef?.handleJumpToChapter(1, 15, 200);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(hookRef?.currentChapter).toBe(1);
    expect(hookRef?.targetPageNumber).toBe(15);
    expect(hookRef?.targetPageId).toBe(200);
    expect(hookRef?.targetJumpNonce).toBe(1);

    // No additional fetch occurred
    expect(chunkFetchCount).toBe(1);
  });

  it('3. prevents jumping to an unmapped heading (chapterIndex <= 0) and displays warning toast', async () => {
    const warningSpy = vi.spyOn(toast, 'warning');

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('meta.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleMetaResponse,
        } as Response;
      }
      if (u.includes('chunk_1.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleChunk1,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    let hookRef = null as unknown as ReaderHookState;

    function TestReaderComponent() {
      const reader = useEBookReader(mockBookItem);
      React.useEffect(() => {
        hookRef = reader;
      });
      return <div>chapter {reader.currentChapter}</div>;
    }

    await act(async () => {
      root?.render(<TestReaderComponent />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookRef?.currentChapter).toBe(1);

    // Attempt to jump to unmapped heading (chapterIndex: 0)
    await act(async () => {
      hookRef?.handleJumpToChapter(0, undefined, undefined);
    });

    expect(hookRef?.currentChapter).toBe(1);
    expect(hookRef?.targetPageNumber).toBeNull();
    expect(hookRef?.targetPageId).toBeNull();
    expect(warningSpy).toHaveBeenCalledWith(
      expect.stringContaining('القفز المباشر لهذا العنوان غير مدعوم حالياً')
    );

    // Attempt to jump to negative chapterIndex: -1
    await act(async () => {
      hookRef?.handleJumpToChapter(-1);
    });
    expect(hookRef?.currentChapter).toBe(1);
    expect(warningSpy).toHaveBeenCalledTimes(2);
  });

  it('4. cancels pending requests and aborts AbortSignal on navigation and unmount', async () => {
    const recordedSignals: { url: string; signal: AbortSignal }[] = [];

    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (init?.signal) {
        recordedSignals.push({ url: u, signal: init.signal });
      }

      if (u.includes('meta.json')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleMetaResponse,
        } as Response;
      }

      // Simulate a pending network request for chunks
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (u.includes('chunk_1.json')) {
            resolve({ ok: true, status: 200, json: async () => sampleChunk1 } as Response);
          } else if (u.includes('chunk_2.json')) {
            resolve({ ok: true, status: 200, json: async () => sampleChunk2 } as Response);
          } else {
            resolve({ ok: false, status: 404 } as Response);
          }
        }, 1000);

        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
      });
    });

    let hookRef = null as unknown as ReaderHookState;

    function TestReaderComponent() {
      const reader = useEBookReader(mockBookItem);
      React.useEffect(() => {
        hookRef = reader;
      });
      return <div>chapter {reader.currentChapter}</div>;
    }

    await act(async () => {
      root?.render(<TestReaderComponent />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const chunk1Signal = recordedSignals.find((s) => s.url.includes('chunk_1.json'));
    expect(chunk1Signal).toBeDefined();
    expect(chunk1Signal?.signal.aborted).toBe(false);

    // Navigate immediately to chapter 2 while chunk 1 is in-flight
    await act(async () => {
      hookRef?.handleJumpToChapter(2, 25, 300);
    });

    expect(chunk1Signal?.signal.aborted).toBe(true);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    const chunk2Signal = recordedSignals.find((s) => s.url.includes('chunk_2.json'));
    expect(chunk2Signal).toBeDefined();
    expect(chunk2Signal?.signal.aborted).toBe(false);

    // Unmount component while chunk 2 is in-flight
    await act(async () => {
      root?.unmount();
      root = null;
    });

    expect(chunk2Signal?.signal.aborted).toBe(true);
  });
});
