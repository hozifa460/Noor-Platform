import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Tests for:
 *  (A) per-ATTEMPT bounded body read — headers arriving fast must not exempt a
 *      body that stalls mid-download (stalled `Response.json()` also settles);
 *  (B) single-flight sharing stays intact under concurrent load attempts;
 *  (C) timer cleanup — a successful load leaves no dangling timeout handles;
 *  (D) load FAILURE vs EMPTY index is distinguished end-to-end, retry refetches
 *      fresh, and a failure is never cached as success.
 */

let fetchCalls: string[] = [];
let fetchImpl: (url: string) => Promise<Response> = () =>
  new Promise<Response>(() => {}); // default: fully stalled connection

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
  fetchImpl = () => new Promise<Response>(() => {});
  vi.stubGlobal('fetch', vi.fn((url: string | URL | Request) => {
    fetchCalls.push(String(url));
    return fetchImpl(String(url));
  }) as unknown as typeof fetch);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function okJson(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response;
}

const VALID_PAYLOAD = { books: ['bukhari'], grades: ['صحيح'], items: [[0, 1, 1, 'متن الحديث', 0]] };

describe('payload structure validation (invalid payload = source failure)', () => {
  it('HTTP 200 with {"error":"unavailable"} is treated as a source failure, not an empty index', async () => {
    vi.useFakeTimers();
    try {
      fetchImpl = () => Promise.resolve(okJson({ error: 'unavailable' }));
      const mod = await import('../infrastructure/search');
      const outcome = await mod.loadHadithMicroIndexOutcome();
      expect(outcome).toEqual({ status: 'failed', reason: 'invalid-payload' });
      expect(mod.getMicroIndexLoadError()).toEqual({ status: 'failed', reason: 'invalid-payload' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('an invalid payload is NOT cached: recovery afterwards returns a valid load', async () => {
    vi.useFakeTimers();
    try {
      // Attempt 1: both sources answer 200 with a non-index body.
      fetchImpl = () => Promise.resolve(okJson({ error: 'unavailable' }));
      const mod = await import('../infrastructure/search');
      const attempt1 = await mod.loadHadithMicroIndexOutcome();
      expect(attempt1).toEqual({ status: 'failed', reason: 'invalid-payload' });

      // Attempt 2: the source recovers with a real index → must be loaded, not replayed failure.
      fetchImpl = () => Promise.resolve(okJson(VALID_PAYLOAD));
      const attempt2 = await mod.loadHadithMicroIndexOutcome();
      expect(attempt2.status).toBe('loaded');
      if (attempt2.status === 'loaded') {
        expect(attempt2.entries).toHaveLength(1);
        expect(attempt2.entries[0]).toMatchObject({ b: 'bukhari', i: 1 });
      }
      expect(mod.getMicroIndexLoadError()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('an invalid payload from the first source falls through to the next source (which succeeds)', async () => {
    vi.useFakeTimers();
    try {
      // Same-origin returns {"error":...}; the CDN/HF mirror returns a valid index.
      fetchImpl = (url) =>
        Promise.resolve(url.startsWith('/') ? okJson({ error: 'unavailable' }) : okJson(VALID_PAYLOAD));
      const mod = await import('../infrastructure/search');
      const outcome = await mod.loadHadithMicroIndexOutcome();
      expect(outcome.status).toBe('loaded');
      const indexCalls = fetchCalls.filter((u) => u.includes('hadiths_core_index.json'));
      expect(indexCalls.length).toBe(2); // tried source 1 (invalid) then source 2 (valid)
    } finally {
      vi.useRealTimers();
    }
  });

  it('a structurally-correct EMPTY index remains a VALID load (emptiness is data)', async () => {
    vi.useFakeTimers();
    try {
      fetchImpl = () => Promise.resolve(okJson({ books: [], grades: [], items: [] }));
      const mod = await import('../infrastructure/search');
      expect(mod.isValidMicroIndexPayload({ books: [], grades: [], items: [] })).toBe(true);
      const outcome = await mod.loadHadithMicroIndexOutcome();
      expect(outcome).toEqual({ status: 'loaded', entries: [] });
      expect(mod.getMicroIndexLoadError()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects malformed variants: missing keys, non-array items, truncated tuples', async () => {
    const mod = await import('../infrastructure/search');
    expect(mod.isValidMicroIndexPayload(null)).toBe(false);
    expect(mod.isValidMicroIndexPayload('x')).toBe(false);
    expect(mod.isValidMicroIndexPayload({ error: 'unavailable' })).toBe(false);
    expect(mod.isValidMicroIndexPayload({ books: [], grades: [] })).toBe(false);
    expect(mod.isValidMicroIndexPayload({ books: [], grades: [], items: {} })).toBe(false);
    // truncated tuple (only 3 fields) is treated as corrupted
    expect(mod.isValidMicroIndexPayload({ books: ['bukhari'], grades: ['صحيح'], items: [[0, 1, 1]] })).toBe(false);
    expect(mod.isValidMicroIndexPayload(VALID_PAYLOAD)).toBe(true);
  });
});

describe('loadHadithMicroIndex — stalled-fetch races (global search hang)', () => {
  it('(pre-existing) SETTLES (with empty fallback) when the index fetch stalls, instead of hanging forever', async () => {
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

  it('(A) a body that stalls AFTER headers still settles via the per-attempt timeout', async () => {
    vi.useFakeTimers();
    try {
      // Headers arrive instantly (ok=true), but res.json() never resolves —
      // the timeout must cover the body read, not just the header wait.
      fetchImpl = () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => new Promise<unknown>(() => {}),
        } as unknown as Response);

      const { loadHadithMicroIndexOutcome, getMicroIndexLoadError } = await import('../infrastructure/search');
      const p = loadHadithMicroIndexOutcome();
      let outcome: unknown;
      void p.then((o) => { outcome = o; });

      // Past BOTH per-attempt budgets (same-origin source, then HF mirror).
      await vi.advanceTimersByTimeAsync(65_000);

      expect(outcome).toEqual({ status: 'failed', reason: 'timeout' });
      expect(getMicroIndexLoadError()).toEqual({ status: 'failed', reason: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('(B) single-flight holds under concurrency: one attempt, one shared outcome', async () => {
    vi.useFakeTimers();
    try {
      const { loadHadithMicroIndexOutcome } = await import('../infrastructure/search');
      const ps = [loadHadithMicroIndexOutcome(), loadHadithMicroIndexOutcome(), loadHadithMicroIndexOutcome()];
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();

      const indexCalls = fetchCalls.filter((u) => u.includes('hadiths_core_index.json'));
      expect(indexCalls.length).toBe(1); // three callers, ONE fetch

      void Promise.all(ps).then(() => {});
      await vi.advanceTimersByTimeAsync(65_000);
      const results = await Promise.all(ps);
      expect(results[0]).toEqual({ status: 'failed', reason: 'timeout' });
      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('(C) timers are cleaned up: no dangling timeout handles after a successful load', async () => {
    vi.useFakeTimers();
    try {
      fetchImpl = () => Promise.resolve(okJson(VALID_PAYLOAD));
      const { loadHadithMicroIndexOutcome } = await import('../infrastructure/search');
      const outcome = await loadHadithMicroIndexOutcome();
      expect(outcome.status).toBe('loaded');
      await vi.advanceTimersByTimeAsync(300_000); // every timer must be cleared
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('(D) failure is NOT cached: retry refetches fresh and can succeed after failing', async () => {
    vi.useFakeTimers();
    try {
      const mod = await import('../infrastructure/search');
      const attempt1 = mod.loadHadithMicroIndexOutcome();
      await vi.advanceTimersByTimeAsync(65_000);
      await expect(attempt1).resolves.toEqual({ status: 'failed', reason: 'timeout' });

      // The source recovers: the NEXT call must fetch again (not replay failure).
      fetchImpl = () => Promise.resolve(okJson(VALID_PAYLOAD));
      const attempt2 = await mod.loadHadithMicroIndexOutcome();
      expect(attempt2.status).toBe('loaded');
      if (attempt2.status === 'loaded') {
        expect(attempt2.entries).toHaveLength(1);
        expect(attempt2.entries[0]).toMatchObject({ b: 'bukhari', i: 1 });
      }
      const indexCalls = fetchCalls.filter((u) => u.includes('hadiths_core_index.json'));
      // Attempt 1 hit both sources (stall), attempt 2 fetched the local source again.
      expect(indexCalls.length).toBeGreaterThanOrEqual(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('(D) searchAcrossAllBooks throws typed MicroIndexLoadError on failure — NOT empty results', async () => {
    vi.useFakeTimers();
    try {
      const mod = await import('../infrastructure/search');
      const p = mod.searchAcrossAllBooks('النيات');
      const assertion = expect(p).rejects.toMatchObject({ name: 'MicroIndexLoadError', reason: 'timeout' });
      await vi.advanceTimersByTimeAsync(65_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('(D) a genuinely EMPTY loaded index still resolves to empty results (not an error)', async () => {
    vi.useFakeTimers();
    try {
      fetchImpl = () => Promise.resolve(okJson({ books: [], grades: [], items: [] }));
      const mod = await import('../infrastructure/search');
      await expect(mod.searchAcrossAllBooks('النيات')).resolves.toEqual([]);
      expect(mod.getMicroIndexLoadError()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
