'use client';

import { normalizeArabic } from '@/lib/arabic-normalizer';
import { scoreArabicSearch, extractConceptGroups } from '@/lib/arabic-search-engine';
import { FATWA_CATEGORIES, type FatwaIndexItem } from '@/lib/fatwa-index';
import { scholarFilterQuery } from '@/lib/scholar-filter';
import { dataUrl, shardUrl } from '@/lib/data-base';
import { BUILTIN_SEED_FATWAS } from '@/lib/seed-fatwas';

interface CompactMicroItem {
  id: string;
  t: string;
  s: string;
  c: string;
  ans?: string;
  src?: string;
  audio?: string;
}

class MicroShardEngine {
  private routerTable: Record<string, string> | null = null;
  private routerPromise: Promise<void> | null = null;
  private shardCache = new Map<string, CompactMicroItem[]>();
  private showcaseItems: FatwaIndexItem[] = BUILTIN_SEED_FATWAS;

  private async loadRouter(): Promise<void> {
    if (this.routerTable) return;
    if (this.routerPromise) return this.routerPromise;

    this.routerPromise = (async () => {
      try {
        if (typeof window === 'undefined') {
          const fs = await import('fs');
          const path = await import('path');
          const localPath = path.join(process.cwd(), 'public', 'data', 'micro_shards', 'prefix_router.json');
          if (fs.existsSync(localPath)) {
            this.routerTable = JSON.parse(fs.readFileSync(localPath, 'utf8'));
            return;
          }
        }
        const res = await fetch(dataUrl('data/micro_shards/prefix_router.json'));
        if (res.ok) {
          this.routerTable = await res.json();
        }
      } catch {
        /* fallback to builtin */
      }
    })();

    return this.routerPromise;
  }

  public async getShowcase(): Promise<FatwaIndexItem[]> {
    if (this.showcaseItems.length > 0) {
      return this.showcaseItems;
    }

    try {
      const res = await fetch(dataUrl('data/micro_shards/showcase.json'));
      if (res.ok) {
        const data = (await res.json()) as CompactMicroItem[];
        this.showcaseItems = data.map((d) => compactToFull(d));
        return this.showcaseItems;
      }
    } catch {
      /* fallback to builtin */
    }

    return BUILTIN_SEED_FATWAS;
  }

  private async fetchShard(hash: string): Promise<CompactMicroItem[]> {
    if (this.shardCache.has(hash)) {
      return this.shardCache.get(hash)!;
    }

    try {
      const res = await fetch(shardUrl('micro_shards', hash));
      if (res.ok) {
        const items = (await res.json()) as CompactMicroItem[];
        this.shardCache.set(hash, items);
        return items;
      }
    } catch {
      /* ignore */
    }

    return [];
  }

  public async search(
    query: string,
    category = 'all',
    scholar = 'all',
    limit = 60
  ): Promise<FatwaIndexItem[]> {
    const q = query.trim();
    if (!q) {
      return this.getShowcase();
    }

    await this.loadRouter();
    
    const concepts = extractConceptGroups(q);
    const hashesToFetch = new Set<string>();

    if (this.routerTable) {
      for (const concept of concepts) {
        for (const variant of concept.allVariants) {
          const norm = normalizeArabic(variant).replace(/^ال/, '');
          const pfx = norm.slice(0, 2);
          if (pfx.length >= 2 && this.routerTable[pfx]) {
            hashesToFetch.add(this.routerTable[pfx]);
          }
        }
      }
    }

    // Parallel fetch of micro-shards
    const fetchedShards = await Promise.all(
      Array.from(hashesToFetch).map((hash) => this.fetchShard(hash))
    );

    // Merge and deduplicate candidates
    const candidateMap = new Map<string, CompactMicroItem>();
    for (const shard of fetchedShards) {
      for (const item of shard) {
        if (!candidateMap.has(item.id)) {
          candidateMap.set(item.id, item);
        }
      }
    }

    // If no candidates from remote shards, include seed items
    if (candidateMap.size === 0) {
      for (const seed of BUILTIN_SEED_FATWAS) {
        candidateMap.set(seed.id, {
          id: seed.id,
          t: seed.title,
          s: seed.scholar,
          c: seed.category || 'all',
          ans: seed.answer,
        });
      }
    }

    const candidates = Array.from(candidateMap.values());
    const results: { item: FatwaIndexItem; score: number }[] = [];

    // '' when no scholar is selected — never filter by a pseudo display name.
    const normScholar = scholarFilterQuery(scholar);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];

      // Category filter
      if (category !== 'all' && c.c !== category) {
        continue;
      }

      // Scholar filter
      if (normScholar && !normalizeArabic(c.s).includes(normScholar)) {
        continue;
      }

      const score = scoreArabicSearch(
        q,
        normalizeArabic(c.t),
        normalizeArabic(c.ans || c.t),
        normalizeArabic(c.s),
        ''
      );

      if (score > 0) {
        results.push({ item: compactToFull(c), score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => r.item);
  }
}

function compactToFull(c: CompactMicroItem): FatwaIndexItem {
  const catObj = FATWA_CATEGORIES.find((cat) => cat.id === c.c);
  const catName = catObj ? catObj.name : 'الفقه الإسلامي';
  const previewText = c.ans || `مسألة فقهية معتمدة في ${catName} برواية وبيان ${c.s || 'كبار أئمة وعلماء الإسلام'}.`;

  return {
    id: c.id,
    title: c.t,
    question: previewText,
    scholar: c.s || 'عالم ومفتي',
    category: c.c || 'contemporary',
    hasAnswer: Boolean(c.ans && c.ans.length > 5),
    answer: c.ans,
    sourceFile: c.src,
    audioUrl: c.audio,
  };
}

export const microShardEngine = new MicroShardEngine();
