import { describe, it, expect } from 'vitest';
import {
  BOOK_CATEGORIES,
  BOOK_LANGUAGES,
  QURANIC_MUS_HAFS,
  normBookTitle,
  firstLetterOf,
} from '../index';

describe('Books Feature Domain — Contract & Business Logic', () => {
  describe('Categories & Languages Taxonomy', () => {
    it('contains comprehensive Islamic art and knowledge categories', () => {
      expect(Array.isArray(BOOK_CATEGORIES)).toBe(true);
      expect(BOOK_CATEGORIES.length).toBeGreaterThanOrEqual(10);
      const catIds = BOOK_CATEGORIES.map((c) => c.id);
      expect(catIds).toContain('all');
      expect(catIds).toContain('quran');
      expect(catIds).toContain('sunnah');
      expect(catIds).toContain('fiqh');
      expect(catIds).toContain('history');
    });

    it('contains world languages for translation and multilingual reading', () => {
      expect(Array.isArray(BOOK_LANGUAGES)).toBe(true);
      expect(BOOK_LANGUAGES.length).toBeGreaterThanOrEqual(10);
      const langCodes = BOOK_LANGUAGES.map((l) => l.code);
      expect(langCodes).toContain('all');
      expect(langCodes).toContain('ar');
      expect(langCodes).toContain('en');
      expect(langCodes).toContain('fr');
      expect(langCodes).toContain('ur');
      expect(langCodes).toContain('id');
    });
  });

  describe('Digital Quranic Mushafs Catalog', () => {
    it('contains verified digital vector/PDF Quranic mushafs', () => {
      expect(Array.isArray(QURANIC_MUS_HAFS)).toBe(true);
      expect(QURANIC_MUS_HAFS.length).toBeGreaterThan(0);
      const first = QURANIC_MUS_HAFS[0];
      expect(first.title).toBeDefined();
      expect(first.pdfUrl).toBeDefined();
    });
  });

  describe('Book Text Catalog Utilities', () => {
    it('normalizes Arabic book titles for search indexing', () => {
      const title = 'صَحِيحُ البُخَارِيِّ - طبعة دَارِ طَوْقِ النَّجَاةِ';
      const norm = normBookTitle(title);
      expect(norm).toBeDefined();
      expect(norm).not.toContain('َ'); // Harakat stripped
      expect(norm).toContain('صحيح');
    });

    it('determines first Arabic letter bucket for letter indexing', () => {
      expect(firstLetterOf('البخاري')).toBe('ا');
      expect(firstLetterOf('تفسير الطبري')).toBe('ت');
      expect(firstLetterOf('فتح الباري')).toBe('ف');
    });
  });
});
