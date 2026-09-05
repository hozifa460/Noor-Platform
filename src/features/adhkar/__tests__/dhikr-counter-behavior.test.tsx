import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useDhikrCounter } from '../hooks/use-dhikr-counter';
import type { DhikrItem, AdhkarCategory } from '../types';

describe('useDhikrCounter — Behavioral & StrictMode Transition Tests', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
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
    vi.restoreAllMocks();
  });

  it('correctly transitions from remaining: 2 to remaining: 0 with completed: true (eliminating race conditions)', async () => {
    let hookResult: ReturnType<typeof useDhikrCounter> | null = null;

    const sampleItem: DhikrItem = {
      id: 101,
      text: 'سبحان الله وبحمده',
      count: 2,
      audio: '',
      filename: '',
    };

    const initialCatalog: AdhkarCategory[] = [
      {
        id: 1,
        category: 'أذكار الصباح',
        audio: '',
        filename: '',
        array: [sampleItem],
      },
    ];

    function TestComponent() {
      const counter = useDhikrCounter(initialCatalog);
      React.useEffect(() => {
        hookResult = counter;
      });
      return null;
    }

    await act(async () => {
      root?.render(
        <React.StrictMode>
          <TestComponent />
        </React.StrictMode>
      );
    });

    expect(hookResult).not.toBeNull();
    expect(hookResult!.counterMap[101]).toBe(2);
    expect(hookResult!.completedDhikrs.has(101)).toBe(false);

    // Decrement 1: 2 -> 1
    await act(async () => {
      hookResult!.handleDecrement(sampleItem);
    });

    expect(hookResult!.counterMap[101]).toBe(1);
    expect(hookResult!.completedDhikrs.has(101)).toBe(false);

    // Decrement 2: 1 -> 0 (should atomically set completed: true)
    await act(async () => {
      hookResult!.handleDecrement(sampleItem);
    });

    expect(hookResult!.counterMap[101]).toBe(0);
    expect(hookResult!.completedDhikrs.has(101)).toBe(true);

    // Decrementing when already 0 should not go negative or corrupt state
    await act(async () => {
      hookResult!.handleDecrement(sampleItem);
    });

    expect(hookResult!.counterMap[101]).toBe(0);
    expect(hookResult!.completedDhikrs.has(101)).toBe(true);

    // Resetting item should restore initial count and remove from completedDhikrs
    await act(async () => {
      hookResult!.resetCounter(sampleItem);
    });

    expect(hookResult!.counterMap[101]).toBe(2);
    expect(hookResult!.completedDhikrs.has(101)).toBe(false);
  });

  it('handles batched rapid decrements seamlessly in StrictMode', async () => {
    let hookResult: ReturnType<typeof useDhikrCounter> | null = null;

    const sampleItem: DhikrItem = {
      id: 202,
      text: 'الحمد لله',
      count: 3,
      audio: '',
      filename: '',
    };

    function TestComponent() {
      const counter = useDhikrCounter();
      React.useEffect(() => {
        hookResult = counter;
      });
      return null;
    }

    await act(async () => {
      root?.render(
        <React.StrictMode>
          <TestComponent />
        </React.StrictMode>
      );
    });

    // Rapidly decrement 3 times in a single act batch
    await act(async () => {
      hookResult!.handleDecrement(sampleItem);
      hookResult!.handleDecrement(sampleItem);
      hookResult!.handleDecrement(sampleItem);
    });

    expect(hookResult!.counterMap[202]).toBe(0);
    expect(hookResult!.completedDhikrs.has(202)).toBe(true);
  });
});
