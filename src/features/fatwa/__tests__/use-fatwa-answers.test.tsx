import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useFatwaAnswers } from '../model/use-fatwa-answers';
import { clearFatwaAnswerCaches } from '../infrastructure/answers-engine';

describe('useFatwaAnswers — UI Network Recovery & Content State', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearFatwaAnswerCaches();
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
    clearFatwaAnswerCaches();
    vi.restoreAllMocks();
  });

  it('recovers cleanly upon re-expansion after transient network failure without poisoning contentMap', async () => {
    const testId = 'binbaz_ui_recovery_test';
    let fetchCount = 0;

    // Call 1 fails (network drop), Call 2 succeeds (network restored)
    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      if (fetchCount === 1) {
        throw new TypeError('Failed to fetch (network drop)');
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            id: testId,
            q: 'ما حكم قراءة القرآن من الهاتف؟',
            a: 'تجوز قراءة القرآن من الهاتف ولو على غير طهارة كبرى وصغرى إذا لم يمس المصحف.',
          },
        ],
      } as Response;
    });

    let hookResult = {} as ReturnType<typeof useFatwaAnswers>;

    function TestComponent({ expandedId }: { expandedId: string | null }) {
      const answers = useFatwaAnswers(expandedId);
      React.useEffect(() => {
        hookResult = answers;
      });
      return (
        <div>
          <span data-testid="has-answer">
            {answers.contentMap.get(testId)?.found ? 'yes' : 'no'}
          </span>
          <span data-testid="answer-text">
            {answers.contentMap.get(testId)?.answer || 'empty'}
          </span>
        </div>
      );
    }

    // Step 1: User expands the fatwa while network is offline
    await act(async () => {
      root?.render(<TestComponent expandedId={testId} />);
    });
    // Wait for promise resolution
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(fetchCount).toBe(1);
    // Notice: contentMap must NOT lock in found: false permanently
    expect(hookResult.contentMap.get(testId)?.found).toBeFalsy();

    // Step 2: User collapses the fatwa (expandedId = null)
    await act(async () => {
      root?.render(<TestComponent expandedId={null} />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Step 3: Network is back, user re-expands the fatwa
    await act(async () => {
      root?.render(<TestComponent expandedId={testId} />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // The hook MUST attempt a second fetch and succeed!
    expect(fetchCount).toBe(2);
    expect(hookResult.contentMap.get(testId)?.found).toBe(true);
    expect(hookResult.contentMap.get(testId)?.answer).toContain('تجوز قراءة القرآن من الهاتف');

    // Step 4: User collapses and re-expands again -> should use cached answer, no 3rd network call!
    await act(async () => {
      root?.render(<TestComponent expandedId={null} />);
    });
    await act(async () => {
      root?.render(<TestComponent expandedId={testId} />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(fetchCount).toBe(2); // Still 2! Cached cleanly!
  });

  it('supports explicit retry() call to recover without collapsing', async () => {
    const testId = 'binbaz_retry_action_test';
    let fetchCount = 0;

    global.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      if (fetchCount === 1) {
        throw new TypeError('Network timeout');
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            id: testId,
            q: 'السؤال',
            a: 'الجواب الشافي بعد إعادة المحاولة',
          },
        ],
      } as Response;
    });

    let hookResult = {} as ReturnType<typeof useFatwaAnswers>;

    function TestComponent({ expandedId }: { expandedId: string | null }) {
      const answers = useFatwaAnswers(expandedId);
      React.useEffect(() => {
        hookResult = answers;
      });
      return <div>Test</div>;
    }

    await act(async () => {
      root?.render(<TestComponent expandedId={testId} />);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(fetchCount).toBe(1);
    expect(hookResult.contentMap.get(testId)?.found).toBeFalsy();

    // Trigger retry directly
    await act(async () => {
      await hookResult.retry(testId);
    });

    expect(fetchCount).toBe(2);
    expect(hookResult.contentMap.get(testId)?.found).toBe(true);
    expect(hookResult.contentMap.get(testId)?.answer).toContain('الجواب الشافي');
  });
});
