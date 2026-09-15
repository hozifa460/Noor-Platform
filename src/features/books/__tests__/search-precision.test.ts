import { describe, it, expect } from 'vitest';
import { searchBooksWithIntent } from '../infrastructure/intent-engine';
import type { MediaItem, SectionKind } from '@/lib/types';
import { normalizeArabic } from '@/lib/arabic/normalizer';

describe('Book Search Precision & Tiered Ranking Engine', () => {
  const sampleBooks: MediaItem[] = [
    {
      id: 'book-1',
      title: 'الفواكه العذاب في الرد على من لم يحكم السنة والكتاب',
      sheikhName: 'حمد بن ناصر آل معمر',
      category: 'aqeedah',
      islamicArt: 'aqeedah',
      shamelaCategoryId: 1,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'العقيدة', 'aqeedah'],
    },
    {
      id: 'book-2',
      title: 'رسالة في فرضية اتباع السنة والكلام على الأخبار',
      sheikhName: 'عبد الرحمن بن يحيى المعلمي',
      category: 'hadith',
      islamicArt: 'hadith',
      shamelaCategoryId: 6,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الحديث', 'hadith'],
    },
    {
      id: 'book-3',
      title: 'زوائد ابن الجوزي على مقاتل في الوجوه والنظائر',
      sheikhName: 'فهد بن إبراهيم الضالع',
      category: 'quran',
      islamicArt: 'quran',
      shamelaCategoryId: 4,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'علوم القرآن', 'quran'],
    },
    {
      id: 'book-4',
      title: 'نزهة الأعين النواظر في علم الوجوه والنظائر',
      sheikhName: 'ابن الجوزي',
      category: 'quran',
      islamicArt: 'quran',
      shamelaCategoryId: 4,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'علوم القرآن', 'quran'],
    },
    {
      id: 'book-5',
      title: 'مختصر خوقير في فقه الإمام أحمد',
      sheikhName: 'أبو بكر خوقير',
      category: 'fiqh',
      islamicArt: 'fiqh',
      shamelaCategoryId: 17,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الفقه الحنبلي', 'fiqh'],
    },
    {
      id: 'book-6',
      title: 'أصول السنة لأحمد بن حنبل',
      sheikhName: 'أحمد بن حنبل',
      category: 'aqeedah',
      islamicArt: 'aqeedah',
      shamelaCategoryId: 1,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'العقيدة', 'aqeedah'],
    },
    {
      id: 'book-7',
      title: 'صحيح البخاري - ط التأصيل',
      sheikhName: 'محمد بن إسماعيل البخاري',
      category: 'hadith',
      islamicArt: 'hadith',
      shamelaCategoryId: 6,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الحديث', 'hadith'],
    },
    {
      id: 'book-8',
      title: 'الأربعون النووية',
      sheikhName: 'النووي',
      category: 'hadith',
      islamicArt: 'hadith',
      shamelaCategoryId: 6,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الحديث', 'hadith'],
    },
    {
      id: 'book-9',
      title: 'المغني في فقه الشريعة',
      sheikhName: 'ابن قدامة',
      category: 'fiqh',
      islamicArt: 'fiqh',
      shamelaCategoryId: 17,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الفقه الحنبلي', 'fiqh'],
    },
    {
      id: 'book-10',
      title: 'مسند أبي يعلى - ت حسين أسد',
      sheikhName: 'أبو يعلى الموصلي',
      category: 'hadith',
      islamicArt: 'hadith',
      shamelaCategoryId: 6,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الحديث', 'hadith'],
    },
    {
      id: 'book-11',
      title: 'مفردات ألفاظ القرآن للراغب الأصفهاني',
      sheikhName: 'الراغب الأصفهاني',
      category: 'quran',
      islamicArt: 'quran',
      shamelaCategoryId: 4,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'علوم القرآن', 'quran'],
    },
    {
      id: 'book-12',
      title: 'مردود على الفلاسفة والدهريين',
      sheikhName: 'أبو العباس القرافي',
      category: 'aqeedah',
      islamicArt: 'aqeedah',
      shamelaCategoryId: 1,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'العقيدة', 'aqeedah'],
    },
    {
      id: 'book-13',
      title: 'رد المحتار على الدر المختار - حاشية ابن عابدين',
      sheikhName: 'ابن عابدين الحنفي',
      category: 'fiqh',
      islamicArt: 'fiqh',
      shamelaCategoryId: 15,
      section: 'books' as SectionKind,
      tags: ['شاملة', 'الفقه الحنفي', 'fiqh'],
    },
  ].map((b) => {
    const normTitle = normalizeArabic(b.title);
    const normAuthor = normalizeArabic(b.sheikhName);
    return {
      ...b,
      _normTitle: normTitle,
      _normAuthor: normAuthor,
    } as MediaItem;
  });

  it('Tier 1: Exact full title query dominates and outranks author intent', () => {
    // A query for "زوائد ابن الجوزي على مقاتل في الوجوه والنظائر"
    // even though it mentions "ابن الجوزي", the actual book must be Rank 1
    const res1 = searchBooksWithIntent(sampleBooks, 'زوائد ابن الجوزي على مقاتل في الوجوه والنظائر');
    expect(res1.length).toBeGreaterThan(0);
    expect(res1[0].book.id).toBe('book-3');
    expect(res1[0].score).toBeGreaterThanOrEqual(10000);
    expect(res1[0].matchReason).toContain('تطابق تام');

    // "مختصر خوقير في فقه الإمام أحمد" must rank above Ahmad ibn Hanbal's own books
    const res2 = searchBooksWithIntent(sampleBooks, 'مختصر خوقير في فقه الإمام أحمد');
    expect(res2.length).toBeGreaterThan(0);
    expect(res2[0].book.id).toBe('book-5');
    expect(res2[0].score).toBeGreaterThanOrEqual(10000);
  });

  it('Tier 2 & 3: Combination and Prefix matching rank accurately', () => {
    // Prefix match
    const resPrefix = searchBooksWithIntent(sampleBooks, 'صحيح البخاري');
    expect(resPrefix.length).toBeGreaterThan(0);
    expect(resPrefix[0].book.id).toBe('book-7');
    expect(resPrefix[0].score).toBeGreaterThanOrEqual(5000);

    // Combination match: Title + Author
    const resCombo = searchBooksWithIntent(sampleBooks, 'المغني ابن قدامة');
    expect(resCombo.length).toBeGreaterThan(0);
    expect(resCombo[0].book.id).toBe('book-9');
  });

  it('Discipline Booster Safeguard: Disciplines never leak irrelevant books as standalone qualifiers', () => {
    // Non-existent queries containing discipline words
    const resNonsenseFiqh = searchBooksWithIntent(sampleBooks, 'فقه البطيخ المعاصر');
    expect(resNonsenseFiqh.length).toBe(0);

    const resNonsenseTafsir = searchBooksWithIntent(sampleBooks, 'تفسير مجرة أندروميدا');
    expect(resNonsenseTafsir.length).toBe(0);

    const resNonsenseAqeedah = searchBooksWithIntent(sampleBooks, 'عقيدة الذكاء الاصطناعي');
    expect(resNonsenseAqeedah.length).toBe(0);
  });

  it('Word Boundary Enforcement: "رد" matches distinct words but never penetrates "مفردات" or "مردود"', () => {
    const resRadd = searchBooksWithIntent(sampleBooks, 'رد');
    expect(resRadd.length).toBeGreaterThan(0);

    // Should match book-13 ("رد المحتار") and book-1 ("الرد على من لم يحكم")
    const matchedIds = resRadd.map((r) => r.book.id);
    expect(matchedIds).toContain('book-13');
    expect(matchedIds).toContain('book-1');

    // Must NOT match book-11 ("مفردات ألفاظ القرآن") or book-12 ("مردود على الفلاسفة")
    expect(matchedIds).not.toContain('book-11');
    expect(matchedIds).not.toContain('book-12');
  });

  it('Madhhab Intent Behavior: Preserves "فقه الحنابلة" while strictly rejecting "فقه الحنابلة البطيخ المعاصر"', () => {
    // Valid pure madhhab query
    const resHanbaliValid = searchBooksWithIntent(sampleBooks, 'فقه الحنابلة');
    expect(resHanbaliValid.length).toBeGreaterThan(0);
    const hanbaliIds = resHanbaliValid.map((r) => r.book.id);
    expect(hanbaliIds).toContain('book-5'); // مختصر خوقير (الفقه الحنبلي)
    expect(hanbaliIds).toContain('book-9'); // المغني (الفقه الحنبلي)

    // Compound query with extra unmatched/nonsense words
    const resHanbaliNonsense = searchBooksWithIntent(sampleBooks, 'فقه الحنابلة البطيخ المعاصر');
    expect(resHanbaliNonsense).toHaveLength(0);
  });

  it('Stopwords Isolation: Single connector prepositions return empty results', () => {
    expect(searchBooksWithIntent(sampleBooks, 'في')).toEqual([]);
    expect(searchBooksWithIntent(sampleBooks, 'من')).toEqual([]);
    expect(searchBooksWithIntent(sampleBooks, 'على')).toEqual([]);
    expect(searchBooksWithIntent(sampleBooks, 'عن')).toEqual([]);
    expect(searchBooksWithIntent(sampleBooks, ' ')).toHaveLength(sampleBooks.length);
  });

  it('Author Preservation: Patronymics and kunyas ("بن", "أبي", "ابن") are intact and functional', () => {
    // Searching for Ahmad ibn Hanbal
    const resAhmad = searchBooksWithIntent(sampleBooks, 'أحمد بن حنبل');
    expect(resAhmad.length).toBeGreaterThan(0);
    expect(resAhmad[0].book.id).toBe('book-6');

    // Searching for Abu Ya'la
    const resAbuYaala = searchBooksWithIntent(sampleBooks, 'أبي يعلى');
    expect(resAbuYaala.length).toBeGreaterThan(0);
    expect(resAbuYaala[0].book.id).toBe('book-10');

    // Searching with variant spelling "ابى يعلى"
    const resAbuYaalaVariant = searchBooksWithIntent(sampleBooks, 'ابى يعلى');
    expect(resAbuYaalaVariant.length).toBeGreaterThan(0);
    expect(resAbuYaalaVariant[0].book.id).toBe('book-10');
  });

  it('Hamza and Tashkeel normalization performs identically', () => {
    // Fully vocalized Tashkeel
    const resTashkeel = searchBooksWithIntent(sampleBooks, 'صَحِيحُ البُخَارِيِّ');
    expect(resTashkeel[0].book.id).toBe('book-7');

    // Hamza dropped vs Hamza present
    const resWithoutHamza = searchBooksWithIntent(sampleBooks, 'الاربعون النووية');
    const resWithHamza = searchBooksWithIntent(sampleBooks, 'الأربعون النووية');
    expect(resWithoutHamza[0].book.id).toBe('book-8');
    expect(resWithHamza[0].book.id).toBe('book-8');
    expect(resWithoutHamza[0].score).toBe(resWithHamza[0].score);
  });

  it('Latency SLA: Search executes well within interactive threshold (< 10ms)', () => {
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      searchBooksWithIntent(sampleBooks, 'صحيح البخاري');
    }
    const elapsed = performance.now() - t0;
    const avg = elapsed / 50;
    expect(avg).toBeLessThan(10.0);
  });
});
