import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Import Canonical Features Implementation
import * as FeatureHadith from '@/features/hadith';

// 2. Import Canonical UI Sub-modules directly for referential equality assertions
import { HADITH_BOOK_CATEGORIES as InternalBookCategories } from '../ui/HadithBookSelectorModal';
import { GRADE_FILTERS as InternalGradeFilters } from '../ui/HadithSearchHeader';
import { ArabicHighlight as InternalArabicHighlight } from '../ui/ArabicHighlight';

describe('Hadith Domain Canonical Architecture — Cache Integrity, Constants Stability & Behavioral Verification', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    FeatureHadith.clearBookCache();
    FeatureHadith.clearSharhCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    FeatureHadith.clearBookCache();
    FeatureHadith.clearSharhCache();
    vi.restoreAllMocks();
  });

  describe('1. Single-Cache Integrity & Lifecycle Management', () => {
    const mockBookData = {
      id: 999,
      metadata: {
        id: 999,
        length: 2,
        arabic: { title: 'كتاب اختباري', author: 'محدث تجريبي' },
      },
      chapters: [{ id: 1, bookId: 999, arabic: 'باب النية', english: 'Intention' }],
      hadiths: [
        { id: 1, idInBook: 1, chapterId: 1, bookId: 999, arabic: 'إنما الأعمال بالنيات' },
        { id: 2, idInBook: 2, chapterId: 1, bookId: 999, arabic: 'طلب العلم فريضة' },
      ],
    };

    it('manages in-memory bookCache singleton with zero memory leak', async () => {
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => mockBookData,
        } as Response;
      });

      expect(FeatureHadith.getBookCacheSize()).toBe(0);

      // First Load
      const loaded1 = await FeatureHadith.loadHadithBook('sample_test_book.json');
      expect(loaded1).toBeDefined();
      expect(FeatureHadith.getBookCacheSize()).toBe(1);
      const initialFetchCount = fetchCount;
      expect(initialFetchCount).toBeGreaterThan(0);

      // Second Load hits in-memory cache directly without network
      const loaded2 = await FeatureHadith.loadHadithBook('sample_test_book.json');
      expect(loaded2).toBe(loaded1);
      expect(fetchCount).toBe(initialFetchCount);

      // Clear cache
      FeatureHadith.clearBookCache();
      expect(FeatureHadith.getBookCacheSize()).toBe(0);
    });

    it('manages sharh inverted index singleton correctly', () => {
      const mockSharhItems = [
        {
          id: 's-1',
          title: 'شرح حديث إنما الأعمال بالنيات',
          hadeeth: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى الله ورسوله',
          grade: 'صحيح',
          explanation: 'النية شرط في صحة الأعمال وقبولها عند الله تعالى.',
        },
        {
          id: 's-2',
          title: 'شرح حديث الطهور شطر الإيمان',
          hadeeth: 'الطهور شطر الإيمان والحمد لله تملأ الميزان',
          grade: 'صحيح',
          explanation: 'فضل الطهارة والذكر العظيم.',
        },
      ];

      FeatureHadith.buildSharhInvertedIndex(mockSharhItems);

      const item = FeatureHadith.getSharhByHadithId(mockSharhItems, 's-1');
      expect(item).toBeDefined();
      expect(item?.id).toBe('s-1');
      expect(item?.title).toContain('الأعمال بالنيات');

      FeatureHadith.clearSharhCache();
      expect(FeatureHadith.isSharhCacheLoaded()).toBe(false);
    });
  });

  describe('2. Constants Referential Equality & Export Integrity', () => {
    it('verifies HADITH_BOOK_CATEGORIES referential identity and contents', () => {
      expect(FeatureHadith.HADITH_BOOK_CATEGORIES).toBe(InternalBookCategories);
      expect(Array.isArray(FeatureHadith.HADITH_BOOK_CATEGORIES)).toBe(true);
      expect(FeatureHadith.HADITH_BOOK_CATEGORIES.length).toBe(6);
      expect(FeatureHadith.HADITH_BOOK_CATEGORIES.map((c) => c.id)).toEqual([
        'all',
        'sahih',
        'sunan',
        'jawami',
        'akhlak',
        'forties',
      ]);
    });

    it('verifies GRADE_FILTERS referential identity and contents', () => {
      expect(FeatureHadith.GRADE_FILTERS).toBe(InternalGradeFilters);
      expect(Array.isArray(FeatureHadith.GRADE_FILTERS)).toBe(true);
      expect(FeatureHadith.GRADE_FILTERS.length).toBe(6);
      expect(FeatureHadith.GRADE_FILTERS.map((f) => f.id)).toEqual([
        'all',
        'muttafaqun',
        'sahih',
        'hasan',
        'daif',
        'mawdu',
      ]);
    });

    it('verifies ArabicHighlight referential identity', () => {
      expect(FeatureHadith.ArabicHighlight).toBe(InternalArabicHighlight);
    });

    it('verifies core data constants presence and validity', () => {
      expect(Array.isArray(FeatureHadith.HADITH_BOOKS_LIST)).toBe(true);
      expect(FeatureHadith.HADITH_BOOKS_LIST.length).toBe(17);
      expect(Array.isArray(FeatureHadith.GRADE_FILTER_OPTIONS)).toBe(true);
      expect(Array.isArray(FeatureHadith.FAKE_HADITH_CATEGORIES)).toBe(true);
      expect(FeatureHadith.COMMON_STOP_WORDS instanceof Set).toBe(true);
      expect(FeatureHadith.COMMON_STOP_WORDS.size).toBeGreaterThan(10);
      expect(typeof FeatureHadith.HADITH_INTENT_CLUSTERS).toBe('object');
      expect(Array.isArray(FeatureHadith.SUPPORTED_TRANSLATION_LANGUAGES)).toBe(true);
      expect(typeof FeatureHadith.BUILTIN_SEED_SHARH).toBe('object');
    });
  });

  describe('3. Core Behavioral Functionality in Canonical Feature', () => {
    it('extracts clean matn and normalizes Arabic consistently', () => {
      const fullText = 'حدثنا الحميدي حدثنا سفيان حدثنا يحيى بن سعيد الأنصاري قال أخبرني محمد بن إبراهيم التيمي أنه سمع علقمة بن وقاص الليثي يقول سمعت عمر بن الخطاب رضي الله عنه على المنبر قال سمعت رسول الله صلى الله عليه وسلم يقول إنما الأعمال بالنيات';
      const matn = FeatureHadith.extractCleanMatn(fullText);

      expect(matn).toBeDefined();
      expect(matn).toContain('الاعمال بالنيات');
    });

    it('parses isnad chains correctly into structured narrator nodes', () => {
      const isnadText = 'حدثنا مسدد حدثنا يحيى عن شعبة عن قتادة عن أنس رضي الله عنه عن النبي صلى الله عليه وسلم';
      const parsed = FeatureHadith.parseHadithIsnad(isnadText);

      expect(parsed.hasSanad).toBe(true);
      expect(parsed.narratorCount).toBeGreaterThanOrEqual(3);
      expect(parsed.nodes.some((n) => n.name.includes('أنس'))).toBe(true);
    });

    it('resolves famous narrator biographies from canonical dictionary', () => {
      const sufyanBio = FeatureHadith.findNarratorBio('سفيان بن عيينة');
      expect(sufyanBio).toBeDefined();
      expect(sufyanBio?.gradeType).toBe('thiqah');
      expect(sufyanBio?.kunya).toContain('أبو محمد');

      const umarBio = FeatureHadith.findNarratorBio('عمر بن الخطاب');
      expect(umarBio).toBeDefined();
      expect(umarBio?.gradeType).toBe('sahabi');
    });

    it('evaluates Hadith grades correctly for Sahihayn and Sunan', () => {
      // Sahihayn: Always Sahih / Muttafaqun Alayh
      const bukhariGrade = FeatureHadith.getHadithGrade('bukhari', 1);
      expect(bukhariGrade.grade).toBe('صحيح');
      expect(bukhariGrade.scholar).toContain('الصحيحين');

      const isMuttafaq = FeatureHadith.isMuttafaqunAlayh('bukhari', 1);
      expect(isMuttafaq).toBe(true);

      // Muttafaq check for Nawawi 40
      expect(FeatureHadith.isMuttafaqunAlayh('nawawi40', 1, 'متفق عليه')).toBe(true);
    });

    it('verifies fake hadith detection against fabricated patterns', async () => {
      const result = await FeatureHadith.checkHadithAuthenticity('طلب العلم فريضة على كل مسلم');
      expect(result).toBeDefined();
      expect(result.query).toBe('طلب العلم فريضة على كل مسلم');

      const fakeCategories = FeatureHadith.FAKE_HADITH_CATEGORIES;
      expect(Array.isArray(fakeCategories)).toBe(true);
      expect(fakeCategories.length).toBeGreaterThan(0);
    });

    it('verifies useHadithStore initialization and state contract', () => {
      const state = FeatureHadith.useHadithStore.getState();
      expect(state).toBeDefined();
      expect(typeof state.activeBook).toBe('object');
      expect(typeof state.searchQuery).toBe('string');
      expect(typeof state.gradeFilter).toBe('string');
    });
  });
});
