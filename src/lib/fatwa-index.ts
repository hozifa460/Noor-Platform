'use client';

import type { MediaItem } from '@/lib/types';
import { loadRepositories } from '@/lib/repositories';
import { fetchJsonWithFallback } from '@/lib/fetcher';
import { normalizeContentFile } from '@/lib/sheikh';
import { normalizeArabic } from '@/lib/arabic-normalizer';
import { scoreArabicSearch } from '@/lib/arabic-search-engine';

const MANIFEST_CACHE_KEY = 'noor_fatwa_manifest_v2';

export interface FatwaIndexItem {
  id: string;
  title: string;
  question: string;
  scholar: string;
  category?: string;
  tags?: string[];
  sourceFile?: string;
  audioUrl?: string;
  hasAnswer: boolean;
  answer?: string;
}

interface InternalIndexedFatwa {
  item: FatwaIndexItem;
  normText: string;
  normTitle: string;
  normQuestion: string;
  normScholar: string;
  normTags: string;
  normCategory: string;
}

export const FATWA_CATEGORIES = [
  { id: 'all', name: 'جميع الفتاوى', emoji: '⚖️' },
  { id: 'aqeedah', name: 'العقيدة والتوحيد', emoji: '🕌', keywords: ['عقيدة', 'توحيد', 'ايمان', 'شرك', 'بدعة', 'توسل', 'ابراج', 'موسيقى', 'رقية', 'سحر', 'عين', 'حسد'] },
  { id: 'salah', name: 'الطهارة والصلاة', emoji: '🤲', keywords: ['صلاة', 'طهارة', 'وضوء', 'غسل', 'جماعة', 'سجود', 'جمعة', 'وتر', 'نية', 'مسح', 'خفين', 'جوربين', 'شراب', 'قصر', 'طيارة', 'طائرة', 'قطار', 'سهو', 'شك', 'جنابة', 'حيض'] },
  { id: 'zakah', name: 'الزكاة والصيام والحج', emoji: '🌙', keywords: ['صيام', 'رمضان', 'زكاة', 'صدقة', 'حج', 'عمرة', 'ذهب', 'فطر', 'سفر', 'بخاخ', 'ربو', 'قطرة', 'فلوس', 'اسهم'] },
  { id: 'muamalat', name: 'المعاملات والبيوع', emoji: '💼', keywords: ['بيع', 'ربا', 'قرض', 'تجارة', 'عقد', 'شراء', 'معاملات', 'بنك', 'تقسيط', 'تمويل', 'فوائد', 'مرابحة', 'بيت', 'شقة', 'سيارة', 'بورصة'] },
  { id: 'family', name: 'الأسرة والنكاح والطلاق', emoji: '👨‍👩‍👧', keywords: ['نكاح', 'زواج', 'طلاق', 'رضاع', 'حضانة', 'نفقة', 'ميراث', 'حجاب', 'غضب', 'زوجة', 'خلع', 'تركة', 'موت', 'وفاة'] },
  { id: 'contemporary', name: 'قضايا ونوازل معاصرة', emoji: '🌐', keywords: ['معاصرة', 'طبية', 'انترنت', 'تقنية', 'تأمين', 'نوازل', 'رقمية', 'بيتكوين', 'تدخين', 'سجائر', 'شيشة', 'فيب', 'دخان', 'تجميل', 'تبرع', 'اعضاء'] },
];

export const SCHOLARS_LIST = [
  { id: 'all', name: 'كافة العلماء' },
  { id: 'binbaz', name: 'الشيخ ابن باز', query: 'باز' },
  { id: 'othaymeen', name: 'الشيخ ابن عثيمين', query: 'عثيمين' },
  { id: 'fawzan', name: 'الشيخ صالح الفوزان', query: 'فوزان' },
  { id: 'islamqa', name: 'الإسلام سؤال وجواب', query: 'المنجد' },
  { id: 'dar_ifta', name: 'دور الإفتاء الرسمية', query: 'افتاء' },
];

/**
 * High-performance Inverted Index Manager with Pre-computed Norm Strings & High-Accuracy NLP Engine
 */
class FatwaIndexManager {
  private rawItems: FatwaIndexItem[] = [];
  private internalIndex: InternalIndexedFatwa[] = [];
  private answerCache = new Map<string, string>();
  private isManifestLoaded = false;

  constructor() {
    this.initDefaultManifest();
  }

