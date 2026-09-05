import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getRadioArtwork,
  SCHOLAR_PORTRAITS,
  THEMATIC_RADIO_ARTWORKS,
  categorizeRadioStations,
  filterRadioStations,
  getFeaturedRadios,
  resolveRadioStream,
  validateRadioStation,
  PRIORITY_STATION_NAMES,
  CATEGORY_TABS,
} from '../index';
import { getSheikhBadgeInfo } from '@/lib/shared';
import type { MediaItem } from '@/lib/types';
import type { RawRadioCatalog } from '../types';

describe('Radio Feature Domain — Contract & Business Logic', () => {
  // Load public/radio/islamic_radios.json fixture for deep dataset verification
  const catalogPath = path.resolve(process.cwd(), 'public/radio/islamic_radios.json');
  const catalogRaw = fs.readFileSync(catalogPath, 'utf-8');
  const catalog: RawRadioCatalog = JSON.parse(catalogRaw);

  describe('Radio Dataset & Catalog Integrity', () => {
    it('contains valid root metadata and emoji', () => {
      expect(catalog.id).toBe('islamic_radios');
      expect(typeof catalog.title).toBe('string');
      expect(catalog.title.trim().length).toBeGreaterThan(0);
      expect(catalog.emoji).toBe('📻');
      expect(Array.isArray(catalog.items)).toBe(true);
      expect(catalog.items.length).toBe(4);
    });

    it('contains >= 150 verified live radio stations across all categories', () => {
      let totalStations = 0;
      catalog.items.forEach((group) => {
        expect(Array.isArray(group.subItems)).toBe(true);
        expect(group.subItems.length).toBeGreaterThan(0);
        totalStations += group.subItems.length;
      });
      expect(totalStations).toBeGreaterThanOrEqual(150);
    });

    it('validates each station has non-empty title and valid http/https audioUrl', () => {
      let verifiedCount = 0;
      catalog.items.forEach((group) => {
        group.subItems.forEach((station) => {
          expect(typeof station.title).toBe('string');
          expect(station.title.trim().length).toBeGreaterThan(0);

          expect(typeof station.audioUrl).toBe('string');
          expect(
            station.audioUrl!.startsWith('http://') || station.audioUrl!.startsWith('https://')
          ).toBe(true);

          expect(validateRadioStation(station)).toBe(true);
          verifiedCount++;
        });
      });
      expect(verifiedCount).toBeGreaterThanOrEqual(150);
    });

    it('validates each station passes resolveRadioStream as a valid stream', () => {
      catalog.items.forEach((group) => {
        group.subItems.forEach((station) => {
          const info = resolveRadioStream(station.audioUrl);
          expect(info.isValid).toBe(true);
          expect(info.protocol === 'https' || info.protocol === 'http').toBe(true);
        });
      });
    });
  });

  describe('Stream Engine & Audio Resolution', () => {
    it('resolves valid HTTPS stream URL with secure flag', () => {
      const info = resolveRadioStream('https://stream.radiojar.com/0tpy1h0kxtzuv');
      expect(info.isValid).toBe(true);
      expect(info.protocol).toBe('https');
      expect(info.isSecure).toBe(true);
      expect(info.url).toBe('https://stream.radiojar.com/0tpy1h0kxtzuv');
    });

    it('resolves valid HTTP stream URL with isSecure false', () => {
      const info = resolveRadioStream('http://live.mp3.quran.com:8000/;');
      expect(info.isValid).toBe(true);
      expect(info.protocol).toBe('http');
      expect(info.isSecure).toBe(false);
    });

    it('infers audio MIME types from file extensions', () => {
      expect(resolveRadioStream('https://example.com/stream.mp3').mimeTypeHint).toBe('audio/mpeg');
      expect(resolveRadioStream('https://example.com/stream.aac').mimeTypeHint).toBe('audio/aac');
      expect(resolveRadioStream('https://example.com/stream.ogg').mimeTypeHint).toBe('audio/ogg');
      expect(resolveRadioStream('https://example.com/stream.m3u8').mimeTypeHint).toBe('application/x-mpegURL');
      expect(resolveRadioStream('https://example.com/stream/icecast').mimeTypeHint).toBeUndefined();
    });

    it('rejects invalid or unsupported protocols', () => {
      expect(resolveRadioStream('ftp://example.com/stream.mp3').isValid).toBe(false);
      expect(resolveRadioStream('javascript:alert(1)').isValid).toBe(false);
      expect(resolveRadioStream('data:audio/mp3;base64,...').isValid).toBe(false);
    });

    it('handles null, undefined, empty, and malformed URLs gracefully', () => {
      expect(resolveRadioStream(null).isValid).toBe(false);
      expect(resolveRadioStream(undefined).isValid).toBe(false);
      expect(resolveRadioStream('').isValid).toBe(false);
      expect(resolveRadioStream('   ').isValid).toBe(false);
      expect(resolveRadioStream('not-a-url').isValid).toBe(false);
    });

    it('accepts object with audioUrl property', () => {
      const info = resolveRadioStream({ audioUrl: 'https://stream.radiojar.com/test' });
      expect(info.isValid).toBe(true);
      expect(info.protocol).toBe('https');
    });

    it('validates validateRadioStation helper', () => {
      expect(validateRadioStation(null)).toBe(false);
      expect(validateRadioStation({})).toBe(false);
      expect(validateRadioStation({ title: '' })).toBe(false);
      expect(validateRadioStation({ title: 'Radio', audioUrl: 'ftp://bad' })).toBe(false);
      expect(validateRadioStation({ title: 'إذاعة القرآن', audioUrl: 'https://stream.com/live' })).toBe(true);
    });
  });

  describe('Station Categorization & Filtering', () => {
    const mockStations: MediaItem[] = [
      { id: '1', title: 'إذاعة القرآن الكريم — السعودية', section: 'radio' },
      { id: '2', title: 'إذاعة صحيح البخاري', section: 'radio' },
      { id: '3', title: 'إذاعة الشيخ عبدالباسط عبدالصمد', section: 'radio', sheikhName: 'عبدالباسط' },
      { id: '4', title: 'ترجمة معاني القرآن باللغة الإنجليزية', section: 'radio', language: 'en' },
      { id: '5', title: 'إذاعة سورة البقرة تلاوة متواصلة', section: 'radio' },
      { id: '6', title: 'إذاعة الشيخ محمد صديق المنشاوي', section: 'radio', sheikhName: 'المنشاوي' },
    ];

    it('categorizes stations into national, hadith, translations, reciters', () => {
      const categorized = categorizeRadioStations(mockStations);

      expect(categorized.national.some((s) => s.id === '1')).toBe(true);
      expect(categorized.national.some((s) => s.id === '5')).toBe(true);
      expect(categorized.hadith.some((s) => s.id === '2')).toBe(true);
      expect(categorized.translations.some((s) => s.id === '4')).toBe(true);
      expect(categorized.reciters.some((s) => s.id === '3')).toBe(true);
      expect(categorized.reciters.some((s) => s.id === '6')).toBe(true);
    });

    it('filters by category tab', () => {
      const categorized = categorizeRadioStations(mockStations);

      const all = filterRadioStations(mockStations, categorized, 'all');
      expect(all.length).toBe(mockStations.length);

      const national = filterRadioStations(mockStations, categorized, 'national');
      expect(national.length).toBe(2);

      const hadith = filterRadioStations(mockStations, categorized, 'hadith');
      expect(hadith.length).toBe(1);
      expect(hadith[0].id).toBe('2');

      const reciters = filterRadioStations(mockStations, categorized, 'reciters');
      expect(reciters.length).toBe(2);

      const translations = filterRadioStations(mockStations, categorized, 'translations');
      expect(translations.length).toBe(1);
      expect(translations[0].id).toBe('4');
    });

    it('filters by search query matching title or sheikhName', () => {
      const categorized = categorizeRadioStations(mockStations);

      const byTitle = filterRadioStations(mockStations, categorized, 'all', 'البخاري');
      expect(byTitle.length).toBe(1);
      expect(byTitle[0].id).toBe('2');

      const bySheikh = filterRadioStations(mockStations, categorized, 'all', 'المنشاوي');
      expect(bySheikh.length).toBe(1);
      expect(bySheikh[0].id).toBe('6');

      const noMatch = filterRadioStations(mockStations, categorized, 'all', 'كلمة_غير_موجودة');
      expect(noMatch.length).toBe(0);
    });

    it('retrieves featured stations according to priority names', () => {
      expect(PRIORITY_STATION_NAMES.length).toBeGreaterThanOrEqual(8);
      const featured = getFeaturedRadios(mockStations, 5);
      expect(featured.length).toBeGreaterThan(0);
      expect(featured.some((s) => s.title.includes('السعودية'))).toBe(true);
      expect(featured.some((s) => s.title.includes('عبدالباسط'))).toBe(true);
    });

    it('CATEGORY_TABS defines all 5 standard categories with emojis and icons', () => {
      expect(CATEGORY_TABS.length).toBe(5);
      const tabIds = CATEGORY_TABS.map((t) => t.id);
      expect(tabIds).toEqual(['all', 'national', 'reciters', 'hadith', 'translations']);
    });
  });

  describe('Visual Engine & Artwork Resolution', () => {
    it('defines authentic scholar portraits and thematic artworks mappings', () => {
      expect(Object.keys(SCHOLAR_PORTRAITS).length).toBeGreaterThan(15);
      expect(SCHOLAR_PORTRAITS['عبدالباسط']).toBe('/images/sheikhs/abdulbasit.png');
      expect(Object.keys(THEMATIC_RADIO_ARTWORKS).length).toBeGreaterThan(15);
      expect(THEMATIC_RADIO_ARTWORKS['البخاري']).toBe('/images/covers/eec795bf670e.jpg');
    });

    it('maps renowned reciters to verified photographic portraits', () => {
      expect(getRadioArtwork('إذاعة الشيخ عبدالباسط عبدالصمد')).toBe('/images/sheikhs/abdulbasit.png');
      expect(getRadioArtwork('إذاعة الشيخ محمد صديق المنشاوي')).toBe('/images/sheikhs/minshawi.jpg');
      expect(getRadioArtwork('إذاعة الشيخ محمود خليل الحصري')).toBe('/images/sheikhs/husary.jpg');
      expect(getRadioArtwork('إذاعة مشاري العفاسي')).toBe('/images/sheikhs/alafasy.jpg');
      expect(getRadioArtwork('إذاعة الشيخ عبدالرحمن السديس')).toBe('/images/sheikhs/sudais.jpg');
    });

    it('maps thematic stations to curated subject artworks', () => {
      expect(getRadioArtwork('إذاعة صحيح البخاري')).toBe('/images/covers/eec795bf670e.jpg');
      expect(getRadioArtwork('إذاعة القرآن الكريم — السعودية')).toBe('/images/covers/760299f9b153.jpg');
      expect(getRadioArtwork('إذاعة القرآن الكريم — الشارقة')).toBe('/images/covers/8bcc93091c33.jpg');
      expect(getRadioArtwork('إذاعة سورة البقرة')).toBe('/images/covers/ec19c2e44007.jpeg');
    });

    it('returns empty string fallback for stations without matched artwork', () => {
      expect(getRadioArtwork('إذاعة محطة غير معروفة تماما')).toBe('');
      expect(getRadioArtwork('')).toBe('');
    });

    it('generates consistent badge info with getSheikhBadgeInfo', () => {
      const badge1 = getSheikhBadgeInfo('إذاعة الشيخ عبدالباسط عبدالصمد');
      expect(badge1.displayName).toContain('عبدالباسط عبدالصمد');
      expect(badge1.initials.length).toBeGreaterThan(0);
      expect(typeof badge1.gradientClass).toBe('string');

      const badge2 = getSheikhBadgeInfo('إذاعة الشيخ عبدالباسط عبدالصمد');
      expect(badge2.gradientClass).toBe(badge1.gradientClass);
    });
  });
});
