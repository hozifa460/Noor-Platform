import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Regression tests for the global hadith search stall (production diagnosis):
 *
 * Reproduction: /hadith → "كل الدواوين" (global mode) → type a query →
 * the "جاري البحث في دواوين السنة الـ 17" spinner persists indefinitely.
 *
 * Root cause proven in code (before this fix):
 *   1. loadHadithMicroIndex fetched the 21.5MB index with NO timeout — a
 *      stalled connection left `searchingGlobal` true forever (no settle path).
 *   2. No single-flight: every concurrent caller started its OWN 21.5MB fetch
 *      (microIndexCache is only set after full completion), multiplying the
 *      wait and bandwidth.
 *
 * These tests simulate a STALLED fetch (a promise that never resolves — the
 * on-the-wire equivalent of the production stall) and assert the loader
 * settles instead of hanging, and that concurrent callers share one fetch.
 */

let fetchCalls: string[] = [];

// Force the BROWSER code path: in vitest `process.versions.node` exists, which
// would otherwise route into the local-FS branch (and the real 21MB fixture).
// We stub `fs` so existsSync is false → the loader must use (stubbed) fetch.
vi.mock('node:fs', () => ({
  default: { existsSync: () => false, readFileSync: () => { throw new Error('no fs in test'); } },
}));
vi.mock('fs', () => ({
  default: { existsSync: () => false, readFileSync: () => { throw new Error('no fs in test'); } },
  existsSync: () => false,
  readFileSync: () => { throw new Error('no fs in test'); },
}));


beforeEach(() => {
  fetchCalls = [];
  vi.stubGlobal('fetch', vi.fn((url: string | URL | Request) => {
    fetchCalls.push(String(url));
    // Simulate a stalled connection: the response NEVER arrives.
    return new Promise<Response>(() => {});
  }) as unknown as typeof fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadHadithMicroIndex — stalled-fetch races (global search hang)', () => {
  it('SETTLES (with empty fallback) when the index fetch stalls, instead of hanging forever', async () => {
    vi.useFakeTimers();
    try {
      const { loadHadithMicroIndex } = await import('../infrastructure/search');
      const p = loadHadithMicroIndex();
      let settled = false;
      void p.then(() => { settled = true; }, () => { settled = true; });

      // Advance past the bounded-fetch timeouts (all fallback attempts).
      await vi.advanceTimersByTimeAsync(70_000);

      expect(settled).toBe(true);
      await expect(p).resolves.toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('coalesces concurrent loaders into a SINGLE in-flight fetch (no parallel 21MB downloads)', async () => {
    vi.useFakeTimers();
    try {
      const { loadHadithMicroIndex } = await import('../infrastructure/search');
      void loadHadithMicroIndex();
      void loadHadithMicroIndex();
      void loadHadithMicroIndex();

      // Flush microtasks so the first loader reaches its fetch call; concurrent
      // callers must share the in-flight promise — no second fetch may start.
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();

      // All three callers must share one fetch of the index URL.
      const indexCalls = fetchCalls.filter((u) => u.includes('hadiths_core_index.json'));
      expect(indexCalls.length).toBe(1);

      // Let bounded timeouts fire so pending promises settle (no dangling timers).
      await vi.advanceTimersByTimeAsync(70_000);
    } finally {
      vi.useRealTimers();
    }
  });
});
