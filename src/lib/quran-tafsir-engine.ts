export interface TafsirOption {
  id: number;
  slug: string;
  name: string;
  author: string;
  description: string;
}

export type TafsirMeta = TafsirOption;

export const SUPPORTED_TAFSIRS: TafsirOption[] = [
  {
    id: 16,
    slug: 'muyassar',
    name: 'التفسير الميسر',
    author: 'نخبة من علماء التفسير (مجمع الملك فهد)',
    description: 'تفسير موجز وسهل ومحرر وفق منهج أهل السنة والجماعة، صادر عن مجمع الملك فهد.',
  },
  {
    id: 14,
    slug: 'saadi',
    name: 'تيسير الكريم الرحمن (السعدي)',
    author: 'الشيخ عبد الرحمن بن ناصر السعدي',
    description: 'من أحسن التفاسير وأوضحها وأيسرها عبارة، مع العناية بجانب المعتقد وتزكية القلوب.',
  },
  {
    id: 17,
    slug: 'ibn-kathir',
    name: 'تفسير القرآن العظيم (ابن كثير)',
    author: 'الإمام الحافظ ابن كثير الدمشقي',
    description: 'أشهر تفاسير المأثور، يعتني بتفسير القرآن بالقرآن وبالسنة والآثار وأقوال السلف.',
  },
  {
    id: 15,
    slug: 'baghawi',
    name: 'معالم التنزيل (البغوي)',
    author: 'الإمام الحسين بن مسعود البغوي',
    description: 'تفسير سلفي محرر متوسط الحجم، جامع للروايات الصحيحة بعيداً عن الغرائب.',
  },
  {
    id: 18,
    slug: 'qurtubi',
    name: 'الجامع لأحكام القرآن (القرطبي)',
    author: 'الإمام أبو عبد الله القرطبي',
    description: 'من أجمع كتب التفسير الفقهية وأشملها، مع الاستنباط واللغة والقراءات.',
  },
  {
    id: 13,
    slug: 'tabari',
    name: 'جامع البيان (الطبري)',
    author: 'الإمام أبو جعفر محمد بن جرير الطبري',
    description: 'أم كتب التفسير وأوسعها رواية ونقلاً لإجماع المفسرين من الصحابة والتابعين.',
  },
  {
    id: 93,
    slug: 'tantawi',
    name: 'التفسير الوسيط',
    author: 'فضيلة الدكتور محمد سيد طنطاوي',
    description: 'تفسير عصري موسع يجمع بين سلاسة الأسلوب والدقة البيانية واللغوية.',
  },
];

// In-memory cache for fetched tafsirs
const tafsirCache = new Map<string, string>();

/**
 * Zero-dependency robust HTML sanitizer for Tafsir text.
 * Strips all script, style, iframe, object, embed, svg, math, and unsafe tags/attributes to guarantee zero XSS.
 */
function cleanTafsirHtml(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Remove dangerous blocks and tags
  let sanitized = raw
    .replace(/<\s*(script|style|iframe|object|embed|link|svg|math|form|input|button|meta|base)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|svg|math|form|input|button|meta|base)\b[^>]*\/?\s*>/gi, '');

  // 2. Strip all inline event handlers (onerror, onload, onclick, on*, etc.) and javascript: or data: URIs
  sanitized = sanitized
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/(href|src)\s*=\s*(['"])(?:javascript|data|vbscript):.*?\2/gi, '');

  // 3. Keep only allowed tags: <p>, <span>, <b>, <i>, <strong>, <em>, <br>
  sanitized = sanitized.replace(/<\/?([a-z0-9]+)\b([^>]*)>/gi, (match, tag, attrs) => {
    const t = tag.toLowerCase();
    if (['p', 'span', 'b', 'i', 'strong', 'em', 'br'].includes(t)) {
      if (t === 'br') return '<br />';
      // Allow only safe class attributes
      const classMatch = attrs.match(/\bclass\s*=\s*(['"])(.*?)\1/i);
      const safeClass = classMatch ? ` class="${classMatch[2].replace(/[<>"']/g, '')}"` : '';
      return match.startsWith('</') ? `</${t}>` : `<${t}${safeClass}>`;
    }
    return ''; // Discard all other tags
  });

  // 4. Normalize styling classes
  return sanitized
    .replace(/<span class="arabic[^"]*">/gi, '<span class="text-primary font-bold font-amiri text-lg">')
    .replace(/<span class="green[^"]*">/gi, '<span class="text-emerald-600 font-bold">')
    .replace(/<span class="brown[^"]*">/gi, '<span class="text-amber-700 dark:text-amber-400 font-bold">')
    .replace(/<p[^>]*>/gi, '<p class="mb-3 leading-relaxed">')
    .trim();
}

/**
 * Fetches Tafsir text for a specific Surah & Ayah from QuranCDN
 */
export async function fetchAyahTafsir(
  tafsirId: number,
  surahNo: number,
  ayahNo: number
): Promise<{ text: string; tafsirName: string; author: string }> {
  const cacheKey = `${tafsirId}:${surahNo}:${ayahNo}`;
  const cached = tafsirCache.get(cacheKey);

  const tafsirInfo = SUPPORTED_TAFSIRS.find((t) => t.id === tafsirId) || SUPPORTED_TAFSIRS[0];

  if (cached) {
    return {
      text: cached,
      tafsirName: tafsirInfo.name,
      author: tafsirInfo.author,
    };
  }

  try {
    const url = `https://api.qurancdn.com/api/qdc/tafsirs/${tafsirId}/by_ayah/${surahNo}:${ayahNo}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NoorPlatform/2.0',
      },
      next: { revalidate: 86400 * 30 },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawHtml = data?.tafsir?.text || '';
    const cleanedText = cleanTafsirHtml(rawHtml);

    if (cleanedText) {
      tafsirCache.set(cacheKey, cleanedText);
    }

    return {
      text: cleanedText || 'لا يتوفر نص التفسير لهذه الآية حالياً.',
      tafsirName: tafsirInfo.name,
      author: tafsirInfo.author,
    };
  } catch (err) {
    console.warn(`[quran-tafsir-engine] Failed to fetch tafsir ${tafsirId} for ${surahNo}:${ayahNo}:`, err);
    return {
      text: 'تعذر جلب التفسير من الخادم. يرجى التأكد من اتصال الإنترنت.',
      tafsirName: tafsirInfo.name,
      author: tafsirInfo.author,
    };
  }
}
