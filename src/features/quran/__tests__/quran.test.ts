import { describe, it, expect } from 'vitest';
import {
  ALL_SURAHS,
  QIRAAT_LIST,
  QURAN_TRANSLATIONS,
  RECITERS,
  sanitizeTafsirHtml,
  getSurahMeta,
  getQiraahPdfUrl,
} from '../index';

describe('Quran Feature Domain — Contract & Business Logic', () => {
  describe('Surahs Catalog & Verification', () => {
    it('contains exactly 114 Surahs', () => {
      expect(Array.isArray(ALL_SURAHS)).toBe(true);
      expect(ALL_SURAHS.length).toBe(114);
    });

    it('validates Al-Fatiha as Surah #1 with 7 ayahs', () => {
      const fatiha = ALL_SURAHS[0];
      expect(fatiha.number).toBe(1);
      expect(fatiha.nameAr).toBe('الفاتحة');
      expect(fatiha.numberOfAyahs).toBe(7);
      expect(fatiha.revelationType).toBe('Meccan');
    });

    it('validates An-Nas as Surah #114 with 6 ayahs', () => {
      const nas = ALL_SURAHS[113];
      expect(nas.number).toBe(114);
      expect(nas.nameAr).toBe('الناس');
      expect(nas.numberOfAyahs).toBe(6);
    });

    it('getSurahMeta helper returns correct metadata by number', () => {
      const baqarah = getSurahMeta(2);
      expect(baqarah).toBeDefined();
      expect(baqarah?.nameAr).toBe('البقرة');
      expect(baqarah?.numberOfAyahs).toBe(286);
    });
  });

  describe('Ten Qiraat Recitations Metadata', () => {
    it('contains ten authentic Qiraat recitations', () => {
      expect(Array.isArray(QIRAAT_LIST)).toBe(true);
      expect(QIRAAT_LIST.length).toBeGreaterThanOrEqual(10);
    });

    it('contains Hafs and Warsh recitations', () => {
      const hafs = QIRAAT_LIST.find((q) => q.id === 'hafs');
      const warsh = QIRAAT_LIST.find((q) => q.id === 'warsh');
      expect(hafs).toBeDefined();
      expect(warsh).toBeDefined();
      expect(hafs?.featured).toBe(true);
    });

    it('getQiraahPdfUrl resolves correct huggingface pdf endpoint', () => {
      const url = getQiraahPdfUrl('hafs');
      expect(url).toContain('quran_shoaba_from_asem.pdf');
    });
  });

  describe('Translations & Reciters Catalogs', () => {
    it('contains major world language translations', () => {
      expect(Array.isArray(QURAN_TRANSLATIONS)).toBe(true);
      expect(QURAN_TRANSLATIONS.length).toBeGreaterThanOrEqual(4);
      const en = QURAN_TRANSLATIONS.find((t) => t.code === 'en-saheeh');
      expect(en).toBeDefined();
    });

    it('contains renowned reciters catalog', () => {
      expect(Array.isArray(RECITERS)).toBe(true);
      expect(RECITERS.length).toBeGreaterThanOrEqual(10);
      const minshawi = RECITERS.find((r) => r.id === 'minshawi_murattal');
      expect(minshawi).toBeDefined();
    });
  });

  describe('Tafsir HTML Sanitization', () => {
    it('sanitizes dangerous script tags from tafsir texts', () => {
      const dirty = '<div>تفسير الآية <script>alert("xss")</script> المباركة</div>';
      const clean = sanitizeTafsirHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('تفسير الآية');
    });

    it('preserves valid formatting tags in tafsir', () => {
      const formatted = '<p><strong>قال الإمام:</strong> هذا القول صحيح.</p>';
      const clean = sanitizeTafsirHtml(formatted);
      expect(clean).toContain('<strong>قال الإمام:</strong>');
    });
  });
});
