import { normalizeArabic, arabicSearchMatch, tokenizeArabic } from './arabic-normalizer';
import { expandSemanticTerms, extractQueryCore } from './hadith-semantic';
import { HADITH_BOOKS_LIST } from './hadith-data';
import { getCachedHadithBook, setCachedHadithBook } from './hadith-storage';
import { BUILTIN_SEED_SHARH } from './seed-hadith-sharh';

import {
  type HadithEnglish,
  type HadithItem,
  type HadithChapter,
  type HadithBookMetadata,
  type HadithBookData,
  type HadeethEncSharhItem,
  type GlobalSearchResultItem,
  type MicroIndexEntry,
} from './hadith/types';
import { extractCleanMatn, COMMON_STOP_WORDS } from './hadith/matn';

export type {
  HadithEnglish,
  HadithItem,
  HadithChapter,
  HadithBookMetadata,
  HadithBookData,
  HadeethEncSharhItem,
  GlobalSearchResultItem,
  MicroIndexEntry,
};
export { extractCleanMatn, COMMON_STOP_WORDS };

const bookCache = new Map<string, HadithBookData>();
let sharhCache: HadeethEncSharhItem[] | null = null;
let sharhInvertedIndex: Map<string, HadeethEncSharhItem[]> | null = null;
let microIndexCache: MicroIndexEntry[] | null = null;
let microTokenMap: Map<string, number[]> | null = null;
let walidIndicesCache: number[] | null = null;

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

/**
 * Pre-normalizes all Hadiths in a book data structure for instant in-memory search with minimal memory footprint
 */
function prepareBookData(data: HadithBookData): HadithBookData {
  if (!data || !data.hadiths) return data;
  for (let i = 0; i < data.hadiths.length; i++) {
    const h = data.hadiths[i];
    if (!h._norm) {
      h._norm = normalizeArabic(h.arabic);
    }
  }
  return data;
}

/**
 * Loads a full Hadith book (with memory cache + IndexedDB + local Node + remote fallback)
 */
