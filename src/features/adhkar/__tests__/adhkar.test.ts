import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getDhikrAudioUrl,
  getDhikrAudioMapping,
  searchAdhkar,
  QUICK_ADHKAR_TABS,
} from '../index';
import type { AdhkarCategory, DhikrAudioMapping } from '../types';

describe('Adhkar Feature Domain — Contract & Business Logic', () => {
  // Load local adhkar.json fixture for deep dataset verification
  const catalogPath = path.resolve(process.cwd(), 'public/data/adhkar/adhkar.json');
  const catalogRaw = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: AdhkarCategory[] = JSON.parse(catalogRaw);

  describe('Adhkar Dataset & Catalog Integrity (267 Authentic Dhikrs)', () => {
    it('contains exactly 132 authentic Adhkar categories', () => {
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBe(132);
    });

    it('contains exactly 267 authentic Dhikr items across all categories', () => {
      const totalDhikrs = catalog.reduce((acc, cat) => acc + (cat.array ? cat.array.length : 0), 0);
      expect(totalDhikrs).toBe(267);
    });

    it('validates each category has positive ID, non-empty name, and non-empty items array', () => {
      catalog.forEach((cat) => {
        expect(cat.id).toBeGreaterThan(0);
        expect(typeof cat.category).toBe('string');
        expect(cat.category.trim().length).toBeGreaterThan(0);
        expect(Array.isArray(cat.array)).toBe(true);
        expect(cat.array.length).toBeGreaterThan(0);
      });
    });

    it('validates each Dhikr item has non-empty Arabic text, positive count >= 1, and unique ID within category', () => {
      let verifiedCount = 0;
      catalog.forEach((cat) => {
        const itemIds = new Set<number>();
        cat.array.forEach((item) => {
          expect(item.id).toBeGreaterThan(0);
          expect(itemIds.has(item.id)).toBe(false);
          itemIds.add(item.id);

          expect(typeof item.text).toBe('string');
          expect(item.text.trim().length).toBeGreaterThan(0);

          expect(typeof item.count).toBe('number');
          expect(item.count).toBeGreaterThanOrEqual(1);
          verifiedCount++;
        });
      });
      expect(verifiedCount).toBe(267);
    });

    it('validates at least 260 dhikrs have audio recordings mapped', () => {
      let audioCount = 0;
      catalog.forEach((cat) => {
        cat.array.forEach((item) => {
          if (item.audio || item.filename) {
            audioCount++;
          }
        });
      });
      expect(audioCount).toBeGreaterThanOrEqual(260);
    });
  });

  describe('Audio URL Resolution & Mapping Contract (getDhikrAudioUrl & getDhikrAudioMapping)', () => {
    const CDN_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/raw/main/adhkarset/adhkar/audio';

    it('resolves standard relative audio path with /audio/ prefix', () => {
      const url = getDhikrAudioUrl('/audio/75.mp3');
      expect(url).toBe(`${CDN_BASE}/75.mp3`);
    });

    it('resolves audio path without leading slash', () => {
      const url = getDhikrAudioUrl('audio/1.mp3');
      expect(url).toBe(`${CDN_BASE}/1.mp3`);
    });

    it('resolves bare filename with .mp3 extension', () => {
      const url = getDhikrAudioUrl('42.mp3');
      expect(url).toBe(`${CDN_BASE}/42.mp3`);
    });

    it('resolves raw ID string without .mp3 extension', () => {
      const url = getDhikrAudioUrl('100');
      expect(url).toBe(`${CDN_BASE}/100.mp3`);
    });

    it('cleans and trims input with leading/trailing whitespace', () => {
      const url = getDhikrAudioUrl('  /audio/75.mp3  ');
      expect(url).toBe(`${CDN_BASE}/75.mp3`);
    });

    it('preserves absolute HTTP/HTTPS URLs without prepending base', () => {
      const absoluteUrl = 'https://custom-cdn.example.com/audio/adhkar/1.mp3';
      expect(getDhikrAudioUrl(absoluteUrl)).toBe(absoluteUrl);
    });

    it('returns empty string for empty, non-string, or missing inputs', () => {
      expect(getDhikrAudioUrl('')).toBe('');
      // @ts-expect-error test undefined input resilience
      expect(getDhikrAudioUrl(undefined)).toBe('');
      // @ts-expect-error test null input resilience
      expect(getDhikrAudioUrl(null)).toBe('');
      // @ts-expect-error test non-string input resilience
      expect(getDhikrAudioUrl(12345)).toBe('');
    });

    it('conforms to DhikrAudioMapping contract type via getDhikrAudioMapping helper', () => {
      const mapping: DhikrAudioMapping = getDhikrAudioMapping({
        id: 75,
        audio: '/audio/75.mp3',
        filename: '75.mp3',
      });
      expect(mapping.dhikrId).toBe(75);
      expect(mapping.rawAudio).toBe('/audio/75.mp3');
      expect(mapping.filename).toBe('75.mp3');
      expect(mapping.streamUrl).toBe(`${CDN_BASE}/75.mp3`);
    });
  });


  describe('Quick Filter Tabs & Category Filtering', () => {
    it('defines standard quick filter tabs with valid identifiers', () => {
      expect(QUICK_ADHKAR_TABS.length).toBeGreaterThanOrEqual(7);
      const tabIds = QUICK_ADHKAR_TABS.map((t) => t.id);
      expect(tabIds).toContain('all');
      expect(tabIds).toContain('morning_evening');
      expect(tabIds).toContain('sleep_waking');
      expect(tabIds).toContain('prayer');
      expect(tabIds).toContain('ruqyah_distress');
    });

    it('filters correctly to Category 1 for morning_evening tab', () => {
      const results = searchAdhkar(catalog, '', 'morning_evening', 'all');
      expect(results.length).toBe(1);
      expect(results[0].category.id).toBe(1);
      expect(results[0].category.category).toContain('الصباح والمساء');
      expect(results[0].items.length).toBeGreaterThan(0);
    });

    it('filters correctly to Categories 2 and 3 for sleep_waking tab', () => {
      const results = searchAdhkar(catalog, '', 'sleep_waking', 'all');
      expect(results.length).toBe(2);
      const catIds = results.map((r) => r.category.id);
      expect(catIds).toEqual([2, 3]);
    });

    it('filters by selectedCategoryId precisely', () => {
      const results = searchAdhkar(catalog, '', 'all', 5);
      expect(results.length).toBe(1);
      expect(results[0].category.id).toBe(5);
    });

    it('returns all 132 categories when selectedTabId is "all" and selectedCategoryId is "all"', () => {
      const results = searchAdhkar(catalog, '', 'all', 'all');
      expect(results.length).toBe(132);
    });
  });

  describe('Search Functionality & Arabic Normalization', () => {
    it('finds dhikr items by Arabic text keyword ("الكرسي")', () => {
      const results = searchAdhkar(catalog, 'الكرسي', 'all', 'all');
      expect(results.length).toBeGreaterThan(0);
    });

    it('finds specific dhikrs matching text content ("أصبحنا")', () => {
      const results = searchAdhkar(catalog, 'أصبحنا', 'all', 'all');
      expect(results.length).toBeGreaterThan(0);
      const allTexts = results.flatMap((r) => r.items.map((i) => i.text));
      expect(allTexts.some((t) => t.includes('أَصْبَحْنَا'))).toBe(true);
    });

    it('finds categories by category name ("الصباح")', () => {
      const results = searchAdhkar(catalog, 'الصباح', 'all', 'all');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.category.category.includes('الصباح'))).toBe(true);
    });

    it('normalizes Arabic diacritics and hamzas during search', () => {
      // Searching with plain letters vs with tashkeel
      const unvocalized = searchAdhkar(catalog, 'استغفر', 'all', 'all');
      const vocalized = searchAdhkar(catalog, 'أَسْتَغْفِرُ', 'all', 'all');

      expect(unvocalized.length).toBeGreaterThan(0);
      expect(vocalized.length).toBeGreaterThan(0);
    });

    it('returns empty array when search query matches nothing', () => {
      const results = searchAdhkar(catalog, 'كلمة_غير_موجودة_نهائيا_12345', 'all', 'all');
      expect(results).toEqual([]);
    });

    it('correctly scopes search query within a selected quick tab', () => {
      // Searching for "النوم" within morning_evening tab should not return sleep adhkar
      const results = searchAdhkar(catalog, 'النوم', 'morning_evening', 'all');
      results.forEach((r) => {
        expect(r.category.id).toBe(1);
      });
    });

    it('gracefully handles empty catalog array', () => {
      const results = searchAdhkar([], 'الله', 'all', 'all');
      expect(results).toEqual([]);
    });

    it('gracefully handles null or undefined catalog without throwing TypeError', () => {
      // @ts-expect-error test null catalog resilience
      expect(searchAdhkar(null, 'الله', 'all', 'all')).toEqual([]);
      // @ts-expect-error test undefined catalog resilience
      expect(searchAdhkar(undefined, 'الله', 'all', 'all')).toEqual([]);
    });

    it('supports numeric string category ID (e.g. "1") matching numeric category ID', () => {
      // @ts-expect-error test string category ID
      const results = searchAdhkar(catalog, '', 'all', '1');
      expect(results.length).toBe(1);
      expect(results[0].category.id).toBe(1);
    });

    it('gracefully handles categories with missing or empty array field', () => {
      const malformedCatalog = [
        { id: 999, category: 'باب تجريبي بدون أذكار' },
        { id: 1000, category: 'باب فارغ', array: [] },
      ] as unknown as AdhkarCategory[];
      const results = searchAdhkar(malformedCatalog, '', 'all', 'all');
      expect(results).toEqual([]);
    });

  });
});

