export interface EerabBook {
  id: string;
  name: string;
  author: string;
  description: string;
}

export const SUPPORTED_EERAB_BOOKS: EerabBook[] = [
  {
    id: 'i-rab-al-quran-li-al-darwish',
    name: 'إعراب القرآن وبيانه',
    author: 'الشيخ محيي الدين درويش',
    description: 'المرجع الأكبر والتحفة الإعرابية والبلاغية المفصلة لآيات القرآن الكريم مع الفوائد والشواهد.',
  },
  {
    id: 'al-jadwal-fi-i-rab-al-quran',
    name: 'الجدول في إعراب القرآن وصرفه',
    author: 'الشيخ محمود بن عبد الرحيم الصافي',
    description: 'إعراب دقيق مفردة بمفردة وجملة بجملة مع جداول التصريف والبيان القرآني.',
  },
  {
    id: 'al-i-rab-al-muyassar',
    name: 'الإعراب الميسر للقرآن',
    author: 'نخبة من أساتذة النحو واللغة',
    description: 'إعراب مبسط ومباشر ييسر فهم وجوه الإعراب الأساسية لعموم القراء والناشئة.',
  },
  {
    id: 'alrab-al-quran-li-da-as',
    name: 'إعراب القرآن الكريم',
    author: 'الشيخ أحمد عبيد الدعاس',
    description: 'إعراب موجز ومحرر يعتني ببيان مواضع الكلمات من الإعراب بأقصر عبارة.',
  },
];

interface AyahJsonItem {
  ayah?: number;
  text?: string;
}

// In-Memory Cache: `${bookId}:${surahNo}` -> Array of ayah items
const surahEerabCache = new Map<string, AyahJsonItem[]>();

const HF_BASE_URL = 'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/raw/main/quranset/tafsir_api';

/**
 * Normalizes and formats raw eerab text into structured HTML paragraphs.
 */
function formatEerabContent(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const lines = trimmed.split(/\r?\n+/);
  const formattedLines = lines.map((line) => {
    const l = line.trim();
    if (!l) return '';

    if (l.startsWith('الإعراب:') || l.startsWith('اللغة:') || l.startsWith('البلاغة:') || l.startsWith('الفوائد:') || l.startsWith('الصرف:')) {
      return `<h4 class="text-primary font-bold font-amiri text-lg mt-4 mb-2 pb-1 border-b border-border/60">${l}</h4>`;
    }

    return `<p class="mb-3 leading-loose text-foreground/90 font-amiri text-base sm:text-lg">${l}</p>`;
  });

  return formattedLines.filter(Boolean).join('');
}

/**
 * Fetches I'rab for a specific Surah & Ayah with full-surah caching.
 */
export async function fetchAyahEerab(
  bookId: string,
  surahNo: number,
  ayahNo: number
): Promise<{ text: string; bookName: string; author: string }> {
  const bookInfo = SUPPORTED_EERAB_BOOKS.find((b) => b.id === bookId) || SUPPORTED_EERAB_BOOKS[0];
  const cacheKey = `${bookInfo.id}:${surahNo}`;

  try {
    let surahData = surahEerabCache.get(cacheKey);

    if (!surahData) {
      const url = `${HF_BASE_URL}/${bookInfo.id}/${surahNo}.json`;
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

      surahData = (await res.json()) as AyahJsonItem[];
      if (Array.isArray(surahData)) {
        surahEerabCache.set(cacheKey, surahData);
      }
    }

    const ayahIndex = ayahNo - 1;
    const rawText = surahData && surahData[ayahIndex]?.text ? surahData[ayahIndex].text : '';

    return {
      text: formatEerabContent(rawText) || 'لا يتوفر نص الإعراب لهذه الآية في هذا الكتاب.',
      bookName: bookInfo.name,
      author: bookInfo.author,
    };
  } catch (err) {
    console.warn(`[quran-eerab-engine] Failed to fetch eerab ${bookInfo.id} for ${surahNo}:${ayahNo}:`, err);
    return {
      text: '<p class="text-muted-foreground">تعذر جلب نص الإعراب حالياً. يرجى التأكد من اتصال الإنترنت.</p>',
      bookName: bookInfo.name,
      author: bookInfo.author,
    };
  }
}