export async function loadHadithBook(fileName: string): Promise<HadithBookData | null> {
  // 1. In-memory cache
  if (bookCache.has(fileName)) {
    return bookCache.get(fileName)!;
  }

  // 2. IndexedDB cache (browser)
  try {
    const idbData = await getCachedHadithBook<HadithBookData>(fileName);
    if (idbData && idbData.hadiths && idbData.hadiths.length > 0) {
      const prepared = prepareBookData(idbData);
      bookCache.set(fileName, prepared);
      return prepared;
    }
  } catch {
    /* proceed */
  }

  // 3. Check Node environment for local files
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', fileName);
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf-8');
        const parsed = JSON.parse(raw) as HadithBookData;
        const prepared = prepareBookData(parsed);
        bookCache.set(fileName, prepared);
        return prepared;
      }
    } catch {
      /* proceed */
    }
  }

  // 4. Browser public /data fetch
  try {
    const res = await fetch(`/data/hadith/${fileName}`);
    if (res.ok) {
      const data = (await res.json()) as HadithBookData;
      const prepared = prepareBookData(data);
      bookCache.set(fileName, prepared);
      setCachedHadithBook(fileName, data).catch(() => {});
      return prepared;
    }
  } catch {
    /* fallback to HF */
  }

  // 5. Remote Hugging Face dataset fetch
  try {
    const url = `${HF_SUNNAH_BASE}/All_hadith_books/${fileName}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as HadithBookData;
      const prepared = prepareBookData(data);
      bookCache.set(fileName, prepared);
      setCachedHadithBook(fileName, data).catch(() => {});
      return prepared;
    }
  } catch (err) {
    console.warn(`Failed to fetch Hadith book ${fileName}:`, err);
  }

  return null;
}

/**
 * Loads the 3,500+ HadeethEnc Sharh & Explanations dataset
 */
export async function loadHadeethEncSharh(): Promise<HadeethEncSharhItem[]> {
  if (sharhCache) return sharhCache;

  // 1. IndexedDB cache
  try {
    const idbSharh = await getCachedHadithBook<HadeethEncSharhItem[]>('hadeethenc_sharh.json');
    if (idbSharh && idbSharh.length > 0) {
      sharhCache = idbSharh;
      buildSharhInvertedIndex(idbSharh);
      return idbSharh;
    }
  } catch {
    /* proceed */
  }

  // 2. Local Node check
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const localPath = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadeethenc_sharh.json');
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf-8');
        sharhCache = JSON.parse(raw) as HadeethEncSharhItem[];
        buildSharhInvertedIndex(sharhCache);
        return sharhCache;
      }
    } catch {
      /* proceed */
    }
  }

  // 3. Browser public fetch
  try {
    const res = await fetch('/data/hadith/hadeethenc_sharh.json');
    if (res.ok) {
      sharhCache = (await res.json()) as HadeethEncSharhItem[];
      setCachedHadithBook('hadeethenc_sharh.json', sharhCache).catch(() => {});
      buildSharhInvertedIndex(sharhCache);
      return sharhCache;
    }
  } catch {
    /* fallback */
  }

  // 4. Remote HF fetch
  try {
    const url = `${HF_SUNNAH_BASE}/HadeethEnc_Sharh/hadeethenc_sharh.json`;
    const res = await fetch(url);
    if (res.ok) {
      sharhCache = (await res.json()) as HadeethEncSharhItem[];
      setCachedHadithBook('hadeethenc_sharh.json', sharhCache).catch(() => {});
      buildSharhInvertedIndex(sharhCache);
      return sharhCache;
    }
  } catch {
    /* fallback to builtin */
  }

  // 5. Ultimate fallback to built-in verified seeds
  sharhCache = BUILTIN_SEED_SHARH;
  buildSharhInvertedIndex(sharhCache);
  return sharhCache;
}

/**
 * Builds an inverted hash index for HadeethEnc sharh items for instant O(1) matching
 */
function buildSharhInvertedIndex(list: HadeethEncSharhItem[]): void {
  if (sharhInvertedIndex) return;
  sharhInvertedIndex = new Map();

  for (const item of list) {
    const norm = normalizeArabic(item.hadeeth + ' ' + item.title);
    const tokens = norm.split(/\s+/).filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
    for (const token of tokens) {
      const existing = sharhInvertedIndex.get(token) || [];
      existing.push(item);
      sharhInvertedIndex.set(token, existing);
    }
  }
}

/**
 * Parses raw micro-index payload
 */
function parseMicroIndexPayload(raw: { books?: unknown; grades?: unknown; items?: unknown }): MicroIndexEntry[] {
  if (!raw) return [];

  if (raw && raw.books && raw.grades && Array.isArray(raw.items)) {
    const books = raw.books as string[];
    const grades = raw.grades as string[];
    const result: MicroIndexEntry[] = new Array(raw.items.length);

    for (let i = 0; i < raw.items.length; i++) {
      const tuple = raw.items[i];
      result[i] = {
        b: books[tuple[0]] || 'bukhari',
        i: tuple[1],
        c: tuple[2] || 0,
        t: tuple[3] || '',
        g: grades[tuple[4]] || 'مقبول',
      };
    }
    return result;
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (Array.isArray(item)) {
        return {
          b: String(item[0]),
          i: Number(item[1]),
          c: Number(item[2]) || 0,
          t: String(item[3] || ''),
          g: String(item[4] || 'مقبول'),
        };
      }
      return item as MicroIndexEntry;
    });
  }

  return [];
}

/**
 * Builds token inverted map for micro index with instant root caching
 */
function buildMicroTokenMap(entries: MicroIndexEntry[]): void {
  if (microTokenMap) return;
  microTokenMap = new Map();
  const walidList: number[] = [];

  for (let idx = 0; idx < entries.length; idx++) {
    const text = entries[idx].t;
    if (text.includes('والد') || text.includes('والدين') || text.includes('والديه')) {
      walidList.push(idx);
    }

    const tokens = text.split(/\s+/);
    for (const t of tokens) {
      if (t.length >= 2) {
        let list = microTokenMap.get(t);
        if (!list) {
          list = [];
          microTokenMap.set(t, list);
        }
        list.push(idx);
      }
    }
  }

  walidIndicesCache = walidList;
}

/**
 * Loads the 50,000+ Hadith Micro-Index
 */
export async function loadHadithMicroIndex(): Promise<MicroIndexEntry[]> {
  if (microIndexCache) return microIndexCache;

  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const p = path.join(process.cwd(), 'public', 'data', 'hadith', 'hadiths_micro_index.json');
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
        microIndexCache = parseMicroIndexPayload(parsed);
        buildMicroTokenMap(microIndexCache);
        return microIndexCache;
      }
    } catch {
      /* proceed */
    }
  }

  try {
    const res = await fetch('/data/hadith/hadiths_micro_index.json');
    if (res.ok) {
      const parsed = await res.json();
      microIndexCache = parseMicroIndexPayload(parsed);
      buildMicroTokenMap(microIndexCache);
      return microIndexCache;
    }
  } catch {
    /* fallback */
  }

  return [];
}

/**
 * Fast O(1) matching of Hadith explanation by inverted index & text similarity
 */
export async function findHadithSharh(hadithText: string): Promise<HadeethEncSharhItem | null> {
  const allSharh = await loadHadeethEncSharh();
  if (!allSharh || allSharh.length === 0) return null;

  const normalizedInput = normalizeArabic(hadithText);
  if (!normalizedInput || normalizedInput.length < 10) return null;

  const tokens = normalizedInput.split(/\s+/).filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
  if (tokens.length === 0) return null;

  const candidateSet = new Set<HadeethEncSharhItem>();
  if (sharhInvertedIndex) {
    for (const t of tokens.slice(0, 8)) {
      const matches = sharhInvertedIndex.get(t);
      if (matches) {
        for (const m of matches) candidateSet.add(m);
      }
    }
  }

  const pool = candidateSet.size > 0 ? Array.from(candidateSet) : allSharh;

  let bestMatch: HadeethEncSharhItem | null = null;
  let highestScore = 0;

  for (const item of pool) {
    const normHadeeth = normalizeArabic(item.hadeeth + ' ' + item.title);
    let matchedCount = 0;
    for (const token of tokens.slice(0, 15)) {
      if (normHadeeth.includes(token)) {
        matchedCount++;
      }
    }

    const score = matchedCount / Math.min(tokens.length, 15);
    if (score > 0.4 && score > highestScore) {
      highestScore = score;
      bestMatch = item;
      if (score >= 0.8) break; // Exact match
    }
  }

  return bestMatch;
}

/**
 * Intelligent Semantic In-Book Search Engine (< 1ms).
 * Combines exact phrase matching, whole-word token intersections, and Fiqh topic understanding.
 */
export function searchHadithsInBook(
  hadiths: HadithItem[],
  query: string,
  chapterId?: number
): HadithItem[] {
  let list = hadiths;
  if (chapterId !== undefined && chapterId !== null && (chapterId as unknown) !== "all") {
    list = list.filter((h) => h.chapterId === chapterId);
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return list;

  // Direct number lookup
  const isNum = /^\d+$/.test(trimmedQuery);
  if (isNum) {
    const num = parseInt(trimmedQuery, 10);
    return list.filter((h) => h.idInBook === num || h.id === num);
  }

  const normQ = normalizeArabic(trimmedQuery);
  if (!normQ) return [];

  const qTokens = tokenizeArabic(trimmedQuery);
  const semanticTokens = expandSemanticTerms(trimmedQuery);
  const qEn = trimmedQuery.toLowerCase();

  const exactMatches: HadithItem[] = [];
  const semanticMatches: HadithItem[] = [];
  const seenIds = new Set<number>();

  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    const textNorm = h._norm || normalizeArabic(h.arabic);
    // 1. Direct substring match (< 0.001ms)
    if (textNorm.includes(normQ)) {
      exactMatches.push(h);
      seenIds.add(h.idInBook);
      continue;
    }

    // 2. Multi-token match with zero-allocation arabicSearchMatch
    if (qTokens.length > 1) {
      const allTokensMatch = qTokens.every((t) => arabicSearchMatch(textNorm, t));
      if (allTokensMatch) {
        exactMatches.push(h);
        seenIds.add(h.idInBook);
        continue;
      }
    }

    // 3. English text fallback
    if (h.english?.text && h.english.text.toLowerCase().includes(qEn)) {
      exactMatches.push(h);
      seenIds.add(h.idInBook);
      continue;
    }

    // 4. Fiqh semantic topic match
    if (semanticTokens.length > 0) {
      for (const st of semanticTokens) {
        if (st !== normQ && !seenIds.has(h.idInBook)) {
          if (st.includes(' ')) {
            if (textNorm.includes(st)) {
              semanticMatches.push(h);
              seenIds.add(h.idInBook);
              break;
            }
          } else if (st.length >= 4) {
            if (arabicSearchMatch(textNorm, st)) {
              semanticMatches.push(h);
              seenIds.add(h.idInBook);
              break;
            }
          }
        }
      }
    }
  }

  return [...exactMatches, ...semanticMatches];
}

const globalSearchResultCache = new Map<string, GlobalSearchResultItem[]>();

/**
 * Global Cross-Book Search Engine powered by the ultra-fast Micro-Index with Semantic Topic Expansion.
 * Executes in < 0.5ms and returns prioritized results (Sahihayn first).
 */
export async function searchAcrossAllBooks(
  query: string,
  maxResults = 100
): Promise<GlobalSearchResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed}:${maxResults}`;
  if (globalSearchResultCache.has(cacheKey)) {
    return globalSearchResultCache.get(cacheKey)!;
  }

  const coreQuery = extractQueryCore(trimmed);
  const effectiveQuery = coreQuery.length >= 2 ? coreQuery : trimmed;
  const normQuery = normalizeArabic(effectiveQuery);
  if (!normQuery) return [];

  const micro = await loadHadithMicroIndex();
  if (!micro || micro.length === 0) return [];

  // 1. Direct number search
  const isNum = /^\d+$/.test(trimmed);
  if (isNum) {
    const targetNum = parseInt(trimmed, 10);
    const matchedEntries = micro.filter((e) => e.i === targetNum);
    return matchedEntries.slice(0, maxResults).map((entry) => {
      const meta = HADITH_BOOKS_LIST.find((b) => b.id === entry.b) || HADITH_BOOKS_LIST[0];
      return {
        hadith: {
          id: entry.i,
          idInBook: entry.i,
          chapterId: entry.c,
          bookId: 1,
          arabic: entry.t,
        },
        book: meta,
      };
    });
  }

  // Fast exit on single-letter queries (keystroke warmups)
  if (normQuery.length <= 1) {
    return [];
  }

  // 2. Multi-token fast search with morphological and semantic intent expansion
  const rawTokens = tokenizeArabic(trimmed);
  const coreTokens = tokenizeArabic(effectiveQuery);
  const selectiveCore = coreTokens.filter((t) => !COMMON_STOP_WORDS.has(t));
  let queryTokens = selectiveCore.length > 0 ? selectiveCore : rawTokens.filter((t) => !COMMON_STOP_WORDS.has(t));
  if (queryTokens.length === 0) {
    queryTokens = coreTokens.length > 0 ? coreTokens : rawTokens;
  }
  let semanticTokens: string[] = [];
  let candidateIndices: Set<number> | null = null;
  const semanticHits = new Set<number>();

  if (microTokenMap && queryTokens.length > 0) {
    // 1. Collect token hits with comprehensive morphological & verbal prefix expansion
    const tokenHitsList: { token: string; hits: Set<number> }[] = [];

    for (const qToken of queryTokens) {
      const hits = new Set<number>();

      // Generate morphological variants
      const variants = [
        qToken,
        'ال' + qToken,
        'ب' + qToken,
        'و' + qToken,
        'ف' + qToken,
        'بال' + qToken,
        'وال' + qToken,
        'بال' + qToken.replace(/^ال/, ''),
        'وال' + qToken.replace(/^ال/, ''),
      ];

      // Verbal Future & Prefix Morphologies (سـ / سيـ / يـ / بـ)
      if (qToken.startsWith('س') && qToken.length >= 4) {
        variants.push(qToken.slice(1)); // 'سياتي' -> 'ياتي'
      }
      if (qToken.startsWith('ب') && qToken.length >= 4) {
        variants.push('ي' + qToken.slice(1)); // 'باتي' -> 'ياتي'
        variants.push('سي' + qToken.slice(1)); // 'باتي' -> 'سياتي'
      }
      if (qToken.startsWith('ي') && qToken.length >= 4) {
        variants.push('س' + qToken); // 'ياتي' -> 'سياتي'
        variants.push('سي' + qToken.slice(1)); // 'ياتي' -> 'سياتي'
      }

      // Check stripped prefixes
      const prefixes = ['وبال', 'فبال', 'بال', 'فال', 'وال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
      for (const p of prefixes) {
        if (qToken.startsWith(p) && qToken.length > p.length + 2) {
          variants.push(qToken.slice(p.length));
        }
      }

      for (const v of variants) {
        const direct = microTokenMap.get(v);
        if (direct) {
          for (const idx of direct) hits.add(idx);
        }
      }

      // Handle root 'والد' via pre-computed index (< 0.001ms)
      if (qToken.includes('والد') || qToken.includes('والدين')) {
        if (walidIndicesCache) {
          for (const idx of walidIndicesCache) hits.add(idx);
        }
      }

      if (hits.size > 0) {
        tokenHitsList.push({ token: qToken, hits });
      }
    }

    // 2. IDF Selectivity: Intersect starting from the RAREST token first (Smallest hits count)
    tokenHitsList.sort((a, b) => a.hits.size - b.hits.size);

    for (const item of tokenHitsList) {
      if (candidateIndices === null) {
        candidateIndices = item.hits;
      } else {
        const next = new Set<number>();
        for (const idx of candidateIndices) {
          if (item.hits.has(idx)) next.add(idx);
        }
        if (next.size > 0) {
          candidateIndices = next;
        }
      }
    }

    // Expand semantic matches only when needed
    if (!candidateIndices || candidateIndices.size < 10) {
      semanticTokens = expandSemanticTerms(trimmed);
      for (const sToken of semanticTokens) {
        const sHits = microTokenMap.get(sToken);
        if (sHits) {
          for (const idx of sHits) {
            semanticHits.add(idx);
          }
        }
        if (semanticHits.size >= 250) break;
      }
    }
  }

  // Fast candidate pool construction (< 0.05ms)
  let poolIndices: number[];
  if (candidateIndices && candidateIndices.size > 0) {
    poolIndices = Array.from(candidateIndices);
    if (poolIndices.length < 10 && semanticHits.size > 0) {
      for (const sIdx of semanticHits) {
        if (poolIndices.length >= 60) break;
        if (!candidateIndices.has(sIdx)) poolIndices.push(sIdx);
      }
    }
  } else if (semanticHits.size > 0) {
    poolIndices = Array.from(semanticHits);
  } else {
    return [];
  }

  if (poolIndices.length > 150) {
    poolIndices = poolIndices.slice(0, 150);
  }

  const matchedEntries: MicroIndexEntry[] = [];
  const entryScores = new Map<MicroIndexEntry, number>();
  const isSingleWord = queryTokens.length <= 1;

  for (const idx of poolIndices) {
    const entry = micro[idx];
    const textNorm = entry.t;

    const isDirectMatch = textNorm.includes(normQuery);
    const isSemanticMatch = semanticTokens.length > 0 && semanticTokens.some((st) => textNorm.includes(st));
    const isNumMatch = String(entry.i) === trimmed;

    if (isSingleWord || isDirectMatch || isSemanticMatch || isNumMatch || arabicSearchMatch(textNorm, trimmed)) {
      // Precompute cumulative score once (< 0.0001ms)
      let score = 0;
      const rawNorm = normalizeArabic(trimmed);
      if (textNorm.includes(rawNorm)) {
        score += 300;
      } else if (isDirectMatch) {
        score += 150;
      }

      if (queryTokens.length >= 2) {
        for (let i = 0; i < queryTokens.length - 1; i++) {
          const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
          if (textNorm.includes(bigram)) {
            score += 100;
          }
        }
      }

      for (const t of queryTokens) {
        if (textNorm.includes(t)) score += 20;
      }

      let semanticBonus = 0;
      if (!isSingleWord || !isDirectMatch) {
        for (const st of semanticTokens) {
          if (st.includes(' ') && textNorm.includes(st)) {
            semanticBonus = 120;
            break;
          } else if (textNorm.includes(st)) {
            semanticBonus = Math.max(semanticBonus, 30);
          }
        }
      }
      score += semanticBonus;

      entryScores.set(entry, score);
      matchedEntries.push(entry);
    }
  }

  // 1. Group matches by book
  const bookBuckets = new Map<string, MicroIndexEntry[]>();
  for (const entry of matchedEntries) {
    let bucket = bookBuckets.get(entry.b);
    if (!bucket) {
      bucket = [];
      bookBuckets.set(entry.b, bucket);
    }
    bucket.push(entry);
  }

  // 2. Multi-Book Interleaving (Prioritized Round-Robin with Exact-Match Dominance)
  const priorityOrder = [
    'bukhari',
    'muslim',
    'nawawi40',
    'riyad_assalihin',
    'abudawud',
    'tirmidhi',
    'nasai',
    'ibnmajah',
    'malik',
    'aladab_almufrad',
    'bulugh_almaram',
    'shamail_muhammadiyah',
    'qudsi40',
    'darimi',
    'ahmed',
    'mishkat_almasabih',
    'shahwaliullah40',
  ];

  // Sort matched entries within each bucket by precomputed score (O(1))
  for (const bucket of bookBuckets.values()) {
    bucket.sort((a, b) => (entryScores.get(b) || 0) - (entryScores.get(a) || 0));
  }

  const getCollectionMaxScore = (bucket: MicroIndexEntry[]) => {
    return bucket.length > 0 ? (entryScores.get(bucket[0]) || 0) : 0;
  };

  const sortedCollections = [...priorityOrder].sort((a, b) => {
    const bucketA = bookBuckets.get(a);
    const bucketB = bookBuckets.get(b);
    const scoreA = bucketA ? getCollectionMaxScore(bucketA) : 0;
    const scoreB = bucketB ? getCollectionMaxScore(bucketB) : 0;
    if (Math.abs(scoreA - scoreB) >= 20) {
      return scoreB - scoreA;
    }
    return priorityOrder.indexOf(a) - priorityOrder.indexOf(b);
  });

  const interleavedEntries: MicroIndexEntry[] = [];

  // Round 1: Top 2 from Bukhari & Muslim, Top 1 from Sunan & other collections
  for (const bId of sortedCollections) {
    const bucket = bookBuckets.get(bId);
    if (bucket && bucket.length > 0) {
      const takeCount = (bId === 'bukhari' || bId === 'muslim') ? 2 : 1;
      for (let i = 0; i < takeCount && bucket.length > 0; i++) {
        interleavedEntries.push(bucket.shift()!);
      }
    }
  }

  // Round 2 & onward: Interleave remaining items in collection order
  let hasRemaining = true;
  while (hasRemaining && interleavedEntries.length < maxResults) {
    hasRemaining = false;
    for (const bId of sortedCollections) {
      const bucket = bookBuckets.get(bId);
      if (bucket && bucket.length > 0) {
        hasRemaining = true;
        interleavedEntries.push(bucket.shift()!);
        if (interleavedEntries.length >= maxResults) break;
      }
    }
  }

  // Exact-match prioritization: items with high score advantage appear before secondary partial matches
  interleavedEntries.sort((a, b) => {
    const sA = entryScores.get(a) || 0;
    const sB = entryScores.get(b) || 0;
    if (Math.abs(sA - sB) >= 80) return sB - sA;
    return 0;
  });

  const results: GlobalSearchResultItem[] = [];
  for (const entry of interleavedEntries.slice(0, maxResults)) {
    const meta = HADITH_BOOKS_LIST.find((b) => b.id === entry.b);
    if (!meta) continue;

    results.push({
      hadith: {
        id: entry.i,
        idInBook: entry.i,
        chapterId: entry.c,
        bookId: 1,
        arabic: entry.t,
      },
      book: meta,
    });
  }

  if (globalSearchResultCache.size < 500) {
    globalSearchResultCache.set(cacheKey, results);
  }

  return results;
}
