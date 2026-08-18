'use client';

import { normalizeArabic } from '@/lib/arabic-normalizer';
import { scoreArabicSearch } from '@/lib/arabic-search-engine';

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
  { id: 'all', name: 'كافة العلماء', query: '' },
  { id: 'binbaz', name: 'الشيخ ابن باز', query: 'باز' },
  { id: 'othaymeen', name: 'الشيخ ابن عثيمين', query: 'عثيمين' },
  { id: 'fawzan', name: 'الشيخ صالح الفوزان', query: 'فوزان' },
  { id: 'islamqa', name: 'الإسلام سؤال وجواب', query: 'المنجد' },
  { id: 'dar_ifta', name: 'دور الإفتاء الرسمية', query: 'افتاء' },
];

/**
 * Lightweight in-memory index manager without automatic massive JSON fetching.
 */
class FatwaIndexManager {
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
        const catInfo = FATWA_CATEGORIES.find((c) => c.id === category);
        const catName = catInfo?.name || category;
        const normCat = normalizeArabic(catName);
        res = res.filter((i) => i.category && normalizeArabic(i.category).includes(normCat));
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

      // Category filter
      if (category !== 'all') {
        const catInfo = FATWA_CATEGORIES.find((c) => c.id === category);
        const catName = catInfo?.name || category;
        const normCat = normalizeArabic(catName);
        if (!entry.normCategory.includes(normCat)) continue;
      }

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
