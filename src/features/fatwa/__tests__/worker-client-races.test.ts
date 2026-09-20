import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { FatwaIndexItem } from '../domain';

/**
 * Race-condition regression tests for the Fatwa search worker client.
 *
 * Before the fix, `pendingCallbacks` was keyed by the query STRING, so:
 *   - two identical in-flight queries overwrote each other (the first promise
 *     never settled — a permanent `await` hang), and
 *   - the 500ms safety timeout cleared whatever entry currently owned that
 *     query key, potentially cancelling a newer request.
 *
 * Now every request carries a unique `requestId`, and the worker echoes it back.
 */

function item(id: string, title: string): FatwaIndexItem {
  return { id, title, question: `سؤال ${id}`, scholar: 'شيخ', hasAnswer: true };
}

/** Minimal fake Worker that records posted messages and lets the test reply. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  posted: Array<{ type: string; requestId?: number; payload?: unknown }> = [];

  constructor(public url: string) {
    FakeWorker.instances.push(this);
  }

  postMessage(msg: { type: string; requestId?: number; payload?: unknown }) {
    this.posted.push(msg);
  }

  /** Simulate the worker answering one SEARCH request. */
  reply(requestId: number, results: FatwaIndexItem[]) {
    this.onmessage?.({ data: { type: 'SEARCH_RESULTS', requestId, results } });
  }

  /** Simulate the worker finishing index construction. */
  ready(totalCount = 1) {
    this.onmessage?.({ data: { type: 'INDEX_READY', totalCount } });
  }
}

let fatwaWorkerClient: import('../infrastructure/worker-client').FatwaWorkerClient;
let worker: FakeWorker;

beforeEach(async () => {
  FakeWorker.instances = [];
  vi.stubGlobal('Worker', FakeWorker);
  vi.resetModules();
  const mod = await import('../infrastructure/worker-client');
  fatwaWorkerClient = mod.fatwaWorkerClient;
  worker = FakeWorker.instances[0];
  worker.ready();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FatwaWorkerClient — search request races', () => {
  it('assigns a unique requestId to every search call', async () => {
    void fatwaWorkerClient.searchAsync('زكاة');
    void fatwaWorkerClient.searchAsync('زكاة');
    const ids = worker.posted.filter((m) => m.type === 'SEARCH').map((m) => m.requestId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2); // distinct, never the same id
    expect(ids).toEqual([1, 2]);
  });

  it('resolves BOTH identical in-flight queries (duplicate query must not hang)', async () => {
    const p1 = fatwaWorkerClient.searchAsync('زكاة');
    const p2 = fatwaWorkerClient.searchAsync('زكاة');
    const [id1, id2] = worker.posted.filter((m) => m.type === 'SEARCH').map((m) => m.requestId as number);

    worker.reply(id1, [item('a', 'زكاة الأولى')]);
    worker.reply(id2, [item('b', 'زكاة الثانية')]);

    await expect(p1).resolves.toEqual([item('a', 'زكاة الأولى')]);
    await expect(p2).resolves.toEqual([item('b', 'زكاة الثانية')]);
  });

  it('delivers results correctly when responses arrive in REVERSE order', async () => {
    const p1 = fatwaWorkerClient.searchAsync('صلاة');
    const p2 = fatwaWorkerClient.searchAsync('صلاة');
    const [id1, id2] = worker.posted.filter((m) => m.type === 'SEARCH').map((m) => m.requestId as number);

    // Newest request answers first
    worker.reply(id2, [item('new', 'الأحدث')]);
    worker.reply(id1, [item('old', 'الأقدم')]);

    await expect(p1).resolves.toEqual([item('old', 'الأقدم')]);
    await expect(p2).resolves.toEqual([item('new', 'الأحدث')]);
  });

  it('settles the promise via the fallback when a reply never arrives (timeout)', async () => {
    vi.useFakeTimers();
    try {
      const p = fatwaWorkerClient.searchAsync('نادر');
      const id = worker.posted.filter((m) => m.type === 'SEARCH')[0].requestId as number;
      expect(id).toBeTypeOf('number');
      vi.advanceTimersByTime(600);
      await expect(p).resolves.toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not cancel a newer request when an older duplicate times out', async () => {
    vi.useFakeTimers();
    try {
      const p1 = fatwaWorkerClient.searchAsync('ميراث');
      const p2 = fatwaWorkerClient.searchAsync('ميراث');
      const [id1, id2] = worker.posted.filter((m) => m.type === 'SEARCH').map((m) => m.requestId as number);

      // Only the newest gets a real worker reply; the older one will time out.
      worker.reply(id2, [item('n', 'أحدث')]);
      await expect(p2).resolves.toEqual([item('n', 'أحدث')]);

      vi.advanceTimersByTime(600); // older entry times out → fallback, not a hang
      await expect(p1).resolves.toBeDefined();
      expect(id1).not.toBe(id2);
    } finally {
      vi.useRealTimers();
    }
  });
});