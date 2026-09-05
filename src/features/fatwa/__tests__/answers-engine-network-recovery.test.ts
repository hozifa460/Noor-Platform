import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFatwaContent,
  clearFatwaAnswerCaches,
} from '../index';

describe('answers-engine — Network Recovery & Resilient Caching', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearFatwaAnswerCaches();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearFatwaAnswerCaches();
    vi.restoreAllMocks();
  });

  it('allows seamless retry and recovers after transient network error without poisoning negativeCache', async () => {
    const testId = 'binbaz_9999';
    let networkCallCount = 0;

    // Simulate transient network failure on call 1, then recovery with real answer on call 2
    global.fetch = vi.fn().mockImplementation(async () => {
      networkCallCount++;
      if (networkCallCount === 1) {
        throw new TypeError('Failed to fetch (simulated transient network drop)');
      }
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            id: testId,
            q: 'ما حكم صيام يوم عرفة؟',
            a: 'صيام يوم عرفة مستحب لغير الحاج، ويكفر السنة الماضية والباقية.',
          },
        ],
      } as Response;
    });

    // Attempt 1 during network drop
    const firstResult = await getFatwaContent(testId);
    expect(firstResult.found).toBe(false);
    expect(networkCallCount).toBe(1);

    // Attempt 2 after network recovery (must make a second network call and succeed!)
    const secondResult = await getFatwaContent(testId);
    expect(secondResult.found).toBe(true);
    expect(secondResult.question).toContain('صيام يوم عرفة');
    expect(secondResult.answer).toContain('يكفر السنة الماضية');
    expect(networkCallCount).toBe(2);
  });

  it('memoizes 404 genuine absent shards without retrying indefinitely', async () => {
    const testId = 'nonexistent_fatwa_id';
    let networkCallCount = 0;

    global.fetch = vi.fn().mockImplementation(async () => {
      networkCallCount++;
      return {
        ok: false,
        status: 404,
        json: async () => [],
      } as Response;
    });

    const firstResult = await getFatwaContent(testId);
    expect(firstResult.found).toBe(false);
    expect(networkCallCount).toBe(1);

    // Genuine 404 is memoized as empty, so second call shouldn't re-hit network
    const secondResult = await getFatwaContent(testId);
    expect(secondResult.found).toBe(false);
    expect(networkCallCount).toBe(1);
  });
});
