import { describe, it, expect } from 'vitest';
import { pickPlayer } from '@/lib/shared';
import {
  BOOK_CATEGORIES,
  BOOK_LANGUAGES,
  QURANIC_MUS_HAFS,
  normBookTitle,
  firstLetterOf,
  FEATURED_ISLAMIC_CLASSICS,
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

  describe('Featured Heritage Classics & Repository ID Integrity', () => {
    it('contains all 10 curated Islamic heritage classics', () => {
      expect(Array.isArray(FEATURED_ISLAMIC_CLASSICS)).toBe(true);
      expect(FEATURED_ISLAMIC_CLASSICS).toHaveLength(10);
    });

    it('strictly maps Sahih al-Bukhari to authentic shamela-1458 (folder 01458) and NOT 1165 (وسطية الإسلام)', () => {
      const bukhari = FEATURED_ISLAMIC_CLASSICS.find((c) => c.title.includes('البخاري'));
      expect(bukhari).toBeDefined();
      expect(bukhari?.id).toBe('shamela-1458');
      expect(bukhari?.shamelaId).toBe(1458);
      expect(bukhari?.author).toContain('البخاري');
      expect(bukhari?.discipline).toBe('كتب السنة');
      expect(bukhari?.artTag).toBe('hadith');

      // Strict rejection of erroneous legacy ID 1165 ("وسطية الإسلام وسماحته")
      expect(bukhari?.id).not.toBe('shamela-1165');
      expect(bukhari?.shamelaId).not.toBe(1165);
      expect(bukhari?.description).not.toContain('وسطية الإسلام');
    });

    it('correctly maps all 9 Shamela classic cards to verified repository folder IDs and authentic titles', () => {
      const expectedMappings = [
        { id: 'shamela-1458', sid: 1458, folder: '01458', title: 'صحيح البخاري', author: 'البخاري' },
        { id: 'shamela-1481', sid: 1481, folder: '01481', title: 'صحيح مسلم', author: 'مسلم' },
        { id: 'shamela-2994', sid: 2994, folder: '02994', title: 'تفسير القرآن العظيم (ابن كثير)', author: 'ابن كثير' },
        { id: 'shamela-188', sid: 188, folder: '00188', title: 'زاد المعاد في هدي خير العباد', author: 'ابن قيم الجوزية' },
        { id: 'shamela-1618', sid: 1618, folder: '01618', title: 'المجموع شرح المهذب', author: 'النووي' },
        { id: 'shamela-2437', sid: 2437, folder: '02437', title: 'المغني في فقه الإمام أحمد', author: 'ابن قدامة' },
        { id: 'shamela-5479', sid: 5479, folder: '05479', title: 'العقيدة الواسطية', author: 'ابن تيمية' },
        { id: 'shamela-3974', sid: 3974, folder: '03974', title: 'سير أعلام النبلاء', author: 'الذهبي' },
        { id: 'shamela-1462', sid: 1462, folder: '01462', title: 'لسان العرب', author: 'ابن منظور' },
      ];

      for (const exp of expectedMappings) {
        const card = FEATURED_ISLAMIC_CLASSICS.find((c) => c.id === exp.id);
        expect(card, `Card ${exp.id} must exist`).toBeDefined();
        expect(card?.shamelaId).toBe(exp.sid);
        expect(card?.title).toBe(exp.title);
        expect(card?.author).toContain(exp.author);

        // Verify folder resolution logic matches repository structure (5-digit padded)
        const match = card?.id.match(/\d+/);
        const folder = match ? String(parseInt(match[0], 10)).padStart(5, '0') : '';
        expect(folder).toBe(exp.folder);
      }
    });

    it('contains the authentic Mushaf al-Madinah card for Quranic reading', () => {
      const quranCard = FEATURED_ISLAMIC_CLASSICS.find((c) => c.id === 'quran-hafs');
      expect(quranCard).toBeDefined();
      expect(quranCard?.title).toBe('مصحف المدينة النبوية');
      expect(quranCard?.artTag).toBe('quran');
    });
  });

  describe('Player Resolution & Media Classification (pickPlayer)', () => {
    it('correctly resolves shamela-2994 (Tafsir Ibn Kathir) to ebook player despite Quranic keywords', () => {
      const ibnKathirCard = FEATURED_ISLAMIC_CLASSICS.find((c) => c.id === 'shamela-2994');
      expect(ibnKathirCard).toBeDefined();

      const item = {
        id: ibnKathirCard!.id,
        title: ibnKathirCard!.title,
        sheikhName: ibnKathirCard!.author,
        section: 'books' as const,
        mediaType: 'shamela_archive',
        tags: ['شاملة', 'تراث', ibnKathirCard!.discipline, 'أمهات الكتب', 'قرآن كريم'],
      };

      expect(pickPlayer(item)).toBe('ebook');
    });

    it('strictly routes Quran mushafs (quran-hafs) to mushaf player', () => {
      const quranCard = FEATURED_ISLAMIC_CLASSICS.find((c) => c.id === 'quran-hafs');
      expect(quranCard).toBeDefined();

      const item = {
        id: quranCard!.id,
        title: quranCard!.title,
        sheikhName: quranCard!.author,
        section: 'books' as const,
        tags: ['مصحف', 'قرآن كريم', 'quran'],
      };

      expect(pickPlayer(item)).toBe('mushaf');

      const hafsCatalogItem = QURANIC_MUS_HAFS.find((m) => m.id === 'quran-hafs');
      expect(hafsCatalogItem).toBeDefined();
      expect(pickPlayer(hafsCatalogItem!)).toBe('mushaf');
    });

    it('routes all 9 Shamela featured classic cards to ebook player', () => {
      const shamelaCards = FEATURED_ISLAMIC_CLASSICS.filter((c) => c.id.startsWith('shamela-'));
      expect(shamelaCards).toHaveLength(9);

      for (const card of shamelaCards) {
        const item = {
          id: card.id,
          title: card.title,
          sheikhName: card.author,
          section: 'books' as const,
          mediaType: 'shamela_archive',
          tags: ['شاملة', 'تراث', card.discipline],
        };
        expect(pickPlayer(item), `Card ${card.id} (${card.title}) must resolve to ebook`).toBe('ebook');
      }
    });
  });
});

