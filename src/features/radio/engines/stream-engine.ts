import type { MediaItem } from '@/lib/types';
import type {
  CategorizedStations,
  RadioCategory,
  ResolvedStreamInfo,
} from '../types';

export const PRIORITY_STATION_NAMES = [
  'إذاعة القرآن الكريم — السعودية',
  'إذاعة القرآن الكريم — الشارقة',
  'إذاعة القرآن الكريم — الكويت',
  'إذاعة دار السلام',
  'إذاعة الشيخ عبدالباسط عبدالصمد',
  'إذاعة الشيخ محمد صديق المنشاوي',
  'إذاعة الشيخ محمود خليل الحصري',
  'إذاعة الشيخ مشاري العفاسي',
  'إذاعة صحيح البخاري',
];

/**
 * Categorizes a list of radio stations into distinct thematic domains:
 * - national: Main national broadcasters and major general channels
 * - reciters: Dedicated channels for renowned reciters
 * - hadith: Hadith, Sunnah, Tafsir, Sirah, and Fiqh stations
 * - translations: Non-Arabic Quran translations and explanations
 */
export function categorizeRadioStations(stations: MediaItem[]): CategorizedStations {
  const national: MediaItem[] = [];
  const reciters: MediaItem[] = [];
  const hadith: MediaItem[] = [];
  const translations: MediaItem[] = [];

  for (const item of stations) {
    const title = item.title || '';
    const tags = item.tags || [];

    if (
      item.language !== 'ar' && item.language !== undefined && item.language !== '' && item.language !== null ||
      tags.includes('ترجمة') ||
      title.includes('ترجمة') ||
      title.includes('Translation')
    ) {
      translations.push(item);
    } else if (
      title.includes('البخاري') ||
      title.includes('مسلم') ||
      title.includes('رياض الصالحين') ||
      title.includes('تفسير') ||
      title.includes('السعدي') ||
      title.includes('السيرة') ||
      title.includes('الشمائل') ||
      title.includes('الفتاوى')
    ) {
      hadith.push(item);
    } else if (
      title.includes('السعودية') ||
      title.includes('الشارقة') ||
      title.includes('الكويت') ||
      title.includes('القاهرة') ||
      title.includes('دار السلام') ||
      title.includes('الأنصار') ||
      title.includes('السراج') ||
      title.includes('التراتيل') ||
      title.includes('تلاوات متنوعة') ||
      title.includes('سورة البقرة') ||
      title.includes('سورة الملك') ||
      title.includes('الرقية') ||
      title.includes('أذكار') ||
      title.includes('قصص الأنبياء')
    ) {
      national.push(item);
    } else {
      reciters.push(item);
    }
  }

  return { national, reciters, hadith, translations };
}

/**
 * Filters radio stations based on active category tab and search query.
 */
export function filterRadioStations(
  stations: MediaItem[],
  categorized: CategorizedStations,
  category: RadioCategory,
  searchQuery = ''
): MediaItem[] {
  let pool: MediaItem[] = [];

  if (category === 'all') pool = stations;
  else if (category === 'national') pool = categorized.national;
  else if (category === 'reciters') pool = categorized.reciters;
  else if (category === 'hadith') pool = categorized.hadith;
  else if (category === 'translations') pool = categorized.translations;
  else pool = stations;

  const q = searchQuery.trim().toLowerCase();
  if (!q) return pool;

  return pool.filter(
    (r) =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.sheikhName && r.sheikhName.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
  );
}

/**
 * Picks high-priority featured stations for the ribbon banner.
 */
export function getFeaturedRadios(stations: MediaItem[], limit = 8): MediaItem[] {
  return stations
    .filter((r) => PRIORITY_STATION_NAMES.some((p) => r.title && r.title.includes(p)))
    .slice(0, limit);
}

/**
 * Validates and extracts streaming protocol and metadata from an audio stream URL.
 */
export function resolveRadioStream(
  urlOrItem: string | { audioUrl?: string } | null | undefined
): ResolvedStreamInfo {
  const url =
    typeof urlOrItem === 'string'
      ? urlOrItem.trim()
      : typeof urlOrItem === 'object' && urlOrItem !== null && typeof urlOrItem.audioUrl === 'string'
      ? urlOrItem.audioUrl.trim()
      : '';

  if (!url) {
    return {
      url: '',
      isValid: false,
      protocol: 'unknown',
      isSecure: false,
    };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    return {
      url,
      isValid: false,
      protocol: 'unknown',
      isSecure: false,
    };
  }

  const isHttps = parsed.protocol === 'https:';
  const isHttp = parsed.protocol === 'http:';

  if (!isHttps && !isHttp) {
    return {
      url,
      isValid: false,
      protocol: 'unknown',
      isSecure: false,
    };
  }

  let mimeTypeHint: string | undefined;
  const pathname = parsed.pathname.toLowerCase();
  if (pathname.endsWith('.mp3')) {
    mimeTypeHint = 'audio/mpeg';
  } else if (pathname.endsWith('.aac')) {
    mimeTypeHint = 'audio/aac';
  } else if (pathname.endsWith('.ogg') || pathname.endsWith('.opus')) {
    mimeTypeHint = 'audio/ogg';
  } else if (pathname.endsWith('.m3u8')) {
    mimeTypeHint = 'application/x-mpegURL';
  }

  return {
    url,
    isValid: true,
    protocol: isHttps ? 'https' : 'http',
    isSecure: isHttps,
    mimeTypeHint,
  };
}

/**
 * Validates that an object satisfies the minimum requirements for a playable radio station.
 */
export function validateRadioStation(station: unknown): boolean {
  if (!station || typeof station !== 'object') return false;
  const candidate = station as Record<string, unknown>;

  const hasValidTitle =
    typeof candidate.title === 'string' && candidate.title.trim().length > 0;
  const hasValidUrl =
    typeof candidate.audioUrl === 'string' &&
    (candidate.audioUrl.startsWith('https://') || candidate.audioUrl.startsWith('http://'));

  return hasValidTitle && hasValidUrl;
}
