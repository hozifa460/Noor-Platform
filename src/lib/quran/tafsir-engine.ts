import { sanitizeTafsirHtml } from '@/lib/shared/sanitize-html';

export interface TafsirOption {
  id: number;
  slug: string;
  name: string;
  author: string;
  description: string;
  hfFolder?: string;
}

export type TafsirMeta = TafsirOption;

export const SUPPORTED_TAFSIRS: TafsirOption[] = [
  {
    id: 16,
    slug: 'muyassar',
    name: 'التفسير الميسر',
    author: 'نخبة من علماء التفسير (مجمع الملك فهد)',
    description: 'تفسير موجز وسهل ومحرر وفق منهج أهل السنة والجماعة، صادر عن مجمع الملك فهد.',
    hfFolder: 'ar-tafsir-muyassar',
  },
  {
    id: 14,
    slug: 'saadi',
    name: 'تيسير الكريم الرحمن (السعدي)',
    author: 'الشيخ عبد الرحمن بن ناصر السعدي',
    description: 'من أحسن التفاسير وأوضحها وأيسرها عبارة، مع العناية بجانب المعتقد وتزكية القلوب.',
    hfFolder: 'ar-tafseer-al-saddi',
  },
  {
    id: 17,
    slug: 'ibn-kathir',
    name: 'تفسير القرآن العظيم (ابن كثير)',
    author: 'الإمام الحافظ ابن كثير الدمشقي',
    description: 'أشهر تفاسير المأثور، يعتني بتفسير القرآن بالقرآن وبالسنة والآثار وأقوال السلف.',
    hfFolder: 'ar-tafsir-ibn-kathir',
  },
  {
    id: 15,
    slug: 'baghawi',
    name: 'معالم التنزيل (البغوي)',
    author: 'الإمام الحسين بن مسعود البغوي',
    description: 'تفسير سلفي محرر متوسط الحجم، جامع للروايات الصحيحة بعيداً عن الغرائب.',
    hfFolder: 'ar-tafsir-al-baghawi',
  },
  {
    id: 18,
    slug: 'qurtubi',
    name: 'الجامع لأحكام القرآن (القرطبي)',
    author: 'الإمام أبو عبد الله القرطبي',
    description: 'من أجمع كتب التفسير الفقهية وأشملها، مع الاستنباط واللغة والقراءات.',
    hfFolder: 'ar-tafseer-al-qurtubi',
  },
  {
    id: 13,
    slug: 'tabari',
    name: 'جامع البيان (الطبري)',
    author: 'الإمام أبو جعفر محمد بن جرير الطبري',
    description: 'أم كتب التفسير وأوسعها رواية ونقلاً لإجماع المفسرين من الصحابة والتابعين.',
    hfFolder: 'ar-tafsir-al-tabari',
  },
  {
    id: 93,
    slug: 'tantawi',
    name: 'التفسير الوسيط',
    author: 'فضيلة الدكتور محمد سيد طنطاوي',
    description: 'تفسير عصري موسع يجمع بين سلاسة الأسلوب والدقة البيانية واللغوية.',
    hfFolder: 'ar-tafsir-al-wasit',
  },
  {
    id: 201,
    slug: 'tanweer',
    name: 'التحرير والتنوير (ابن عاشور)',
    author: 'الإمام محمد الطاهر بن عاشور',
    description: 'من أعظم تفاسير العصر الحديث، درة بيانية ولغوية ومقاصدية فريدة استغرقت عقوداً.',
    hfFolder: 'ar-tafseer-tahrir-al-tanwir',
  },
  {
    id: 202,
    slug: 'jalalayn',
    name: 'تفسير الجلالين',
    author: 'جلال الدين المحلي وجلال الدين السيوطي',
    description: 'تفسير وجيز متقن مشهور يضبط معاني الآيات وإعراب المشكل منها بعبارة دقيقة.',
    hfFolder: 'ar-tafsir-al-jalalayn',
  },
  {
    id: 203,
    slug: 'mukhtasar',
    name: 'المختصر في التفسير',
    author: 'مركز معاهد الاستشارات (نخبة من العلماء)',
    description: 'تفسير معاصر ميسر وواضح ومحرر الآيات غاية في الدقة والاختصار وسهولة القراءة.',
    hfFolder: 'ar-tafsir-al-mukhtasar',
  },
];

