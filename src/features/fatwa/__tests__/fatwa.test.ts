import { describe, it, expect } from 'vitest';
import {
  cleanFatwaText,
  scholarFilterQuery,
  FatwaIndexManager,
  fatwaIndexManager,
  FATWA_CATEGORIES,
  SCHOLARS_LIST,
  BUILTIN_SEED_FATWAS,
  SEED_FATWAS,
  shardHashForId,
  BROWSE_TOTALS,
  getCategoryCount,
  filterByScholar,
} from '../index';
import type { BrowseItem } from '../types';

describe('Fatwa Feature Domain — Contract & Business Logic', () => {
  describe('Seed Fatwas Integrity & Schema Validation', () => {
    it('contains >= 16 authentic builtin seed fatwas', () => {
      expect(Array.isArray(BUILTIN_SEED_FATWAS)).toBe(true);
      expect(BUILTIN_SEED_FATWAS.length).toBeGreaterThanOrEqual(16);
      expect(SEED_FATWAS).toBe(BUILTIN_SEED_FATWAS);
    });

    it('validates every seed fatwa has complete and valid schema', () => {
      const validCategoryIds = new Set(FATWA_CATEGORIES.map((c) => c.id));
      const seenIds = new Set<string>();

      BUILTIN_SEED_FATWAS.forEach((fatwa) => {
        expect(typeof fatwa.id).toBe('string');
        expect(fatwa.id.length).toBeGreaterThan(0);
        expect(seenIds.has(fatwa.id)).toBe(false);
        seenIds.add(fatwa.id);

        expect(typeof fatwa.title).toBe('string');
        expect(fatwa.title.trim().length).toBeGreaterThan(0);

        expect(typeof fatwa.question).toBe('string');
        expect(fatwa.question.trim().length).toBeGreaterThan(0);

        expect(typeof fatwa.scholar).toBe('string');
        expect(fatwa.scholar.trim().length).toBeGreaterThan(0);

        expect(typeof fatwa.category).toBe('string');
        expect(validCategoryIds.has(fatwa.category!)).toBe(true);

        expect(fatwa.hasAnswer).toBe(true);
        expect(typeof fatwa.answer).toBe('string');
        expect(fatwa.answer!.trim().length).toBeGreaterThan(0);

        expect(Array.isArray(fatwa.tags)).toBe(true);
        expect(fatwa.tags!.length).toBeGreaterThan(0);
      });
    });

    it('covers all major Islamic fiqh categories in seed data', () => {
      const representedCategories = new Set(BUILTIN_SEED_FATWAS.map((f) => f.category));
      expect(representedCategories.has('salah')).toBe(true);
      expect(representedCategories.has('zakah')).toBe(true);
      expect(representedCategories.has('aqeedah')).toBe(true);
      expect(representedCategories.has('family')).toBe(true);
      expect(representedCategories.has('muamalat')).toBe(true);
      expect(representedCategories.has('contemporary')).toBe(true);
    });
  });

  describe('Text Cleaning Engine (cleanFatwaText)', () => {
    it('removes Excel-escaped carriage returns (_x000D_)', () => {
      const dirty = 'السؤال الأول_x000D_وهل يجوز ذلك؟_x000D_';
      const cleaned = cleanFatwaText(dirty);
      expect(cleaned).not.toContain('_x000D_');
      expect(cleaned).toContain('السؤال الأول وهل يجوز ذلك؟');
    });

    it('removes stray carriage returns (\\r)', () => {
      const withCR = 'السطر الأول\r\nالسطر الثاني\r';
      const cleaned = cleanFatwaText(withCR);
      expect(cleaned).not.toContain('\r');
      expect(cleaned).toBe('السطر الأول\nالسطر الثاني');
    });

    it('collapses multiple horizontal spaces into a single space', () => {
      const spacing = 'حكم    صلاة     الجماعة   في المسجد';
      const cleaned = cleanFatwaText(spacing);
      expect(cleaned).toBe('حكم صلاة الجماعة في المسجد');
    });

    it('handles null, undefined, and empty string safely', () => {
      expect(cleanFatwaText(null)).toBe('');
      expect(cleanFatwaText(undefined)).toBe('');
      expect(cleanFatwaText('')).toBe('');
      expect(cleanFatwaText('   ')).toBe('');
    });
  });

  describe('Scholar Filter Engine (scholarFilterQuery)', () => {
    it('returns empty string for "all", null, undefined, or unknown IDs', () => {
      expect(scholarFilterQuery('all')).toBe('');
      expect(scholarFilterQuery('')).toBe('');
      expect(scholarFilterQuery('non_existent_scholar')).toBe('');
    });

    it('correctly maps known scholar IDs to normalized Arabic search queries', () => {
      expect(scholarFilterQuery('binbaz')).toContain('باز');
      expect(scholarFilterQuery('othaymeen')).toContain('عثيمين');
      expect(scholarFilterQuery('fawzan')).toContain('فوزان');
      expect(scholarFilterQuery('islamqa')).toContain('منجد');
      expect(scholarFilterQuery('dar_ifta')).toContain('افتا');
    });

    it('SCHOLARS_LIST contains valid definitions', () => {
      expect(SCHOLARS_LIST.length).toBeGreaterThanOrEqual(5);
      const allScholar = SCHOLARS_LIST.find((s) => s.id === 'all');
      expect(allScholar).toBeDefined();
      expect(allScholar?.query).toBe('');
    });
  });

  describe('Inverted Index & In-Memory Search Engine (FatwaIndexManager)', () => {
    it('merges items and eliminates duplicate IDs', () => {
      const manager = new FatwaIndexManager();
      manager.mergeItems(BUILTIN_SEED_FATWAS);
      const initialCount = manager.rawList.length;
      expect(initialCount).toBe(BUILTIN_SEED_FATWAS.length);

      // Re-merging duplicate items should not increase count
      manager.mergeItems(BUILTIN_SEED_FATWAS);
      expect(manager.rawList.length).toBe(initialCount);
    });

    it('returns all items up to limit when query is empty', () => {
      const manager = new FatwaIndexManager();
      manager.mergeItems(BUILTIN_SEED_FATWAS);
      const res = manager.searchIndex('', 'all', 'all', 5);
      expect(res.length).toBe(5);
    });

    it('finds fatwas by Arabic query matching title, question, or tags', () => {
      const manager = new FatwaIndexManager();
      manager.mergeItems(BUILTIN_SEED_FATWAS);

      const salahResults = manager.searchIndex('صلاة');
      expect(salahResults.length).toBeGreaterThan(0);
      expect(salahResults.some((f) => f.category === 'salah')).toBe(true);

      const zakahResults = manager.searchIndex('زكاة');
      expect(zakahResults.length).toBeGreaterThan(0);
      expect(zakahResults.some((f) => f.category === 'zakah')).toBe(true);
    });

    it('filters search results by category', () => {
      const manager = new FatwaIndexManager();
      manager.mergeItems(BUILTIN_SEED_FATWAS);

      const results = manager.searchIndex('', 'salah');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((f) => f.category === 'salah')).toBe(true);
    });

    it('filters search results by scholar', () => {
      const manager = new FatwaIndexManager();
      manager.mergeItems(BUILTIN_SEED_FATWAS);

      const binbazResults = manager.searchIndex('', 'all', 'binbaz');
      expect(binbazResults.length).toBeGreaterThan(0);
      expect(binbazResults.every((f) => f.scholar.includes('باز'))).toBe(true);
    });

    it('retrieves cached answer or fallback text', async () => {
      const manager = new FatwaIndexManager();
      const item = BUILTIN_SEED_FATWAS[0];
      const answer = await manager.getAnswer(item);
      expect(answer).toBe(item.answer);

      const fallback = await manager.getAnswer({
        id: 'no-answer',
        title: 'سؤال',
        question: 'سؤال؟',
        scholar: 'عالم',
        hasAnswer: false,
      });
      expect(fallback).toBe('لم يتوفر نص الإجابة.');
    });

    it('singleton fatwaIndexManager instance is ready to use', () => {
      expect(fatwaIndexManager).toBeInstanceOf(FatwaIndexManager);
    });
  });

  describe('Answer Shards Hash Keying (shardHashForId)', () => {
    it('produces an 8-character lowercase hexadecimal hash', async () => {
      const hash1 = await shardHashForId('fatwa-seed-salah-1');
      expect(hash1).toHaveLength(8);
      expect(/^[0-9a-f]{8}$/.test(hash1)).toBe(true);
    });

    it('produces deterministic output for the same ID', async () => {
      const hashA = await shardHashForId('binbaz-12345');
      const hashB = await shardHashForId('binbaz-12345');
      expect(hashA).toBe(hashB);
    });

    it('handles UTF-8 and Arabic strings correctly', async () => {
      const hashArabic = await shardHashForId('فتوى-صلاة-الجماعة');
      expect(hashArabic).toHaveLength(8);
      expect(/^[0-9a-f]{8}$/.test(hashArabic)).toBe(true);
    });
  });

  describe('Category Browse Engine & Real Manifest Totals', () => {
    it('defines authentic BROWSE_TOTALS for all 6 categories totaling 226,580', () => {
      expect(BROWSE_TOTALS.all).toBe(226_580);
      expect(BROWSE_TOTALS.salah).toBe(100_769);
      expect(BROWSE_TOTALS.zakah).toBe(33_555);
      expect(BROWSE_TOTALS.muamalat).toBe(19_543);
      expect(BROWSE_TOTALS.aqeedah).toBe(11_565);
      expect(BROWSE_TOTALS.family).toBe(15_098);
      expect(BROWSE_TOTALS.contemporary).toBe(46_050);
    });

    it('getCategoryCount returns correct count for known and fallback for unknown', () => {
      expect(getCategoryCount('salah')).toBe(100_769);
      expect(getCategoryCount('all')).toBe(226_580);
      expect(getCategoryCount('unknown_category')).toBe(0);
    });

    it('filterByScholar filters BrowseItem array by normalized scholar substring', () => {
      const mockItems: BrowseItem[] = [
        { id: '1', title: 'فتوى صلاة', scholar: 'الشيخ ابن باز', hasAudio: true },
        { id: '2', title: 'فتوى زكاة', scholar: 'الشيخ ابن عثيمين', hasAudio: false },
        { id: '3', title: 'فتوى حج', scholar: 'الشيخ صالح الفوزان', hasAudio: false },
      ];

      const filtered = filterByScholar(mockItems, 'باز');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');

      const unfiltered = filterByScholar(mockItems, '');
      expect(unfiltered.length).toBe(3);
    });
  });
});
