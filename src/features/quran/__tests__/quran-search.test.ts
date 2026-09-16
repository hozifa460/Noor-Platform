import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseQuranReference, ALL_SURAHS } from '../domain';
import {
  searchQuranAyahs,
  loadQuranSearchIndex,
  _resetQuranSearchIndexForTesting,
  _setQuranSearchIndexForTesting,
} from '../infrastructure';
import { useQuranStore, clearQuranMemoryCacheForTesting } from '../model';

describe('Quran Ayah Search & Direct Navigation Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    clearQuranMemoryCacheForTesting();
    _resetQuranSearchIndexForTesting();

    // Default sample index containing key verses for testing:
    // - Surah 1:1, 1:2
    // - Surah 2:3 (الصلاة), 2:43 (الزكاة), 2:255 (آية الكرسي)
    // - Surah 94:5, 94:6 (العسر يسرا)
    _setQuranSearchIndexForTesting([
      [1, 1, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'],
      [1, 2, 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'],
      [2, 3, 'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَٰهُمْ يُنفِقُونَ'],
      [2, 43, 'وَأَقِيمُوا۟ ٱلصَّلَوٰةَ وَءَاتُوا۟ ٱلزَّكَوٰةَ وَٱرْكَعُوا۟ مَعَ ٱلرَّٰكِعِينَ'],
      [2, 255, 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌۭ وَلَا نَوْمٌۭ'],
      [94, 5, 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا'],
      [94, 6, 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا'],
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('1. Reference Parsing with English & Arabic Numerals', () => {
    it('parses Western Arabic numerals reference (e.g. 2:255, 2-255, 2 : 255)', () => {
      const ref1 = parseQuranReference('2:255');
      expect(ref1).not.toBeNull();
      expect(ref1?.isValid).toBe(true);
      expect(ref1?.surahNo).toBe(2);
      expect(ref1?.ayahNo).toBe(255);
      expect(ref1?.surahMeta?.nameAr).toBe('البقرة');

      const ref2 = parseQuranReference('2-255');
      expect(ref2?.isValid).toBe(true);
      expect(ref2?.surahNo).toBe(2);
      expect(ref2?.ayahNo).toBe(255);

      const ref3 = parseQuranReference('2 : 255');
      expect(ref3?.isValid).toBe(true);
      expect(ref3?.surahNo).toBe(2);
      expect(ref3?.ayahNo).toBe(255);
    });

    it('parses Eastern Arabic-Indic numerals (e.g. ٢:٢٥٥ and ٢-٢٥٥)', () => {
      const ref = parseQuranReference('٢:٢٥٥');
      expect(ref).not.toBeNull();
      expect(ref?.isValid).toBe(true);
      expect(ref?.surahNo).toBe(2);
      expect(ref?.ayahNo).toBe(255);
      expect(ref?.surahMeta?.nameAr).toBe('البقرة');

      const refDash = parseQuranReference('٢-٢٥٥');
      expect(refDash?.isValid).toBe(true);
      expect(refDash?.surahNo).toBe(2);
      expect(refDash?.ayahNo).toBe(255);
    });

    it('parses named references (e.g. "البقرة: 255", "البقرة 255", "سورة البقرة: ٢٥٥")', () => {
      const ref1 = parseQuranReference('البقرة: 255');
      expect(ref1?.isValid).toBe(true);
      expect(ref1?.surahNo).toBe(2);
      expect(ref1?.ayahNo).toBe(255);

      const ref2 = parseQuranReference('البقرة 255');
      expect(ref2?.isValid).toBe(true);
      expect(ref2?.surahNo).toBe(2);
      expect(ref2?.ayahNo).toBe(255);

      const ref3 = parseQuranReference('سورة البقرة: ٢٥٥');
      expect(ref3?.isValid).toBe(true);
      expect(ref3?.surahNo).toBe(2);
      expect(ref3?.ayahNo).toBe(255);
    });

    it('parses named surah with ayah numbers (e.g. البقرة: 255, سورة البقرة آية 255)', () => {
      const ref = parseQuranReference('سورة البقرة آية 255');
      expect(ref?.isValid).toBe(true);
      expect(ref?.surahNo).toBe(2);
      expect(ref?.ayahNo).toBe(255);
    });

    it('strictly requires full surah number match and rejects partial numeric prefixes (e.g. 2abc, 2:255x, سورة 2abc)', () => {
      // Inputs with alphanumeric suffix should not be accepted as valid reference
      const ref1 = parseQuranReference('2abc');
      expect(ref1?.isValid).not.toBe(true);

      const ref2 = parseQuranReference('2:255x');
      expect(ref2?.isValid).not.toBe(true);

      const ref3 = parseQuranReference('سورة 2abc');
      expect(ref3?.isValid).toBe(false);
      expect(ref3?.errorMessage).toContain('لم يتم التعرف على اسم السورة');

      // Valid full matches continue to succeed
      const validRef = parseQuranReference('2:255');
      expect(validRef?.isValid).toBe(true);
      expect(validRef?.surahNo).toBe(2);
      expect(validRef?.ayahNo).toBe(255);

      const validSurahNum = parseQuranReference('2');
      expect(validSurahNum?.isValid).toBe(true);
      expect(validSurahNum?.surahNo).toBe(2);
      expect(validSurahNum?.isSurahOnly).toBe(true);
    });
  });

  describe('2. Standalone Surah Name Search', () => {
    it('detects standalone surah name without prefix (e.g. "الفاتحة", "الكهف")', () => {
      const ref1 = parseQuranReference('الفاتحة');
      expect(ref1?.isValid).toBe(true);
      expect(ref1?.surahNo).toBe(1);
      expect(ref1?.ayahNo).toBe(1);
      expect(ref1?.isSurahOnly).toBe(true);

      const ref2 = parseQuranReference('الكهف');
      expect(ref2?.isValid).toBe(true);
      expect(ref2?.surahNo).toBe(18);
      expect(ref2?.ayahNo).toBe(1);
      expect(ref2?.isSurahOnly).toBe(true);
    });

    it('detects surah name with "سورة" prefix (e.g. "سورة الفاتحة", "سورة الكهف")', () => {
      const ref = parseQuranReference('سورة الفاتحة');
      expect(ref?.isValid).toBe(true);
      expect(ref?.surahNo).toBe(1);
      expect(ref?.ayahNo).toBe(1);
      expect(ref?.isSurahOnly).toBe(true);
    });

    it('searchQuranAyahs returns surah match with matchType "surah" at top priority', async () => {
      const res = await searchQuranAyahs('سورة الفاتحة');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      expect(res.results[0].surahNumber).toBe(1);
      expect(res.results[0].ayahNumber).toBe(1);
      expect(res.results[0].matchType).toBe('surah');
      expect(res.results[0].score).toBe(1000);
      expect(res.referenceNotice).toContain('الانتقال إلى بداية سورة');
    });

    it('returns clear error message for unrecognized surah name with "سورة"', () => {
      const ref = parseQuranReference('سورة مجهولة_تماماً');
      expect(ref?.isValid).toBe(false);
      expect(ref?.errorMessage).toContain('لم يتم التعرف على اسم السورة');
    });
  });

  describe('3. Invalid Reference Handling', () => {
    it('detects ayah number exceeding surah total ayahs (e.g. 2:999)', () => {
      const ref = parseQuranReference('2:999');
      expect(ref).not.toBeNull();
      expect(ref?.isReference).toBe(true);
      expect(ref?.isValid).toBe(false);
      expect(ref?.errorMessage).toContain('سورة البقرة تحتوي على 286 آية فقط');
    });

    it('detects surah number outside 1..114 range (e.g. 150:1)', () => {
      const ref = parseQuranReference('150:1');
      expect(ref).not.toBeNull();
      expect(ref?.isReference).toBe(true);
      expect(ref?.isValid).toBe(false);
      expect(ref?.errorMessage).toContain('القرآن الكريم يضم 114 سورة');
    });

    it('searchQuranAyahs safely surfaces invalidReferenceMessage without crashing', async () => {
      const res = await searchQuranAyahs('2:999');
      expect(res.invalidReferenceMessage).toBeDefined();
      expect(res.invalidReferenceMessage).toContain('سورة البقرة تحتوي على 286 آية فقط');
      expect(res.results.length).toBe(0);
    });
  });

  describe('4. Text Normalization, Dagger Alifs & Tashkeel', () => {
    it('matches dictational "الحمد لله رب العالمين" against Uthmani "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"', async () => {
      const res = await searchQuranAyahs('الحمد لله رب العالمين');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      expect(res.results[0].surahNumber).toBe(1);
      expect(res.results[0].ayahNumber).toBe(2);
      expect(res.results[0].matchType).toBe('exact_phrase');
    });

    it('matches "الصلاة" against Uthmani "ٱلصَّلَوٰةَ"', async () => {
      const res = await searchQuranAyahs('الصلاة');
      expect(res.results.length).toBe(2); // 2:3 and 2:43
      expect(res.results.some((r) => r.ayahNumber === 3)).toBe(true);
      expect(res.results.some((r) => r.ayahNumber === 43)).toBe(true);
    });

    it('matches "الزكاة" against Uthmani "ٱلزَّكَوٰةَ"', async () => {
      const res = await searchQuranAyahs('الزكاة');
      expect(res.results.length).toBe(1);
      expect(res.results[0].ayahNumber).toBe(43);
    });

    it('matches phrase with quotes «إن مع العسر يسرا» regardless of quotes and tashkeel', async () => {
      const res = await searchQuranAyahs('«إن مع العسر يسرا»');
      expect(res.results.length).toBe(2);
      expect(res.results[0].surahNumber).toBe(94);
    });
  });

  describe('5. Ranking Algorithm & Exclusion of Loose Matches', () => {
    it('prioritizes exact reference match above text search matches', async () => {
      const res = await searchQuranAyahs('2:255');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      expect(res.results[0].matchType).toBe('reference');
      expect(res.results[0].score).toBe(1000);
      expect(res.results[0].surahNumber).toBe(2);
      expect(res.results[0].ayahNumber).toBe(255);
    });

    it('prioritizes exact phrase above all-words matching', async () => {
      _setQuranSearchIndexForTesting([
        [10, 1, 'كَلِمَاتٌ مُتَفَرِّقَةٌ فِي هَٰذِهِ ٱلْآيَةِ يُسْرًا وَفِي مَوْضِعٍ آخَرَ ٱلْعُسْرِ'],
        [94, 6, 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا'],
      ]);

      const res = await searchQuranAyahs('مع العسر يسرا');
      expect(res.results[0].surahNumber).toBe(94);
      expect(res.results[0].matchType).toBe('exact_phrase');
      expect(res.results[0].score).toBe(500);
    });

    it('does NOT match single words for multi-word queries (strictly all words or none)', async () => {
      _setQuranSearchIndexForTesting([
        [10, 1, 'كَلِمَةٌ وَاحِدَةٌ تَحْتَوِي عَلَى ٱلْعُسْرِ فَقَطْ'],
      ]);

      const res = await searchQuranAyahs('العسر واليسر والرخاء');
      expect(res.results.length).toBe(0);
    });
  });

  describe('6. Direct Navigation & Highlighted Target', () => {
    it('navigateToAyah sets highlightedTarget, loads surah, and keeps audio halted', async () => {
      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('/data/quran/surahs/2.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              surahNo: 2,
              nameAr: 'البقرة',
              nameEn: 'Al-Baqarah',
              nameRoman: 'The Cow',
              placeOfRevelation: 'Medinan',
              totalAyahs: 286,
              ayahs: [
                { ayahNo: 255, ayahNoQuran: 262, textAr: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ', textEn: '', juz: 3 },
              ],
            }),
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      await useQuranStore.getState().navigateToAyah(2, 255);

      const state = useQuranStore.getState();
      expect(state.activeSurah.number).toBe(2);
      expect(state.viewMode).toBe('interactive');
      expect(state.highlightedAyah).toBe(255);
      expect(state.highlightedTarget).toEqual({ surahNo: 2, ayahNo: 255 });
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      expect(state.surahData?.surahNo).toBe(2);
    });

    it('manual setActiveSurah clears highlightedTarget and highlightedAyah', () => {
      useQuranStore.getState().setHighlightedTarget({ surahNo: 2, ayahNo: 255 });
      expect(useQuranStore.getState().highlightedTarget).toEqual({ surahNo: 2, ayahNo: 255 });

      // User manually switches to Surah 3 (Ali Imran)
      useQuranStore.getState().setActiveSurah(ALL_SURAHS[2]);
      expect(useQuranStore.getState().activeSurah.number).toBe(3);
      expect(useQuranStore.getState().highlightedTarget).toBeNull();
      expect(useQuranStore.getState().highlightedAyah).toBeNull();
    });
  });

  describe('7. Search State Persistence in Store', () => {
    it('persists search query, results, and modal state across store interactions', () => {
      const mockResult = {
        surahNumber: 2,
        ayahNumber: 255,
        surahNameAr: 'البقرة',
        surahNameEn: 'The Cow',
        ayahTextAr: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ',
        matchType: 'reference' as const,
        score: 1000,
      };

      useQuranStore.getState().openQuranSearch();
      useQuranStore.getState().setQuranSearchQuery('2:255');
      useQuranStore.getState().setQuranSearchResults([mockResult]);

      expect(useQuranStore.getState().isSearchModalOpen).toBe(true);
      expect(useQuranStore.getState().quranSearchQuery).toBe('2:255');
      expect(useQuranStore.getState().quranSearchResults.length).toBe(1);

      // Close modal
      useQuranStore.getState().closeQuranSearch();
      expect(useQuranStore.getState().isSearchModalOpen).toBe(false);

      // Reopen modal: query and results remain intact!
      useQuranStore.getState().openQuranSearch();
      expect(useQuranStore.getState().quranSearchQuery).toBe('2:255');
      expect(useQuranStore.getState().quranSearchResults[0].ayahNumber).toBe(255);
    });
  });

  describe('8. Full Real Corpus Integration Verification', () => {
    beforeEach(() => {
      const filePath = path.resolve(process.cwd(), 'public', 'data', 'quran', 'quran_search_index.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      vi.stubGlobal('fetch', (url: string) => {
        if (url.includes('quran_search_index.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => data,
          });
        }
        return Promise.reject(new Error(`Unhandled fetch url in test: ${url}`));
      });
    });

    it('loads the full 6,236 Quran search index without error', async () => {
      _resetQuranSearchIndexForTesting();
      const index = await loadQuranSearchIndex();
      expect(index.length).toBe(6236);
      expect(index[0].surahNo).toBe(1);
      expect(index[0].ayahNo).toBe(1);
      expect(index[6235].surahNo).toBe(114);
      expect(index[6235].ayahNo).toBe(6);
    });

    it('searches the real 6,236 verses corpus for «إن مع العسر يسرا»', async () => {
      _resetQuranSearchIndexForTesting();
      const res = await searchQuranAyahs('إن مع العسر يسرا');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      const sharh = res.results.find((r) => r.surahNumber === 94 && r.ayahNumber === 6);
      expect(sharh).toBeDefined();
      expect(sharh?.ayahTextAr).toContain('يُسْرًۭا');
    });

    it('searches the real corpus for dictational «الحمد لله رب العالمين» and finds all occurrences', async () => {
      _resetQuranSearchIndexForTesting();
      const res = await searchQuranAyahs('الحمد لله رب العالمين');
      expect(res.results.length).toBe(7);
      expect(res.results[0].surahNumber).toBe(1);
      expect(res.results[0].ayahNumber).toBe(2);
    });

    it('searches the real corpus for «مالك يوم الدين» and finds Surah Al-Fatihah', async () => {
      _resetQuranSearchIndexForTesting();
      const res = await searchQuranAyahs('مالك يوم الدين');
      expect(res.results.length).toBe(1);
      expect(res.results[0].surahNumber).toBe(1);
      expect(res.results[0].ayahNumber).toBe(4);
    });

    it('returns all 61 matches without truncating to 50 when searching «الحياة الدنيا»', async () => {
      _resetQuranSearchIndexForTesting();
      const res = await searchQuranAyahs('الحياة الدنيا');
      expect(res.totalMatches).toBe(61);
      expect(res.results.length).toBe(61);
    });
  });
});
