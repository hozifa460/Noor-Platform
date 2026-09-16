import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  tokenizeAyahWords,
  normalizeArabicRoot,
} from '../domain';
import {
  loadSurahMorphology,
  getWordMorphology,
  loadRootsIndex,
  getRootOccurrences,
} from '../infrastructure';
import {
  useQuranStore,
  clearQuranMemoryCacheForTesting,
} from '../model';

describe('Quran Word Morphology & Root Explorer («استكشف الكلمة»)', () => {
  beforeEach(() => {
    clearQuranMemoryCacheForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Word Tokenizer (tokenizeAyahWords)', () => {
    it('tokenizes verses without waqf marks into sequential word indices', () => {
      const text = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
      const tokens = tokenizeAyahWords(text);

      expect(tokens).toHaveLength(4);
      expect(tokens.every((t) => t.type === 'word')).toBe(true);
      expect(tokens.map((t) => t.wordIndex)).toEqual([1, 2, 3, 4]);
      expect(tokens.map((t) => t.text)).toEqual(['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ']);
    });

    it('isolates standalone waqf marks and assigns wordIndex strictly to words', () => {
      // Surah 2:2 with two ۛ waqf marks
      const text = 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ';
      const tokens = tokenizeAyahWords(text);

      expect(tokens).toHaveLength(9); // 7 words + 2 waqf marks
      const wordTokens = tokens.filter((t) => t.type === 'word');
      const waqfTokens = tokens.filter((t) => t.type === 'waqf');

      expect(wordTokens).toHaveLength(7);
      expect(waqfTokens).toHaveLength(2);
      expect(wordTokens.map((t) => t.wordIndex)).toEqual([1, 2, 3, 4, 5, 6, 7]);

      // Reconstructed text must match original
      const reconstructed = tokens.map((t) => t.text).join(' ');
      expect(reconstructed).toBe(text);
    });

    it('handles empty or whitespace-only strings gracefully', () => {
      expect(tokenizeAyahWords('')).toEqual([]);
      expect(tokenizeAyahWords('   ')).toEqual([]);
    });
  });

  describe('Arabic Root Normalizer (normalizeArabicRoot)', () => {
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
      const bism = await getWordMorphology(1, 1, 1);
      expect(bism).not.toBeNull();
      expect(bism?.wordArabic).toBe('بِسْمِ');
      expect(bism?.root).toBe('سمو');
      expect(bism?.rootSpaced).toBe('س - م - و');
      expect(bism?.segments).toHaveLength(2);
      expect(bism?.segments[0].tagAr).toBe('حرف جر');
      expect(bism?.segments[1].tagAr).toBe('اسم');

      // Check 1:1:2 (ٱللَّهِ)
      const allah = await getWordMorphology(1, 1, 2);
      expect(allah?.root).toBe('اله');
      expect(allah?.segments[0].tagAr).toBe('اسم علم');

      // Check 1:1:3 (ٱلرَّحْمَٰنِ)
      const rahman = await getWordMorphology(1, 1, 3);
      expect(rahman?.root).toBe('رحم');
      expect(rahman?.segments[1].tagAr).toBe('صفة');
    });

    it('handles particles and words without roots clearly without guessing', async () => {
      // 1:5:1 (إِيَّاكَ) -> pronoun with no root in source
      const iyyaka = await getWordMorphology(1, 5, 1);
      expect(iyyaka).not.toBeNull();
      expect(iyyaka?.root).toBe('');
      expect(iyyaka?.rootSpaced).toBe('');
      expect(iyyaka?.segments[0].tagAr).toBe('ضمير متصل');
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
