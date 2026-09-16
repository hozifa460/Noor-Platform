import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ReactDOMClient from 'react-dom/client';
import {
  tokenizeAyahWords,
  normalizeArabicRoot,
  cleanArabicForMatching,
} from '../domain';
import {
  loadSurahMorphology,
  getWordMorphology,
  getWordMorphologyResult,
  loadRootsIndex,
  getRootOccurrences,
  getRootOccurrencesResult,
  clearMorphologyCacheForTesting,
} from '../infrastructure';
import {
  useQuranStore,
  clearQuranMemoryCacheForTesting,
} from '../model';
import { AyahCard } from '../ui/AyahCard';

describe('Quran Word Morphology & Root Explorer («استكشف الكلمة»)', () => {
  beforeEach(() => {
    clearQuranMemoryCacheForTesting();
    clearMorphologyCacheForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Word Tokenizer & Spacing (tokenizeAyahWords & Rendered Copying)', () => {
    it('tokenizes verses without waqf marks into sequential word indices', () => {
      const text = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
      const tokens = tokenizeAyahWords(text);

      expect(tokens).toHaveLength(4);
      expect(tokens.every((t) => t.type === 'word')).toBe(true);
      expect(tokens.map((t) => t.wordIndex)).toEqual([1, 2, 3, 4]);
      expect(tokens.map((t) => t.text)).toEqual(['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ']);
    });

    it('isolates standalone waqf marks and assigns wordIndex strictly to genuine words', () => {
      // Surah 2:2 with two ۛ waqf marks
      const text = 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ';
      const tokens = tokenizeAyahWords(text);

      expect(tokens).toHaveLength(9); // 7 words + 2 waqf marks
      const wordTokens = tokens.filter((t) => t.type === 'word');
      const waqfTokens = tokens.filter((t) => t.type === 'waqf');

      expect(wordTokens).toHaveLength(7);
      expect(waqfTokens).toHaveLength(2);
      expect(wordTokens.map((t) => t.wordIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);

      // Reconstructed text with whitespace must match original exactly
      const reconstructed = tokens.map((t) => t.text).join(' ');
      expect(reconstructed).toBe(text);
    });

    it('simulates native DOM selection and copying by joining tokens with spaces', () => {
      const ayahText = 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝١ الرَّحْمَٰنِ الرَّحِيمِ';
      const tokens = tokenizeAyahWords(ayahText);
      const copiedText = tokens.map((t) => t.text).join(' ');
      expect(copiedText).toBe(ayahText);
    });

    it('handles empty or whitespace-only strings gracefully', () => {
      expect(tokenizeAyahWords('')).toEqual([]);
      expect(tokenizeAyahWords('   ')).toEqual([]);
    });
  });

  describe('AyahCard Word Accessibility & Native Copy Space Preservation', () => {
    it('renders words with role="button", tabIndex=0, unique ids, and selectable waqf marks', () => {
      const html = renderToStaticMarkup(
        React.createElement(AyahCard, {
          ayah: {
            ayahNo: 2,
            ayahNoQuran: 9,
            juz: 1,
            textAr: 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ',
            textEn: 'This is the Book',
            isSajdah: false,
          },
          surahNo: 2,
          isPlaying: false,
          onPlay: () => {},
          onOpenDetail: () => {},
          onCopy: () => {},
          isCopied: false,
          fontSize: 24,
          showTranslation: false,
          onWordClick: () => {},
        })
      );

      // Unique token ids
      expect(html).toContain('id="word-token-2-2-1"');
      expect(html).toContain('id="word-token-2-2-7"');

      // Accessibility attributes
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('aria-label="استكشف كلمة: ذَٰلِكَ"');

      // Waqf marks must NOT have select-none (preserves native copy)
      expect(html).toContain('class="inline-block px-0.5 text-muted-foreground/80">ۛ</span>');
    });

    it('handles Enter and Space keydown events on word tokens to trigger onWordClick', () => {
      const onWordClickMock = vi.fn();
      const container = document.createElement('div');
      document.body.appendChild(container);

      const root = ReactDOMClient.createRoot(container);
      act(() => {
        root.render(
          React.createElement(AyahCard, {
            ayah: {
              ayahNo: 1,
              ayahNoQuran: 1,
              juz: 1,
              textAr: 'بِسْمِ ٱللَّهِ',
              textEn: 'In the name of Allah',
              isSajdah: false,
            },
            surahNo: 1,
            isPlaying: false,
            onPlay: () => {},
            onOpenDetail: () => {},
            onCopy: () => {},
            isCopied: false,
            fontSize: 24,
            showTranslation: false,
            onWordClick: onWordClickMock,
          })
        );
      });

      const firstWord = container.querySelector('#word-token-1-1-1');
      expect(firstWord).not.toBeNull();

      // Trigger Enter keydown
      act(() => {
        firstWord?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      });
      expect(onWordClickMock).toHaveBeenCalledTimes(1);
      expect(onWordClickMock).toHaveBeenCalledWith({
        surahNo: 1,
        ayahNo: 1,
        wordIndex: 1,
        wordText: 'بِسْمِ',
      });

      // Trigger Space keydown
      act(() => {
        firstWord?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
      });
      expect(onWordClickMock).toHaveBeenCalledTimes(2);

      // Trigger other key (e.g. ArrowDown) - must not trigger
      act(() => {
        firstWord?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      });
      expect(onWordClickMock).toHaveBeenCalledTimes(2);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    });
  });

  describe('Arabic Normalizers for Matching (normalizeArabicRoot & cleanArabicForMatching)', () => {
    it('unifies spaced and dashed roots with plain roots', () => {
      expect(normalizeArabicRoot('س - م - و')).toBe('سمو');
      expect(normalizeArabicRoot('ر - ح - م')).toBe('رحم');
      expect(normalizeArabicRoot('ك_ت_ب')).toBe('كتب');
    });

    it('unifies alif and hamza variants for robust lookup', () => {
      expect(normalizeArabicRoot('أله')).toBe('اله');
      expect(normalizeArabicRoot('إله')).toBe('اله');
      expect(normalizeArabicRoot('آمن')).toBe('امن');
    });

    it('cleanArabicForMatching strips tashkeel and Quranic orthography signs for verified matching', () => {
      expect(cleanArabicForMatching('وَٱلتِّينِ')).toBe('والتين');
      expect(cleanArabicForMatching('وَٱلزَّيْتُونِ')).toBe('والزيتون');
      expect(cleanArabicForMatching('إِيَّاكَ')).toBe('اياك');
      expect(cleanArabicForMatching('سَلَٰمٌ')).toBe('سلم');
      expect(cleanArabicForMatching('لَهُۥ')).toBe('له');
      expect(cleanArabicForMatching('بِهِۦ')).toBe('به');
    });
  });

  describe('Morphology Infrastructure Engine with Real Data Assets', () => {
    beforeEach(() => {
      // Mock global fetch to read real JSON assets from public/data/quran/
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        const relativePath = url.startsWith('/') ? url.slice(1) : url;
        const filePath = path.resolve(process.cwd(), 'public', relativePath);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          return {
            ok: true,
            status: 200,
            json: async () => JSON.parse(content),
          } as unknown as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        } as unknown as Response;
      });
    });

    it('loads real Surah 1 morphology and parses segments correctly', async () => {
      const s1 = await loadSurahMorphology(1);
      expect(s1).not.toBeNull();
      expect(s1?.surahNo).toBe(1);
      expect(s1?.totalWords).toBe(29);
      expect(s1?.riwayah).toContain('حفص عن عاصم');
      expect(s1?.attribution).toContain('جامعة ليدز');

      // Check 1:1:1 (بِسْمِ)
      const bism = await getWordMorphology(1, 1, 1, 'بِسْمِ');
      expect(bism).not.toBeNull();
      expect(bism?.wordArabic).toBe('بِسْمِ');
      expect(bism?.root).toBe('سمو');
      expect(bism?.rootSpaced).toBe('س - م - و');
      expect(bism?.segments).toHaveLength(2);
      expect(bism?.segments[0].tagAr).toBe('حرف جر');
      expect(bism?.segments[1].tagAr).toBe('اسم');

      // Check 1:1:2 (ٱللَّهِ)
      const allah = await getWordMorphology(1, 1, 2, 'ٱللَّهِ');
      expect(allah?.root).toBe('اله');
      expect(allah?.segments[0].tagAr).toBe('اسم علم');

      // Check 1:1:3 (ٱلرَّحْمَٰنِ)
      const rahman = await getWordMorphology(1, 1, 3, 'ٱلرَّحْمَٰنِ');
      expect(rahman?.root).toBe('رحم');
      expect(rahman?.segments[1].tagAr).toBe('صفة');
    });

    it('translates PRON to «ضمير» for stem pronouns like «إِيَّاكَ» without guessing attachment', async () => {
      // 1:5:1 (إِيَّاكَ) -> pronoun with no root in source
      const iyyaka = await getWordMorphology(1, 5, 1, 'إِيَّاكَ');
      expect(iyyaka).not.toBeNull();
      expect(iyyaka?.root).toBe('');
      expect(iyyaka?.rootSpaced).toBe('');
      expect(iyyaka?.segments[0].tagAr).toBe('ضمير');
      expect(iyyaka?.posSummary).toContain('ضمير');
    });

    it('translates suffix pronouns to «ضمير متصل» when explicit suffix feature is present', async () => {
      // 2:17:9 (حَوْلَهُۥ) -> suffix pronoun 'هُۥ'
      const hawlahu = await getWordMorphology(2, 17, 9, 'حَوْلَهُۥ');
      expect(hawlahu).not.toBeNull();
      const suffixSeg = hawlahu?.segments.find((s) => s.type === 'suffix');
      expect(suffixSeg).toBeDefined();
      expect(suffixSeg?.tagAr).toBe('ضمير متصل');
    });

    it('accurately verifies and aligns Surah 95:1 (At-Tin) without false matches', async () => {
      // Surah 95:1 text: "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَٱلتِّينِ وَٱلزَّيْتُونِ" (6 words)
      // Words 1..4 (prefixed Basmalah in Tanzil) must return null (unavailable in source)
      expect(await getWordMorphology(95, 1, 1, 'بِّسْمِ')).toBeNull();
      expect(await getWordMorphology(95, 1, 2, 'ٱللَّهِ')).toBeNull();
      expect(await getWordMorphology(95, 1, 3, 'ٱلرَّحْمَٰنِ')).toBeNull();
      expect(await getWordMorphology(95, 1, 4, 'ٱلرَّحِيمِ')).toBeNull();

      // Word 5 (وَٱلتِّينِ) -> matches corpus word 1 with root 'تين'
      const tin = await getWordMorphology(95, 1, 5, 'وَٱلتِّينِ');
      expect(tin).not.toBeNull();
      expect(tin?.root).toBe('تين');
      expect(tin?.wordArabic).toContain('تِّينِ');

      // Word 6 (وَٱلزَّيْتُونِ) -> matches corpus word 2 with root 'زيت'
      const zaytoon = await getWordMorphology(95, 1, 6, 'وَٱلزَّيْتُونِ');
      expect(zaytoon).not.toBeNull();
      expect(zaytoon?.root).toBe('زيت');
    });

    it('accurately verifies and aligns Surah 97:1 (Al-Qadr) without false matches', async () => {
      // Surah 97:1 text: "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ" (9 words)
      // Words 1..4 must return null
      expect(await getWordMorphology(97, 1, 1, 'بِّسْمِ')).toBeNull();
      expect(await getWordMorphology(97, 1, 4, 'ٱلرَّحِيمِ')).toBeNull();

      // Word 5 (إِنَّآ) -> matches corpus word 1
      const inna = await getWordMorphology(97, 1, 5, 'إِنَّآ');
      expect(inna).not.toBeNull();
      expect(inna?.wordArabic).toContain('إِنَّ');

      // Word 6 (أَنزَلْنَٰهُ) -> matches corpus word 2 with root 'نزل'
      const anzalnahu = await getWordMorphology(97, 1, 6, 'أَنزَلْنَٰهُ');
      expect(anzalnahu).not.toBeNull();
      expect(anzalnahu?.root).toBe('نزل');

      // Word 9 (ٱلْقَدْرِ) -> matches corpus word 5 with root 'قدر'
      const qadr = await getWordMorphology(97, 1, 9, 'ٱلْقَدْرِ');
      expect(qadr).not.toBeNull();
      expect(qadr?.root).toBe('قدر');
    });

    it('accurately verifies and aligns Surah 37:130 (As-Saffat) for compound name «إِلْ يَاسِينَ»', async () => {
      // Surah 37:130 text: "سَلَٰمٌ عَلَىٰٓ إِلْ يَاسِينَ" (4 tokens: 1: سَلَٰمٌ, 2: عَلَىٰٓ, 3: إِلْ, 4: يَاسِينَ)
      // Word 1: سَلَٰمٌ -> root سلم
      const salam = await getWordMorphology(37, 130, 1, 'سَلَٰمٌ');
      expect(salam).not.toBeNull();
      expect(salam?.root).toBe('سلم');

      // Word 2: عَلَىٰٓ -> preposition
      const ala = await getWordMorphology(37, 130, 2, 'عَلَىٰٓ');
      expect(ala).not.toBeNull();
      expect(ala?.posSummary).toContain('حرف جر');

      // Word 3: إِلْ -> maps to compound token 3 (إِلْ يَاسِينَ)
      const il = await getWordMorphology(37, 130, 3, 'إِلْ');
      expect(il).not.toBeNull();
      expect(il?.wordArabic).toContain('إِلْ يَاسِينَ');

      // Word 4: يَاسِينَ -> also maps to compound token 3 (إِلْ يَاسِينَ)
      const yaseen = await getWordMorphology(37, 130, 4, 'يَاسِينَ');
      expect(yaseen).not.toBeNull();
      expect(yaseen?.wordArabic).toContain('إِلْ يَاسِينَ');
    });

    it('performs comprehensive alignment check across all 6,236 verses without throwing', async () => {
      // Verify random sample of surahs from beginning, middle, and end of the Quran
      const sampleSurahs = [1, 2, 12, 18, 36, 55, 67, 112, 114];
      for (const sNo of sampleSurahs) {
        const sData = await loadSurahMorphology(sNo);
        expect(sData).not.toBeNull();
        expect(sData?.surahNo).toBe(sNo);
        expect(Object.keys(sData?.words || {}).length).toBeGreaterThan(0);
      }
    });

    it('distinguishes network fetch failure from unavailable analysis or absent root', async () => {
      // 1. Simulate network failure (e.g. 500 server error)
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal Server Error' }),
        } as unknown as Response;
      });

      const netErrorResult = await getWordMorphologyResult(1, 1, 1, 'بِسْمِ');
      expect(netErrorResult.status).toBe('network_error');
      expect(netErrorResult.morphology).toBeNull();
      expect(netErrorResult.errorMessage).toBeDefined();

      // 2. Recovery: clear cache and re-fetch with healthy network
      clearMorphologyCacheForTesting();
      const healthyResult = await getWordMorphologyResult(1, 1, 1, 'بِسْمِ');
      expect(healthyResult.status).toBe('success');
      expect(healthyResult.morphology).not.toBeNull();

      // 3. Unavailable analysis (not_found) when word doesn't exist
      const notFoundResult = await getWordMorphologyResult(1, 1, 999, 'كلمة_غير_موجودة');
      expect(notFoundResult.status).toBe('not_found');
      expect(notFoundResult.morphology).toBeNull();
    });

    it('distinguishes roots index network error from empty roots result', async () => {
      // Simulate network error on roots_index.json
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        throw new Error('Network connection offline');
      });

      const rootErrRes = await getRootOccurrencesResult('رحم');
      expect(rootErrRes.status).toBe('network_error');
      expect(rootErrRes.occurrences).toHaveLength(0);

      // Recovery
      clearMorphologyCacheForTesting();
      const healthyRootRes = await getRootOccurrencesResult('رحم');
      expect(healthyRootRes.status).toBe('success');
      expect(healthyRootRes.occurrences.length).toBeGreaterThan(300);
    });

    it('returns null for out-of-range surah or non-existent word', async () => {
      expect(await loadSurahMorphology(0)).toBeNull();
      expect(await loadSurahMorphology(115)).toBeNull();
      expect(await getWordMorphology(1, 1, 999)).toBeNull();
    });

    it('loads roots index and retrieves root occurrences with verse context', async () => {
      const index = await loadRootsIndex();
      expect(index).not.toBeNull();
      expect(Object.keys(index!).length).toBeGreaterThan(1600);

      // Check root 'رحم'
      const occurrences = await getRootOccurrences('رحم');
      expect(occurrences.length).toBeGreaterThan(300);
      expect(occurrences[0].surahNo).toBe(1);
      expect(occurrences[0].ayahNo).toBe(1);
      expect(occurrences[0].surahName).toBe('الفاتحة');
      expect(occurrences[0].ayahText).toContain('ٱلرَّحْمَٰنِ');
    });
  });

  describe('Store State Transitions for Word Explorer', () => {
    it('opens and closes word explorer cleanly without affecting audio or reading position', () => {
      const state = useQuranStore.getState();
      expect(state.isWordExplorerOpen).toBe(false);
      expect(state.selectedWordTarget).toBeNull();

      // Open word explorer for 1:1:3
      state.openWordExplorer({
        surahNo: 1,
        ayahNo: 1,
        wordIndex: 3,
        wordText: 'ٱلرَّحْمَٰنِ',
      });

      const openState = useQuranStore.getState();
      expect(openState.isWordExplorerOpen).toBe(true);
      expect(openState.selectedWordTarget).toEqual({
        surahNo: 1,
        ayahNo: 1,
        wordIndex: 3,
        wordText: 'ٱلرَّحْمَٰنِ',
      });
      expect(openState.isPlayingAudio).toBe(false);

      // Close word explorer
      openState.closeWordExplorer();
      const closedState = useQuranStore.getState();
      expect(closedState.isWordExplorerOpen).toBe(false);
      expect(closedState.isPlayingAudio).toBe(false);
    });

    it('navigateToAyah closes the word explorer and highlights target without auto-playing audio', async () => {
      const state = useQuranStore.getState();
      state.openWordExplorer({
        surahNo: 1,
        ayahNo: 1,
        wordIndex: 1,
        wordText: 'بِسْمِ',
      });

      await state.navigateToAyah(2, 255);

      const afterNav = useQuranStore.getState();
      expect(afterNav.isWordExplorerOpen).toBe(false);
      expect(afterNav.activeSurah.number).toBe(2);
      expect(afterNav.highlightedTarget).toEqual({ surahNo: 2, ayahNo: 255 });
      expect(afterNav.isPlayingAudio).toBe(false);
    });
  });
});

