export interface TafsirMeta {
  id: number;
  slug: string;
  name: string;
  author: string;
  description: string;
}

export const SUPPORTED_TAFSIRS: TafsirMeta[] = [
  {
    id: 16,
    slug: 'muyassar',
    name: 'التفسير الميسر',
    author: 'مجمع الملك فهد لطباعة المصحف الشريف',
    description: 'تفسير واضح وموجز صادر عن نخبة من علماء التفسير بمجمع الملك فهد بالمدينة المنورة.',
  },
  {
    id: 91,
    slug: 'saadi',
    name: 'تفسير السعدي (تيسير الكريم الرحمن)',
    author: 'الشيخ عبد الرحمن بن ناصر السعدي',
    description: 'تفسير ميسر بعبارة واضحة وسهلة مع التركيز على مقاصد الآيات والهدايات الإيمانية.',
  },
  {
    id: 14,
    slug: 'ibnkathir',
    name: 'تفسير ابن كثير (تفسير القرآن العظيم)',
    author: 'الحافظ عماد الدين ابن كثير',
    description: 'عمدة كتب التفسير بالمأثور، يفسر القرآن بالقرآن وبالسنة النبوية وآثار السلف.',
  },
  {
    id: 94,
    slug: 'baghawi',
    name: 'تفسير البغوي (معالم التنزيل)',
    author: 'الإمام الحسين بن مسعود البغوي',
    description: 'من أجل كتب التفسير بالمأثور الخالية من البدع والإسرائيليات المنكرة.',
  },
  {
    id: 90,
    slug: 'qurtubi',
    name: 'تفسير القرطبي (الجامع لأحكام القرآن)',
    author: 'الإمام أبو عبد الله القرطبي',
    description: 'المرجع الأكبر في استنباط الأحكام الفقهية وتفسير آيات الأحكام.',
  },
  {
    id: 15,
    slug: 'tabari',
    name: 'تفسير الطبري (جامع البيان)',
    author: 'الإمام محمد بن جرير الطبري (إمام المفسرين)',
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
 * Strips unwanted markup or normalizes HTML tags from tafsir API responses
 */
function cleanTafsirHtml(html: string): string {
  if (!html) return '';
  return html
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
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const rawText = data?.tafsir?.text || '';
    const cleaned = cleanTafsirHtml(rawText);

    tafsirCache.set(cacheKey, cleaned);
    return {
      text: cleaned,
      tafsirName: tafsirInfo.name,
      author: tafsirInfo.author,
    };
  } catch (err) {
    console.warn(`Failed to fetch tafsir ${tafsirId} for ${surahNo}:${ayahNo}:`, err);
    return {
      text: 'تعذر جلب التفسير من الخادم حالياً. يرجى التأكد من اتصال الإنترنت أو اختيار تفسير آخر.',
      tafsirName: tafsirInfo.name,
      author: tafsirInfo.author,
    };
  }
}
