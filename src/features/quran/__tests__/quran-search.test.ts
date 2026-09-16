import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { parseQuranReference } from '../domain';
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
    // - Surah 2:3 (الصلاة), 2:255 (آية الكرسي)
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

    it('parses "سورة [name] آية [number]" pattern', () => {
      const ref = parseQuranReference('سورة البقرة آية 255');
      expect(ref?.isValid).toBe(true);
      expect(ref?.surahNo).toBe(2);
      expect(ref?.ayahNo).toBe(255);
    });
  });

  describe('2. Invalid Reference Handling', () => {
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

  describe('3. Text Search with & without Tashkeel', () => {
    it('matches exact phrase with full diacritics / tashkeel', async () => {
      const res = await searchQuranAyahs('إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      const first = res.results[0];
      expect(first.surahNumber).toBe(94);
      expect([5, 6]).toContain(first.ayahNumber);
      expect(first.matchType).toBe('exact_phrase');
    });

    it('matches exact phrase without any diacritics (plain Arabic)', async () => {
      const res = await searchQuranAyahs('ان مع العسر يسرا');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      const matches = res.results.filter((r) => r.surahNumber === 94);
      expect(matches.length).toBe(2); // 94:5 and 94:6
      expect(matches[0].matchType).toBe('exact_phrase');
    });

    it('normalizes Uthmani dagger alif on waw (وٰ -> ا) so "الصلاة" matches "الصَّلَوٰةَ"', async () => {
      const res = await searchQuranAyahs('الصلاة');
      expect(res.results.length).toBeGreaterThanOrEqual(1);
      const baqarah3 = res.results.find((r) => r.surahNumber === 2 && r.ayahNumber === 3);
      expect(baqarah3).toBeDefined();
      expect(baqarah3?.ayahTextAr).toContain('ٱلصَّلَوٰةَ');
    });
  });

  describe('4. Result Prioritization & Ranking', () => {
    it('prioritizes exact reference match over text matches', async () => {
      // Query "2:255"
      const res = await searchQuranAyahs('2:255');
      expect(res.results.length).toBe(1);
      expect(res.results[0].matchType).toBe('reference');
      expect(res.results[0].surahNumber).toBe(2);
      expect(res.results[0].ayahNumber).toBe(255);
      expect(res.results[0].score).toBe(1000);
      expect(res.referenceNotice).toContain('الآية 255');
    });

    it('prioritizes exact phrase (score 500) over all-words match (score 200)', async () => {
      _setQuranSearchIndexForTesting([
        [10, 1, 'العسر والضيق ثم بعد ذلك يسرا عظيما'], // all-words match
        [94, 6, 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا'], // exact phrase match
      ]);

      const res = await searchQuranAyahs('العسر يسرا');
      expect(res.results.length).toBe(2);
      expect(res.results[0].surahNumber).toBe(94);
      expect(res.results[0].matchType).toBe('exact_phrase');
      expect(res.results[0].score).toBe(500);

      expect(res.results[1].surahNumber).toBe(10);
      expect(res.results[1].matchType).toBe('all_words');
      expect(res.results[1].score).toBe(200);
    });

    it('does NOT match arbitrary single words in a multi-word query', async () => {
      // "العسر يسرا شمس" -> "شمس" does not appear in 94:5 or 94:6
      const res = await searchQuranAyahs('العسر يسرا شمس');
      // Must NOT return Surah 94 just because "العسر" or "يسرا" is present!
      expect(res.results.length).toBe(0);
    });
  });

  describe('5. Empty and Non-Existent Queries', () => {
    it('returns empty results for whitespace or blank query', async () => {
      const res1 = await searchQuranAyahs('');
      expect(res1.results).toEqual([]);
      expect(res1.totalMatches).toBe(0);

      const res2 = await searchQuranAyahs('   ');
      expect(res2.results).toEqual([]);
    });

    it('returns empty results for non-existent text in Quran', async () => {
      const res = await searchQuranAyahs('نص_مستحيل_وجوده_في_القران_الكريم');
      expect(res.results.length).toBe(0);
      expect(res.totalMatches).toBe(0);
    });
  });

  describe('6. Direct Navigation to Ayah (e.g. 2:255 in long Surah)', () => {
    it('navigateToAyah switches to interactive mode, sets highlightedAyah, loads surah, and keeps audio halted', async () => {
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

      // User triggers navigateToAyah(2, 255)
      await useQuranStore.getState().navigateToAyah(2, 255);

      const state = useQuranStore.getState();
      expect(state.activeSurah.number).toBe(2);
      expect(state.viewMode).toBe('interactive');
      expect(state.highlightedAyah).toBe(255);
      // Crucial requirement: must NOT start playing audio automatically
      expect(state.isPlayingAudio).toBe(false);
      expect(state.currentPlayingAyah).toBeNull();
      expect(state.surahData?.surahNo).toBe(2);
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

  describe('8. Full Corpus Integration Verification', () => {
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
  });
});
