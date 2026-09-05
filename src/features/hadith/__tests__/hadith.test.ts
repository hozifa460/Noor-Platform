import { describe, it, expect } from 'vitest';
import {
  HADITH_BOOKS_LIST,
  GRADE_FILTER_OPTIONS,
  extractCleanMatn,
  parseHadithIsnad,
  isMuttafaqunAlayh,
  FAKE_HADITH_CATEGORIES,
  searchFakeHadiths,
} from '../index';

describe('Hadith Feature Domain — Contract & Business Logic', () => {
  describe('Canonical Hadith Books Catalog', () => {
    it('contains at least 17 primary Hadith compilations', () => {
      expect(Array.isArray(HADITH_BOOKS_LIST)).toBe(true);
      expect(HADITH_BOOKS_LIST.length).toBeGreaterThanOrEqual(17);
    });

    it('verifies Sahih al-Bukhari metadata and file reference', () => {
      const bukhari = HADITH_BOOKS_LIST.find((b) => b.id === 'bukhari');
      expect(bukhari).toBeDefined();
      expect(bukhari?.nameAr).toBe('صحيح البخاري');
      expect(bukhari?.fileName).toBe('bukhari.json');
      expect(bukhari?.category).toBe('sahih');
      expect(bukhari?.featured).toBe(true);
      expect(bukhari?.hadithCount).toBeGreaterThan(7000);
    });

    it('verifies Sahih Muslim metadata and file reference', () => {
      const muslim = HADITH_BOOKS_LIST.find((b) => b.id === 'muslim');
      expect(muslim).toBeDefined();
      expect(muslim?.nameAr).toBe('صحيح مسلم');
      expect(muslim?.fileName).toBe('muslim.json');
      expect(muslim?.category).toBe('sahih');
      expect(muslim?.featured).toBe(true);
    });

    it('contains the complete Kutub al-Sittah (Six Major Books)', () => {
      const bookIds = HADITH_BOOKS_LIST.map((b) => b.id);
      const sixBooks = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'];
      for (const id of sixBooks) {
        expect(bookIds).toContain(id);
      }
    });
  });

  describe('Grade Filter Options', () => {
    it('provides standard Hadith verification grades', () => {
      expect(Array.isArray(GRADE_FILTER_OPTIONS)).toBe(true);
      const gradeIds = GRADE_FILTER_OPTIONS.map((g) => g.id);
      expect(gradeIds).toContain('all');
      expect(gradeIds).toContain('muttafaqun');
      expect(gradeIds).toContain('sahih');
      expect(gradeIds).toContain('hasan');
      expect(gradeIds).toContain('daif');
      expect(gradeIds).toContain('mawdu');
    });
  });

  describe('Matn Extraction & Text Normalization', () => {
    it('extracts clean text without common sanad prefix verbs', () => {
      const text = 'حدثنا عبد الله بن يوسف قال حدثنا مالك عن نافع عن ابن عمر أن رسول الله صلى الله عليه وسلم قال إنما الأعمال بالنيات';
      const clean = extractCleanMatn(text);
      expect(clean).toContain('الاعمال بالنيات');
    });
  });

  describe('Isnad Chain Parser', () => {
    it('identifies sanad and parses narrator transitions', () => {
      const isnadText = 'حدثنا يحيى بن بكير حدثنا الليث عن عقيل عن ابن شهاب عن عروة عن عائشة رضي الله عنها أن رسول الله صلى الله عليه وسلم قال إنما الأعمال بالنيات';
      const parsed = parseHadithIsnad(isnadText);
      expect(parsed).toBeDefined();
      expect(parsed.hasSanad).toBe(true);
      expect(parsed.nodes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Grading Helpers', () => {
    it('correctly identifies Muttafaqun Alayh status', () => {
      expect(isMuttafaqunAlayh('bukhari', 1)).toBe(true);
      expect(isMuttafaqunAlayh('muslim', 1)).toBe(true);
      expect(isMuttafaqunAlayh('nawawi40', 1, 'متفق عليه')).toBe(true);
      expect(isMuttafaqunAlayh('abudawud', 1, 'حديث حسن')).toBe(false);
    });
  });

  describe('Fake Hadith Detection Engine', () => {
    it('contains fabricated hadith categories', () => {
      expect(Array.isArray(FAKE_HADITH_CATEGORIES)).toBe(true);
      expect(FAKE_HADITH_CATEGORIES.length).toBeGreaterThan(0);
    });

    it('searches known fabricated narrations', () => {
      const sampleCatalog = [
        {
          id: 1,
          title: 'حديث رجب',
          fakeText: 'رجب شهر الله',
          scholarRuling: 'مكذوب وموضوع',
          reference: 'الألباني',
          degree: 'موضوع',
          source: 'الدرر السنية',
          category: 'fasting_ramadan' as const,
        },
      ];
      const results = searchFakeHadiths(sampleCatalog, 'رجب');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
    });
  });
});
