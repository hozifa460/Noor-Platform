'use client';

import { normalizeArabic, scoreArabicSearch } from '@/lib/arabic';
import { SCHOLARS_LIST, type FatwaIndexItem } from '../domain';

interface InternalIndexedFatwa {
  item: FatwaIndexItem;
  normText: string;
  normTitle: string;
  normQuestion: string;
  normScholar: string;
  normTags: string;
  normCategory: string;
}

export { FATWA_CATEGORIES, SCHOLARS_LIST } from '../domain';

/**
 * Lightweight in-memory index manager without automatic massive JSON fetching.
 */
export class FatwaIndexManager {
  private rawItems: FatwaIndexItem[] = [];
  private internalIndex: InternalIndexedFatwa[] = [];
  private answerCache = new Map<string, string>();

  public get rawList(): FatwaIndexItem[] {
    return this.rawItems;
  }

  public mergeItems(newItems: FatwaIndexItem[]) {
    const existingIds = new Set(this.rawItems.map((i) => i.id));
    const toAdd: FatwaIndexItem[] = [];

    for (const it of newItems) {
      if (!existingIds.has(it.id)) {
        existingIds.add(it.id);
        toAdd.push(it);
      }
    }

    if (toAdd.length === 0) return;

    for (let i = 0; i < toAdd.length; i++) {
      this.rawItems.push(toAdd[i]);
    }
    for (let i = 0; i < toAdd.length; i++) {
      const item = toAdd[i];
      const text = `${item.title} ${item.question} ${item.scholar} ${(item.tags || []).join(' ')}`;
      this.internalIndex.push({
        item,
        normText: normalizeArabic(text),
        normTitle: normalizeArabic(item.title),
        normQuestion: normalizeArabic(item.question),
        normScholar: normalizeArabic(item.scholar),
        normTags: normalizeArabic((item.tags || []).join(' ')),
        normCategory: normalizeArabic(item.category || ''),
      });
    }
  }

  public searchIndex(
    query: string,
    category = 'all',
    scholar = 'all',
    limit = 60
  ): FatwaIndexItem[] {
    if (!query || !query.trim()) {
      let res = this.rawItems;
      if (category !== 'all') {
        res = res.filter((i) => i.category === category);
      }
      if (scholar !== 'all') {
        const schInfo = SCHOLARS_LIST.find((s) => s.id === scholar);
        const schQuery = schInfo?.query || scholar;
        const normSch = normalizeArabic(schQuery);
        res = res.filter((i) => i.scholar && normalizeArabic(i.scholar).includes(normSch));
      }
      return res.slice(0, limit);
    }

    const normQuery = normalizeArabic(query.trim());
    const scored: { item: FatwaIndexItem; score: number }[] = [];

    for (let i = 0; i < this.internalIndex.length; i++) {
      const entry = this.internalIndex[i];

      // Category filter (ids are stored as-is on items)
      if (category !== 'all' && entry.item.category !== category) continue;

      // Scholar filter
      if (scholar !== 'all') {
        const schInfo = SCHOLARS_LIST.find((s) => s.id === scholar);
        const schQuery = schInfo?.query || scholar;
        const normSch = normalizeArabic(schQuery);
        if (!entry.normScholar.includes(normSch)) continue;
      }

      const score = scoreArabicSearch(
        normQuery,
        entry.normTitle,
        entry.normQuestion,
        entry.normScholar,
        entry.normTags
      );
      if (score > 0) {
        scored.push({ item: entry.item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.item);
  }

  public async getAnswer(item: FatwaIndexItem): Promise<string> {
    if (item.answer) return item.answer;
    if (this.answerCache.has(item.id)) {
      return this.answerCache.get(item.id)!;
    }
    return 'لم يتوفر نص الإجابة.';
  }
}

export const fatwaIndexManager = new FatwaIndexManager();
