import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Real-data compatibility tests for micro-index payload validation.
 *
 * The structural validator previously demanded a 5-field tuple and therefore
 * REJECTED the shipped dataset. Verified facts about the real file
 * (public/data/hadith/hadiths_core_index.json):
 *   - `books`: 14 entries, `grades`: 4 entries
 *   - `items`: 41,676 rows, EVERY row exactly 4 fields
 *     [bookIndex, idInBook, chapterId, text] — no 5th grade field at all.
 * These tests load the REAL file (no fixture rewriting) and prove it is accepted
 * both through the Node/bundle path and the browser fetch path.
 */

const REAL_INDEX_PATH = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_core_index.json');
const realRaw = JSON.parse(readFileSync(REAL_INDEX_PATH, 'utf-8')) as {
  books: string[];
  grades: string[];
  items: unknown[][];
};

const EXPECTED_ITEM_COUNT = 41676;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock('fs');
  vi.doUnmock('node:fs');
  vi.resetModules();
});

describe('micro-index validation — real shipped dataset', () => {
  it('the real dataset has the documented 4-field row shape (no 5th grade field)', () => {
    expect(Array.isArray(realRaw.books)).toBe(true);
    expect(Array.isArray(realRaw.grades)).toBe(true);
    expect(Array.isArray(realRaw.items)).toBe(true);
    expect(realRaw.items.length).toBe(EXPECTED_ITEM_COUNT);
    // Every single row is exactly 4 fields.
    const wrongLength = realRaw.items.filter((it) => !Array.isArray(it) || it.length !== 4);
    expect(wrongLength).toHaveLength(0);
  });

  it('accepts the real payload and parses all 41,676 records', async () => {
    const mod = await import('../infrastructure/search');
    expect(mod.isValidMicroIndexPayload(realRaw)).toBe(true);

    const entries = mod.parseMicroIndexPayload(realRaw);
    expect(entries).toHaveLength(EXPECTED_ITEM_COUNT);

    // Spot-check real records: shape + content integrity.
    expect(entries[0]).toMatchObject({ b: 'bukhari', i: 1, c: 1 });
    expect(entries[0].t).toContain('إنما الأعمال بالنيات');
    // Grade is absent upstream → parser resolves the documented fallback.
    expect(entries[0].g).toBe('غير محدد');
    // Book references all resolve into the 14 shipped collections.
    const distinctBooks = new Set(entries.map((e) => e.b));
    expect(distinctBooks.size).toBe(realRaw.books.length);
    expect([...distinctBooks].every((b) => realRaw.books.includes(b))).toBe(true);
  });

  it('loads the real dataset through the NODE (local FS) path', async () => {
    const mod = await import('../infrastructure/search');
    const outcome = await mod.loadHadithMicroIndexOutcome();
    expect(outcome.status).toBe('loaded');
    if (outcome.status === 'loaded') {
      expect(outcome.entries).toHaveLength(EXPECTED_ITEM_COUNT);
    }
    expect(mod.getMicroIndexLoadError()).toBeNull();
  });

  it('loads the real dataset through the BROWSER fetch path (real file as the mocked response)', async () => {
    // Force the BROWSER branch: pretend no local file exists.
    vi.resetModules();
    vi.doMock('fs', () => ({
      default: { existsSync: () => false, readFileSync: () => { throw new Error('no fs'); } },
      existsSync: () => false,
      readFileSync: () => { throw new Error('no fs'); },
    }));
    vi.doMock('node:fs', () => ({
      default: { existsSync: () => false, readFileSync: () => { throw new Error('no fs'); } },
      existsSync: () => false,
      readFileSync: () => { throw new Error('no fs'); },
    }));

    const fetchCalls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string | URL | Request) => {
      fetchCalls.push(String(url));
      // Serve the REAL shipped file bytes as the browser response body.
      return Promise.resolve({ ok: true, status: 200, json: async () => realRaw } as Response);
    }) as unknown as typeof fetch);

    const mod = await import('../infrastructure/search');
    const outcome = await mod.loadHadithMicroIndexOutcome();

    expect(outcome.status).toBe('loaded');
    if (outcome.status === 'loaded') {
      expect(outcome.entries).toHaveLength(EXPECTED_ITEM_COUNT);
      expect(outcome.entries[0].t).toContain('إنما الأعمال بالنيات');
    }
    // Exactly one bounded fetch of the index URL (browser source).
    expect(fetchCalls.filter((u) => u.includes('hadiths_core_index.json'))).toHaveLength(1);
    expect(mod.getMicroIndexLoadError()).toBeNull();
  });

  it('searches the real dataset end-to-end for «إنما الأعمال بالنيات»', async () => {
    const mod = await import('../infrastructure/search');
    const results = await mod.searchAcrossAllBooks('إنما الأعمال بالنيات');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.hadith.arabic.includes('إنما الأعمال بالنيات'))).toBe(true);
  });
});
describe('micro-index validation — 4-field rows honoured, malformed rejected', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('accepts a minimal 4-field row (optional grade omitted)', async () => {
    const mod = await import('../infrastructure/search');
    expect(
      mod.isValidMicroIndexPayload({ books: ['bukhari'], grades: ['صحيح'], items: [[0, 1, 1, 'متن']] })
    ).toBe(true);
    // and still accepts the 5-field variant when the grade index is present
    expect(
      mod.isValidMicroIndexPayload({ books: ['bukhari'], grades: ['صحيح'], items: [[0, 1, 1, 'متن', 0]] })
    ).toBe(true);
  });

  it('rejects wrong field TYPES inside the tuple', async () => {
    const mod = await import('../infrastructure/search');
    const base = { books: ['bukhari'], grades: ['صحيح'] };
    expect(mod.isValidMicroIndexPayload({ ...base, items: [['0', 1, 1, 'متن']] })).toBe(false); // bookIdx string
    expect(mod.isValidMicroIndexPayload({ ...base, items: [[0, '1', 1, 'متن']] })).toBe(false); // idInBook string
    expect(mod.isValidMicroIndexPayload({ ...base, items: [[0, 1, '1', 'متن']] })).toBe(false); // chapterId string
    expect(mod.isValidMicroIndexPayload({ ...base, items: [[0, 1, 1, 42]] })).toBe(false); // text not a string
    expect(mod.isValidMicroIndexPayload({ ...base, items: [[0, 1, 1, 'متن', 'x']] })).toBe(false); // gradeIdx string
  });

  it('rejects out-of-range BOOK references (misaligned/corrupted index)', async () => {
    const mod = await import('../infrastructure/search');
    const books = ['bukhari', 'muslim']; // valid indices: 0,1
    const grades = ['صحيح'];
    expect(mod.isValidMicroIndexPayload({ books, grades, items: [[2, 1, 1, 'متن']] })).toBe(false); // out of range
    expect(mod.isValidMicroIndexPayload({ books, grades, items: [[-1, 1, 1, 'متن']] })).toBe(false); // negative
    expect(mod.isValidMicroIndexPayload({ books, grades, items: [[1, 1, 1, 'متن']] })).toBe(true); // valid index
  });

  it('rejects malformed books/grades arrays', async () => {
    const mod = await import('../infrastructure/search');
    expect(mod.isValidMicroIndexPayload({ books: [1, 2], grades: ['صحيح'], items: [[0, 1, 1, 'متن']] })).toBe(false);
    expect(mod.isValidMicroIndexPayload({ books: ['bukhari'], grades: [1], items: [[0, 1, 1, 'متن']] })).toBe(false);
    expect(mod.isValidMicroIndexPayload({ books: [], grades: [], items: {} })).toBe(false);
    expect(mod.isValidMicroIndexPayload({ books: [], grades: [] })).toBe(false);
  });

  it('legacy ARRAY shape is validated element-wise (Array.isArray alone is not enough)', async () => {
    const mod = await import('../infrastructure/search');
    // A plain array of valid rows is accepted…
    expect(mod.isValidMicroIndexPayload([['bukhari', 1, 1, 'متن']])).toBe(true);
    // …but a stray JSON array (strings/numbers/objects) must NOT pass as an index.
    expect(mod.isValidMicroIndexPayload(['error', 'unavailable'])).toBe(false);
    expect(mod.isValidMicroIndexPayload([1, 2, 3])).toBe(false);
    expect(mod.isValidMicroIndexPayload([{ error: 'unavailable' }])).toBe(false);
    expect(mod.isValidMicroIndexPayload([['bukhari', 1]])).toBe(false); // truncated row
    expect(mod.isValidMicroIndexPayload([['', 1, 1, 'متن']])).toBe(false); // empty book id
  });
});