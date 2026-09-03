import { normalizeArabic } from '../arabic/normalizer';
import { getCachedHadithBook, setCachedHadithBook } from './storage';
import { BUILTIN_SEED_SHARH } from './seed-sharh';
import { HADITH_BASE, hadithSharhUrl } from '../shared/data-base';
import type { HadeethEncSharhItem } from './types';
import { extractCleanMatn, COMMON_STOP_WORDS } from './matn';

let sharhCache: HadeethEncSharhItem[] | null = null;
let sharhInvertedIndex: Map<string, HadeethEncSharhItem[]> | null = null;

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset';

/**
 * Builds an inverted hash index for HadeethEnc sharh items for instant O(1) matching
 */
export function buildSharhInvertedIndex(list: HadeethEncSharhItem[]): void {
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

  // 3. PRIMARY: chunked sharh on noor-platform-hadith (smaller, dedicated)
  if (HADITH_BASE) {
    try {
      const res = await fetch(hadithSharhUrl());
      if (res.ok) {
        sharhCache = (await res.json()) as HadeethEncSharhItem[];
        setCachedHadithBook('hadeethenc_sharh.json', sharhCache).catch(() => {});
        buildSharhInvertedIndex(sharhCache);
        return sharhCache;
      }
    } catch (err) {
      console.warn('[hadith] sharh fetch from noor-platform-hadith failed:', err);
    }
  }

  // 4. Legacy: full-size sharh from the public mirror repo
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

  // 5. Final fallback: sharh on the legacy quran_and_sunnah repo
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

  // 6. Ultimate fallback to built-in verified seeds
  sharhCache = BUILTIN_SEED_SHARH;
  buildSharhInvertedIndex(sharhCache);
  return sharhCache;
}

/**
 * Fast and accurate matching of Hadith explanation by isolating pure Matn and text similarity
 */
export async function findHadithSharh(hadithText: string): Promise<HadeethEncSharhItem | null> {
  const allSharh = await loadHadeethEncSharh();
  if (!allSharh || allSharh.length === 0) return null;

  // 1. Isolate the pure Matn: strip the isnad completely!
  const cleanMatn = extractCleanMatn(hadithText);
  const targetText = cleanMatn && cleanMatn.length >= 8 ? cleanMatn : hadithText;
  const normalizedMatn = normalizeArabic(targetText);
  if (!normalizedMatn || normalizedMatn.length < 8) return null;

  // 2. Extract meaningful tokens from the Matn ONLY (excluding common stop words)
  const tokens = normalizedMatn
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));
  if (tokens.length === 0) return null;

  // 3. Candidate retrieval using inverted index on matn tokens
  const candidateSet = new Set<HadeethEncSharhItem>();
  if (sharhInvertedIndex) {
    for (const t of tokens.slice(0, 10)) {
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
    const normHadeeth = normalizeArabic(item.hadeeth || '');
    const normTitle = normalizeArabic(item.title || '');
    const combined = normHadeeth + ' ' + normTitle;

    // Direct exact containment check
    if (combined.includes(normalizedMatn) || (normalizedMatn.length > 25 && normHadeeth.includes(normalizedMatn.slice(0, 35)))) {
      return item; // 100% Exact match!
    }

    let matchedCount = 0;
    for (const token of tokens) {
      if (combined.includes(token)) {
        matchedCount++;
      }
    }

    const forwardScore = matchedCount / tokens.length;

    // Check backward score (how much of HadeethEnc's core text is in the matn)
    const hTokens = normHadeeth
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w))
      .slice(0, 10);

    let backwardScore = 0;
    if (hTokens.length > 0) {
      const hMatched = hTokens.filter((tok) => normalizedMatn.includes(tok)).length;
      backwardScore = hMatched / hTokens.length;
    }

    // Combined harmonic score
    const finalScore = forwardScore * 0.6 + backwardScore * 0.4;

    // STRICT THRESHOLD: Must match at least 55% of keywords OR match at least 3 distinct core matn tokens!
    if ((finalScore >= 0.55 || matchedCount >= 3) && matchedCount >= 2 && finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = item;
      if (finalScore >= 0.85) break; // High confidence match
    }
  }

  return bestMatch;
}

export function getSharhByHadithId(sharhList: HadeethEncSharhItem[], id: string): HadeethEncSharhItem | null {
  return sharhList.find((s) => s.id === id) || null;
}
