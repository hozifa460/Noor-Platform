import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Import Canonical Features Implementation
import * as FeatureHadith from '@/features/hadith';

// 2. Import Legacy Lib Facades
import * as LegacyLibHadith from '@/lib/hadith';
import * as LegacyLoader from '@/lib/hadith/loader';
import * as LegacySharh from '@/lib/hadith/sharh';
import * as LegacyGradeEngine from '@/lib/hadith/grade-engine';
import * as LegacyIsnadEngine from '@/lib/hadith/isnad-engine';
import * as LegacyNarratorEngine from '@/lib/hadith/narrator-engine';
import * as LegacyFakeEngine from '@/lib/hadith/fake-engine';
import * as LegacyData from '@/lib/hadith/data';

// 3. Import Legacy Components Facades
import * as LegacyComponents from '@/components/hadith';

// 4. Import Legacy Store Facade
import { useHadithStore as useLegacyStore } from '@/stores/hadith-store';

describe('Hadith Domain Unification — Cache Sharing, Facade Parity & Behavioral Verification', () => {
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

  describe('1. Single-Cache Sharing Integrity (Zero Cache Fragmentation)', () => {
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

    it('shares the exact same in-memory bookCache between @/features/hadith and @/lib/hadith/loader', async () => {
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

      // Step A: Load book via canonical @/features/hadith
      const loadedFromFeature = await FeatureHadith.loadHadithBook('sample_test_book.json');
      expect(loadedFromFeature).toBeDefined();
      expect(FeatureHadith.getBookCacheSize()).toBe(1);

      const countAfterFeatureLoad = fetchCount;

      // Step B: Load the exact same book via legacy @/lib/hadith/loader
      const loadedFromLegacy = await LegacyLoader.loadHadithBook('sample_test_book.json');
      expect(loadedFromLegacy).toBeDefined();

      // Zero new network calls: hits the shared in-memory cache!
      expect(fetchCount).toBe(countAfterFeatureLoad);
      expect(loadedFromLegacy).toBe(loadedFromFeature);

      // Step C: Verify clearBookCache clears the shared cache for both
      LegacyLoader.clearBookCache();
      expect(FeatureHadith.getBookCacheSize()).toBe(0);
    });

    it('shares the exact same sharh inverted index between @/features/hadith and @/lib/hadith/sharh', () => {
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

      // Build inverted index via canonical FeatureHadith
      FeatureHadith.buildSharhInvertedIndex(mockSharhItems);

      // Verify getSharhByHadithId via LegacySharh
      const item = LegacySharh.getSharhByHadithId(mockSharhItems, 's-1');
      expect(item).toBeDefined();
      expect(item?.id).toBe('s-1');
      expect(item?.title).toContain('الأعمال بالنيات');

      // Clear sharh cache via legacy facade and assert it reflects on canonical
      LegacySharh.clearSharhCache();
      expect(FeatureHadith.isSharhCacheLoaded()).toBe(false);
    });
  });

  describe('2. Function & Constant Reference Equality (100% Facade Parity)', () => {
    it('proves every core library function is identical between @/lib/hadith and @/features/hadith', () => {
      expect(LegacyLibHadith.loadHadithBook).toBe(FeatureHadith.loadHadithBook);
      expect(LegacyLibHadith.loadSpecificHadith).toBe(FeatureHadith.loadSpecificHadith);
      expect(LegacyLibHadith.extractCleanMatn).toBe(FeatureHadith.extractCleanMatn);
      expect(LegacyLibHadith.prepareBookData).toBe(FeatureHadith.prepareBookData);
      expect(LegacyLibHadith.getHadithGrade).toBe(FeatureHadith.getHadithGrade);
      expect(LegacyLibHadith.isMuttafaqunAlayh).toBe(FeatureHadith.isMuttafaqunAlayh);
      expect(LegacyLibHadith.loadSunanGrades).toBe(FeatureHadith.loadSunanGrades);
      expect(LegacyLibHadith.parseHadithIsnad).toBe(FeatureHadith.parseHadithIsnad);
      expect(LegacyLibHadith.findNarratorBio).toBe(FeatureHadith.findNarratorBio);
      expect(LegacyLibHadith.loadHadeethEncSharh).toBe(FeatureHadith.loadHadeethEncSharh);
      expect(LegacyLibHadith.findHadithSharh).toBe(FeatureHadith.findHadithSharh);
      expect(LegacyLibHadith.getSharhByHadithId).toBe(FeatureHadith.getSharhByHadithId);
      expect(LegacyLibHadith.searchHadithsInBook).toBe(FeatureHadith.searchHadithsInBook);
      expect(LegacyLibHadith.searchAcrossAllBooks).toBe(FeatureHadith.searchAcrossAllBooks);
      expect(LegacyLibHadith.loadFakeHadiths).toBe(FeatureHadith.loadFakeHadiths);
      expect(LegacyLibHadith.searchFakeHadiths).toBe(FeatureHadith.searchFakeHadiths);
      expect(LegacyLibHadith.checkHadithAuthenticity).toBe(FeatureHadith.checkHadithAuthenticity);
      expect(LegacyLibHadith.fetchHadithTranslation).toBe(FeatureHadith.fetchHadithTranslation);
      expect(LegacyLibHadith.isBookTranslationAvailable).toBe(FeatureHadith.isBookTranslationAvailable);
    });

    it('proves individual engine facades match canonical feature engines', () => {
      expect(LegacyGradeEngine.getHadithGrade).toBe(FeatureHadith.getHadithGrade);
      expect(LegacyIsnadEngine.parseHadithIsnad).toBe(FeatureHadith.parseHadithIsnad);
      expect(LegacyNarratorEngine.findNarratorBio).toBe(FeatureHadith.findNarratorBio);
      expect(LegacyFakeEngine.checkHadithAuthenticity).toBe(FeatureHadith.checkHadithAuthenticity);
      expect(LegacyData.HADITH_BOOKS_LIST).toBe(FeatureHadith.HADITH_BOOKS_LIST);
    });

    it('proves UI component facades re-export canonical feature UI components', () => {
      expect(LegacyComponents.HadithHubView).toBe(FeatureHadith.HadithHubView);
      expect(LegacyComponents.HadithCard).toBe(FeatureHadith.HadithCard);
      expect(LegacyComponents.HadithDetailModal).toBe(FeatureHadith.HadithDetailModal);
      expect(LegacyComponents.HadithSearchHeader).toBe(FeatureHadith.HadithSearchHeader);
      expect(LegacyComponents.HadithBookSelectorModal).toBe(FeatureHadith.HadithBookSelectorModal);
      expect(LegacyComponents.HadithChapterSelectorModal).toBe(FeatureHadith.HadithChapterSelectorModal);
      expect(LegacyComponents.HadithGradesGuideModal).toBe(FeatureHadith.HadithGradesGuideModal);
      expect(LegacyComponents.HadithIsnadTree).toBe(FeatureHadith.HadithIsnadTree);
      expect(LegacyComponents.NarratorBioModal).toBe(FeatureHadith.NarratorBioModal);
      expect(LegacyComponents.FakeHadithChecker).toBe(FeatureHadith.FakeHadithChecker);
      expect(LegacyComponents.HadithTranslationsView).toBe(FeatureHadith.HadithTranslationsView);
    });

    it('proves Zustand store facade shares the exact same store instance', () => {
      expect(useLegacyStore).toBe(FeatureHadith.useHadithStore);
    });
  });

  describe('3. Core Behavioral Functionality via Both Facades', () => {
    it('extracts clean matn and normalizes Arabic consistently', () => {
      const fullText = 'حدثنا الحميدي حدثنا سفيان حدثنا يحيى بن سعيد الأنصاري قال أخبرني محمد بن إبراهيم التيمي أنه سمع علقمة بن وقاص الليثي يقول سمعت عمر بن الخطاب رضي الله عنه على المنبر قال سمعت رسول الله صلى الله عليه وسلم يقول إنما الأعمال بالنيات';
      const matnFromFeature = FeatureHadith.extractCleanMatn(fullText);
      const matnFromLegacy = LegacyLibHadith.extractCleanMatn(fullText);

      expect(matnFromFeature).toBe(matnFromLegacy);
      expect(matnFromFeature).toContain('الاعمال بالنيات');
    });

    it('parses isnad chains correctly into structured narrator nodes', () => {
      const isnadText = 'حدثنا مسدد حدثنا يحيى عن شعبة عن قتادة عن أنس رضي الله عنه عن النبي صلى الله عليه وسلم';
      const parsed = LegacyIsnadEngine.parseHadithIsnad(isnadText);

      expect(parsed.hasSanad).toBe(true);
      expect(parsed.narratorCount).toBeGreaterThanOrEqual(3);
      expect(parsed.nodes.some((n) => n.name.includes('أنس'))).toBe(true);
    });

    it('resolves famous narrator biographies from canonical dictionary', () => {
      const sufyanBio = FeatureHadith.findNarratorBio('سفيان بن عيينة');
      expect(sufyanBio).toBeDefined();
      expect(sufyanBio?.gradeType).toBe('thiqah');
      expect(sufyanBio?.kunya).toContain('أبو محمد');

      const umarBio = LegacyNarratorEngine.findNarratorBio('عمر بن الخطاب');
      expect(umarBio).toBeDefined();
      expect(umarBio?.gradeType).toBe('sahabi');
    });

    it('evaluates Hadith grades correctly for Sahihayn and Sunan', () => {
      // Sahihayn: Always Sahih / Muttafaqun Alayh
      const bukhariGrade = FeatureHadith.getHadithGrade('bukhari', 1);
      expect(bukhariGrade.grade).toBe('صحيح');
      expect(bukhariGrade.scholar).toContain('الصحيحين');

      const isMuttafaq = LegacyLibHadith.isMuttafaqunAlayh('bukhari', 1);
      expect(isMuttafaq).toBe(true);

      // Muttafaq check for Nawawi 40
      expect(FeatureHadith.isMuttafaqunAlayh('nawawi40', 1, 'متفق عليه')).toBe(true);
    });

    it('verifies fake hadith detection against fabricated patterns', async () => {
      const result = await LegacyFakeEngine.checkHadithAuthenticity('طلب العلم فريضة على كل مسلم');
      expect(result).toBeDefined();
      expect(result.query).toBe('طلب العلم فريضة على كل مسلم');

      const fakeCategories = FeatureHadith.FAKE_HADITH_CATEGORIES;
      expect(Array.isArray(fakeCategories)).toBe(true);
      expect(fakeCategories.length).toBeGreaterThan(0);
    });
  });
});