// In-memory cache for fetched tafsirs
const tafsirCache = new Map<string, string>();
const surahTafsirCache = new Map<string, Array<{ text?: string }>>();
const HF_TAFSIR_BASE = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/raw/main/quranset/tafsir_api';

/**
 * Robust HTML sanitizer for Tafsir text using DOMPurify.
 */
function cleanTafsirHtml(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const sanitized = sanitizeTafsirHtml(raw);
  return sanitized
    .replace(/<span class="arabic[^"]*">/gi, '<span class="text-primary font-bold font-amiri text-lg">')
    .replace(/<span class="green[^"]*">/gi, '<span class="text-emerald-600 font-bold">')
    .replace(/<span class="brown[^"]*">/gi, '<span class="text-amber-700 dark:text-amber-400 font-bold">')
    .replace(/<p[^>]*>/gi, '<p class="mb-3 leading-relaxed">')
    .trim();
}

/**
 * Fetches Tafsir text for a specific Surah & Ayah with multi-source fallback.
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

  // Strategy 1: High-Speed Hugging Face CDN (Full-surah cached in memory)
  if (tafsirInfo.hfFolder) {
    const surahCacheKey = `${tafsirInfo.hfFolder}:${surahNo}`;
    try {
      let surahData = surahTafsirCache.get(surahCacheKey);
      if (!surahData) {
        const hfUrl = `${HF_TAFSIR_BASE}/${tafsirInfo.hfFolder}/${surahNo}.json`;
        const hfRes = await fetch(hfUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'NoorPlatform/2.0',
          },
          next: { revalidate: 86400 * 30 },
        });

        if (hfRes.ok) {
          surahData = (await hfRes.json()) as Array<{ text?: string }>;
          if (Array.isArray(surahData)) {
            surahTafsirCache.set(surahCacheKey, surahData);
          }
        }
      }

      if (surahData && surahData[ayahNo - 1]?.text) {
        const rawHtml = surahData[ayahNo - 1].text || '';
        const cleanedText = cleanTafsirHtml(rawHtml);
        if (cleanedText) {
          tafsirCache.set(cacheKey, cleanedText);
          return {
            text: cleanedText,
            tafsirName: tafsirInfo.name,
            author: tafsirInfo.author,
          };
        }
      }
    } catch {
      // Fall through to QuranCDN fallback
    }
  }

  // Strategy 2: QuranCDN API fallback
  if (tafsirId <= 100) {
    try {
      const url = `https://api.qurancdn.com/api/qdc/tafsirs/${tafsirId}/by_ayah/${surahNo}:${ayahNo}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NoorPlatform/2.0',
        },
        next: { revalidate: 86400 * 30 },
      });

      if (res.ok) {
        const data = await res.json();
        const rawHtml = data?.tafsir?.text || '';
        const cleanedText = cleanTafsirHtml(rawHtml);

        if (cleanedText) {
          tafsirCache.set(cacheKey, cleanedText);
          return {
            text: cleanedText,
            tafsirName: tafsirInfo.name,
            author: tafsirInfo.author,
          };
        }
      }
    } catch (err) {
      console.warn(`[quran-tafsir-engine] Failed QuranCDN fallback for ${tafsirId}:`, err);
    }
  }

  return {
    text: 'تعذر جلب نص التفسير حالياً. يرجى التأكد من اتصال الإنترنت.',
    tafsirName: tafsirInfo.name,
    author: tafsirInfo.author,
  };
}
