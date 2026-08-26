import { dataUrl, isRemoteData } from '@/lib/data-base';
import type {
  EBookMetadata,
  TableOfContentsItem,
  BookChapterChunk,
  SectionParagraph,
} from "../book-types";

export interface EBookMetaResponse {
  meta: EBookMetadata;
  toc: TableOfContentsItem[];
}

export function toArabicDigits(num: number | string): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num).replace(/\d/g, (d) => arabicDigits[Number(d)]);
}

export function cleanTitleFallback(title: string): string {
  return title.replace(/^[\d\-_\.]+\s*/, "").trim();
}

/** First Arabic letter of a title (after light normalisation), used to pick
 *  the per-letter index file on HF. Mirrors build_books_catalogs.py. */
function normFirstLetter(id: string, title?: string): string {
  const src = (title || id || '').replace(/[\u064B-\u0652\u0670\u0640]/g, '');
  for (const ch of src) {
    if (ch >= '\u0600' && ch <= '\u06FF') return ch;
  }
  return '__';
}

/**
 * Dynamically fetch, clean, and shard any OpenITI classical book on-the-fly
 */
export async function loadOpenItiDynamicEBook(
  bookId: string,
  chunkCache: Map<string, BookChapterChunk>
): Promise<EBookMetaResponse | null> {
  const cleanId = bookId.replace(/^openiti-/, "");

  let bookItem: {
    title: string;
    sheikhName: string;
    pdfUrl: string;
    date?: string;
    century?: number;
    islamicArt?: string;
    description?: string;
  } | null = null;

  try {
    // Per-letter index → look up the book by id. We don't know the title
    // yet, so try the __ fallback (non-Arabic) first; then the letter
    // derived from the cleanId itself (often starts with the year digits
    // but OpenITI ids also embed the book slug).
    const firstLetter = normFirstLetter('', '');
    const url = isRemoteData()
      ? dataUrl(`data/books/catalogs/openiti/_index_${firstLetter}.json`)
      : '/data/ebooks/openiti_arabic_catalog.json';
    const res = await fetch(url);
    if (res.ok) {
      const list = await res.json();
      bookItem = list.find((b: { id: string }) => b.id === bookId || b.id === `openiti-${cleanId}`);
      if (!bookItem && isRemoteData()) {
        // OpenITI book ids start with the century code (e.g. JK007501, 0250Booker...).
        // We don't know the title, so scan the small fallback __ bucket.
        const fallback = await fetch(dataUrl('data/books/catalogs/openiti/_index__.json'));
        if (fallback.ok) {
          const list2 = await fallback.json();
          bookItem = list2.find((b: { id: string }) => b.id === bookId || b.id === `openiti-${cleanId}`);
        }
      }
    }
  } catch {}

  const rawGithubUrl = bookItem?.pdfUrl || `https://raw.githubusercontent.com/OpenITI/0025AH/master/data/${cleanId}`;

  try {
    const proxyUrl = `/api/openiti-text?url=${encodeURIComponent(rawGithubUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const rawText = await res.text();

    const headerEndIdx = rawText.indexOf("#META#Header#End#");
    const bodyText = headerEndIdx !== -1 ? rawText.slice(headerEndIdx + "#META#Header#End#".length) : rawText;

    const rawLines = bodyText.split("\n");
    const parsedChapters: BookChapterChunk[] = [];
    const tocItems: TableOfContentsItem[] = [];

    let currentChapterTitle = "مقدمة الكتاب";
    let currentParagraphs: SectionParagraph[] = [];
    let currentParagraph = "";
    let currentVol = 1;
    let currentPg = 1;
    let chapterStartPage = 1;
    let totalWordCounter = 0;

    const flushParagraph = () => {
      if (!currentParagraph.trim()) return;
      const text = currentParagraph.trim();
      currentParagraph = "";
      const isHadith = /^(\d+[\.\)\-]|حدثنا|أخبرنا|أنبأنا|روى|عن|سمعت|قال الإمام|أخرج)/.test(text);

      currentParagraphs.push({
        id: `p-${parsedChapters.length + 1}-${currentParagraphs.length + 1}`,
        text,
        isHadithSanad: isHadith,
        pageNumber: currentPg,
        volumeNumber: currentVol,
        volumePageBadge: `[ج ${toArabicDigits(currentVol)}، ص ${toArabicDigits(currentPg)}]`,
      });
    };

    const flushChapter = (newTitle: string) => {
      flushParagraph();
      if (currentParagraphs.length === 0) return;

      const chapterIdx = parsedChapters.length + 1;
      const wordCount = currentParagraphs.reduce((acc, p) => acc + (p.text ? p.text.split(/\s+/).length : 0), 0);
      totalWordCounter += wordCount;

      const cleanTitle = currentChapterTitle
        .replace(/^#+\s*\|*\s*/, "")
        .replace(/^\[\d+\]\s*/, "")
        .replace(/^\(\d+\)\s*/, "")
        .trim() || `الباب ${toArabicDigits(chapterIdx)}`;

      const chunk: BookChapterChunk = {
        bookId,
        chapterIndex: chapterIdx,
        title: cleanTitle,
        startPage: chapterStartPage,
        endPage: Math.max(chapterStartPage, currentPg),
        paragraphs: currentParagraphs,
        wordCount,
      };

      parsedChapters.push(chunk);
      chunkCache.set(`${bookId}:${chapterIdx}`, chunk);

      tocItems.push({
        id: `toc-${chapterIdx}`,
        title: cleanTitle,
        chapterIndex: chapterIdx,
        pageNumber: chapterStartPage,
        level: 1,
        volumeNumber: currentVol,
      });

      currentParagraphs = [];
      currentChapterTitle = newTitle;
      chapterStartPage = currentPg;
    };

    for (const rawLine of rawLines) {
      let line = rawLine.trim();
      if (!line || line.startsWith("#META#") || line.startsWith("######OpenITI#")) continue;

      const pageMatch = line.match(/^PageV(\d+)P(\d+)(.*)/i);
      if (pageMatch) {
        currentVol = parseInt(pageMatch[1], 10) || currentVol;
        currentPg = parseInt(pageMatch[2], 10) || currentPg + 1;
        const rest = pageMatch[3]?.trim();
        if (rest) line = rest;
        else continue;
      }

      const msMatch = line.match(/^ms(\d+)(.*)/i);
      if (msMatch) {
        currentPg = parseInt(msMatch[1], 10) || currentPg;
        const rest = msMatch[2]?.trim();
        if (rest) line = rest;
        else continue;
      }

      line = line.replace(/PageV\d+P\d+/g, "").replace(/ms\d+/g, "").replace(/\(¬\d+\)/g, "").trim();
      if (!line) continue;

      const isMajorHeading =
        line.startsWith("### |") ||
        line.startsWith("### ||") ||
        /^#?\s*(\[\d+\]|\(\d+\))?\s*(كتاب|باب|فصل|مقدمة|جزء|ترجمة|مسألة|ديوان|قصيدة|سورة|خطبة|ما ذكر في|البحر\s*:|قافية\s*:|وقال\s+|ومن كلام)/i.test(line);

      if (isMajorHeading && !line.includes("%")) {
        const headingClean = line.replace(/^###\s*\|+/, "").replace(/^#\s*/, "").replace(/\d+$/, "").trim();
        if (currentParagraphs.length >= 2 || currentParagraph.length > 0) {
          flushChapter(headingClean);
        } else {
          currentChapterTitle = headingClean;
        }
        continue;
      }

      if (line.includes("%~%") || line.includes("%")) {
        flushParagraph();
        let parts: string[] = [];
        if (line.includes("%~%")) parts = line.split("%~%");
        else parts = line.split("%");

        const cleanParts = parts.map((p) => p.trim()).filter(Boolean);
        const h1 = cleanParts[0]?.replace(/^#+\s*/, "").replace(/^~+\s*/, "").trim() || "";
        const h2 = cleanParts[1]?.replace(/\d+$/, "").trim() || "";

        if (h1 || h2) {
          currentParagraphs.push({
            id: `p-poem-${parsedChapters.length + 1}-${currentParagraphs.length + 1}`,
            isPoetry: true,
            hemistich1: h1,
            hemistich2: h2,
            text: `${h1} ... ${h2}`,
            pageNumber: currentPg,
            volumeNumber: currentVol,
            volumePageBadge: `[ج ${toArabicDigits(currentVol)}، ص ${toArabicDigits(currentPg)}]`,
          });
          continue;
        }
      }

      if (line.startsWith("# ") || line.startsWith("#")) {
        flushParagraph();
        currentParagraph = line.replace(/^#+\s*/, "").trim();
        continue;
      }

      if (line.startsWith("~~")) {
        const cont = line.replace(/^~+\s*/, "").trim();
        currentParagraph = currentParagraph ? `${currentParagraph} ${cont}` : cont;
        continue;
      }

      currentParagraph = currentParagraph ? `${currentParagraph} ${line}` : line;

      if (currentParagraphs.length >= 90) {
        flushChapter(`${cleanTitleFallback(bookItem?.title || "فصل")} (تابع)`);
      }
    }

    flushParagraph();
    if (currentParagraphs.length > 0) {
      flushChapter(currentChapterTitle);
    }

    const title = bookItem?.title || cleanId;
    const author = bookItem?.sheikhName || 'من علماء التراث الإسلامي';

    const meta: EBookMetadata = {
      id: bookId,
      title,
      author,
      authorDeath: bookItem?.date ? `ت ${toArabicDigits(bookItem.date)} هـ` : undefined,
      category: 'history',
      islamicArt: (bookItem?.islamicArt as import('../book-types').IslamicArtCategory) || 'general',
      century: bookItem?.century || 3,
      description: bookItem?.description || 'كتاب تراثي إسلامي معتمد من مكتبة OpenITI الرقمية',
      totalVolumes: currentVol || 1,
      totalPages: currentPg || 1,
      totalChapters: parsedChapters.length || 1,
      totalWords: totalWordCounter || 1000,
      hasFacsimilePdf: false,
      coverGradient: 'from-amber-950 via-stone-900 to-emerald-950',
      accentColor: '#d97706',
      language: 'ar',
      tags: ['تراث', 'openiti', 'نص حي'],
    };

    return { meta, toc: tocItems };
  } catch (err) {
    console.error(`[openiti-loader] Error loading dynamic OpenITI book ${bookId}:`, err);
    return null;
  }
}