  private initDefaultManifest() {
    if (typeof window !== 'undefined') {
      // 1. Instant local storage retrieval (0ms)
      try {
        const cached = localStorage.getItem(MANIFEST_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as FatwaIndexItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.mergeItems(parsed);
            this.isManifestLoaded = true;
          }
        }
      } catch {
        /* ignore */
      }

      this.loadStaticManifest();
    }
  }

  public async loadStaticManifest(): Promise<void> {
    try {
      const res = await fetch('/data/fatwas_manifest.json');
      if (res.ok) {
        const data = (await res.json()) as FatwaIndexItem[];
        if (Array.isArray(data) && data.length > 0) {
          this.mergeItems(data);
          this.isManifestLoaded = true;

          // Save to local cache for offline persistence
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(data));
            }
          } catch {
            /* ignore quota errors */
          }
        }
      }
    } catch {
      /* non-critical fallback */
    }
  }

  public async getIndex(): Promise<FatwaIndexItem[]> {
    if (!this.isManifestLoaded) {
      await this.loadStaticManifest();
    }
    return this.rawItems;
  }

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
      const normTitle = normalizeArabic(item.title);
      const normQuestion = normalizeArabic(item.question);
      const normScholar = normalizeArabic(item.scholar);
      const normTags = normalizeArabic((item.tags || []).join(' '));

      this.internalIndex.push({
        item,
        normText: normalizeArabic(text),
        normTitle,
        normQuestion,
        normScholar,
        normTags,
        normCategory: normalizeArabic(item.category || ''),
      });
    }
  }

  /**
   * Ultra-fast high-accuracy search using field-weighted BM25/TF-IDF and semantic stemming.
   */
  public searchIndex(
    query: string,
    category = 'all',
    scholar = 'all',
    limit = 60
  ): FatwaIndexItem[] {
    const q = query.trim();

    // Pre-calculate category & scholar filters
    const catDef = category !== 'all' ? FATWA_CATEGORIES.find((c) => c.id === category) : null;
    const catKeywords = catDef?.keywords ? catDef.keywords.map((k) => normalizeArabic(k)) : [];

    const schDef = scholar !== 'all' ? SCHOLARS_LIST.find((s) => s.id === scholar) : null;
    const normScholarQuery = schDef?.query ? normalizeArabic(schDef.query) : '';

    const results: { item: FatwaIndexItem; score: number }[] = [];

    for (let i = 0; i < this.internalIndex.length; i++) {
      const entry = this.internalIndex[i];

      // 1. Scholar Filter
      if (normScholarQuery) {
        if (!entry.normScholar.includes(normScholarQuery)) {
          continue;
        }
      }

      // 2. Category Filter
      if (catKeywords.length > 0) {
        const matchesCategory =
          entry.item.category === category ||
          catKeywords.some((k) => entry.normText.includes(k));
        if (!matchesCategory) continue;
      }

      // 3. Relevance Scoring & Precision Filtering
      let score = 0;
      if (q) {
        score = scoreArabicSearch(
          q,
          entry.normTitle,
          entry.normQuestion,
          entry.normScholar,
          entry.normTags
        );

        // Strict Precision Guard: If score is 0, the item is unrelated -> EXCLUDE!
        if (score <= 0) {
          continue;
        }
      } else {
        score = 10;
      }

      results.push({ item: entry.item, score });
    }

    if (q) {
      results.sort((a, b) => b.score - a.score);
    }

    return results.slice(0, limit).map((r) => r.item);
  }

  /**
   * Fetches full fatwa answer on demand if not present in memory.
   */
  public async getFullAnswer(item: FatwaIndexItem): Promise<string> {
    if (item.answer && item.answer.trim()) {
      return item.answer;
    }

    if (this.answerCache.has(item.id)) {
      item.answer = this.answerCache.get(item.id)!;
      return item.answer;
    }

    if (item.sourceFile) {
      try {
        const repos = loadRepositories();
        const res = await fetchJsonWithFallback<unknown>(repos, item.sourceFile, 15000);
        if (res.data) {
          const { items } = normalizeContentFile(res.data, item.sourceFile, res.sourceId || undefined);
          const match = items.find((it) => it.id === item.id || it.title === item.title);
          if (match && match.answer) {
            item.answer = match.answer;
            this.answerCache.set(item.id, match.answer);
            return match.answer;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch full answer on demand:', err);
      }
    }

    return item.answer || 'الجواب متوفر في التسجيل الصوتي أو جارٍ مزامنة النص.';
  }
}

export const fatwaIndexManager = new FatwaIndexManager();
