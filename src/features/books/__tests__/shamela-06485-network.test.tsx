import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { loadShamelaEBook, clearMetaCache, clearChunkCache } from '../infrastructure/text/chapters';
import { toast } from 'sonner';
import { useBookOrchestration } from '../application/use-book-orchestration';

describe('Book 06485 — Live Network Git LFS & Unmapped Heading Verification', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    clearMetaCache();
    clearChunkCache();
    vi.restoreAllMocks();
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
  });

  it('1. loads book 06485 over real network via resolve/main, successfully resolving 17.5MB Git LFS TOC', async () => {
    // 06485 toc.json is a 17.5MB Git LFS file.
    // Under /raw/main, it returns the 3-line LFS pointer (which fails JSON parsing).
    // Under /resolve/main, Hugging Face redirects to https://us.aws.cdn.hf.co/... which returns valid JSON.
    const result = await loadShamelaEBook('shamela-6485');
    expect(result).not.toBeNull();
    expect(result?.meta.title).toBe('فتاوى الشبكة الإسلامية');
    expect(result?.toc.length).toBe(92242);

    // Verify unmapped headings exist and are flagged isMapped === false
    const unmappedItems = result?.toc.filter((item) => item.isMapped === false);
    expect(unmappedItems).toBeDefined();
    expect(unmappedItems!.length).toBeGreaterThan(0);

    const targetUnmapped = unmappedItems?.find((i) => i.title.includes('حكم نشر المقالات المقتبسة'));
    expect(targetUnmapped).toBeDefined();
    expect(targetUnmapped?.isMapped).toBe(false);
    expect(targetUnmapped?.chapterIndex).toBe(-1);
    expect(targetUnmapped?.pageId).toBe(0);
  }, 45000);

  it('2. guards unmapped headings: triggers toast warning and prevents invalid navigation', async () => {
    const toastSpy = vi.spyOn(toast, 'warning');

    const hookResultRef: { current: ReturnType<typeof useBookOrchestration> | null } = { current: null };

    function TestComponent() {
      const res = useBookOrchestration('shamela-6485');
      React.useEffect(() => {
        hookResultRef.current = res;
      }, [res]);
      return null;
    }

    await act(async () => {
      root?.render(<TestComponent />);
    });

    // Initial chapter should be 1
    expect(hookResultRef.current!.currentChapter).toBe(1);

    // Attempt to jump to unmapped heading (chapterIndex -1, pageId 0)
    act(() => {
      hookResultRef.current!.handleJumpToChapter(-1, undefined, 0);
    });

    // Verify warning toast is shown
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('القفز المباشر لهذا العنوان غير مدعوم حالياً')
    );

    // Verify currentChapter remains 1 (did not navigate to invalid chapter)
    expect(hookResultRef.current!.currentChapter).toBe(1);
  });
});
