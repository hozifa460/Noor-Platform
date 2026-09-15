import { normalizeArabic } from '@/lib/arabic';
import type { MediaItem } from '@/lib/types';
import { RAW_AUTHORS, type AuthorKnowledge } from '@/data/books/authors-knowledge';
import { RAW_ALIASES, type BookAliasKnowledge } from '@/data/books/aliases-knowledge';
import { MADHHAB_KEYWORDS, DISCIPLINE_KEYWORDS } from '@/data/books/madhhabs-taxonomy';

export type { AuthorKnowledge, BookAliasKnowledge };
export { RAW_AUTHORS, RAW_ALIASES, MADHHAB_KEYWORDS, DISCIPLINE_KEYWORDS };

export interface IntentMatchResult {
  book: MediaItem;
  score: number;
  matchReason?: string;
  matchedAuthor?: string;
  matchedCategory?: string;
  matchedAlias?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Classical Islamic Authors Knowledge Base (150+ Canonical Aliases & Titles)
// ─────────────────────────────────────────────────────────────────────────────
export const CLASSICAL_AUTHORS_KB: AuthorKnowledge[] = RAW_AUTHORS.map((a) => ({
  ...a,
  normAliases: a.aliases.map(normalizeArabic),
}));

// ─────────────────────────────────────────────────────────────────────────────
// 2. Classical Book Nicknames & Famous Aliases
// ─────────────────────────────────────────────────────────────────────────────
export const BOOK_ALIASES_KB: BookAliasKnowledge[] = RAW_ALIASES.map((a) => ({
  ...a,
  normQuery: normalizeArabic(a.aliasQuery),
  normTargetTitles: a.targetTitles.map(normalizeArabic),
  normTargetAuthor: a.targetAuthor ? normalizeArabic(a.targetAuthor) : undefined,
}));

// ─────────────────────────────────────────────────────────────────────────────
// 3. Disciplines, Madhhabs, and Topic Keywords Mapping
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 4. Intent Extraction & Fast Multi-Tier Scoring
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Non-distinctive Arabic connectors & prepositions
// (Note: 'بن' and 'أبي' and 'ابن' and 'أبو' are strictly EXCLUDED to protect author names/patronymics)
// ─────────────────────────────────────────────────────────────────────────────
export const CONNECTOR_STOPWORDS = new Set([
  'في', 'من', 'على', 'عن', 'الي', 'الى', 'مع', 'ثم', 'او', 'ام',
  'ما', 'لا', 'هل', 'هو', 'هي', 'هم', 'هن', 'ذا', 'ذو', 'ذي',
  'ذلك', 'تلك', 'هذا', 'هذه', 'الذي', 'التي', 'الذين', 'اللاتي'
]);

function checkTokenAtBoundary(target: string, tok: string): boolean {
  let idx = target.indexOf(tok);
  if (idx === -1) return false;
  const tokLen = tok.length;
  const targetLen = target.length;

  while (idx !== -1) {
    const prevChar = idx === 0 ? ' ' : target[idx - 1];
    const nextIdx = idx + tokLen;
    const nextChar = nextIdx === targetLen ? ' ' : target[nextIdx];

    if (prevChar === ' ' && nextChar === ' ') {
      return true;
    }
    if (nextChar === ' ') {
      // Check prefix 'ال'
      if (idx >= 2 && target[idx - 2] === 'ا' && target[idx - 1] === 'ل' && (idx === 2 || target[idx - 3] === ' ')) {
        return true;
      }
      // Check prefix 'و', 'ب', 'ف', 'ك', 'ل'
      if (idx >= 1 && (prevChar === 'و' || prevChar === 'ب' || prevChar === 'ف' || prevChar === 'ك' || prevChar === 'ل') && (idx === 1 || target[idx - 2] === ' ')) {
        return true;
      }
      // Check prefix 'وال'
      if (idx >= 3 && target[idx - 3] === 'و' && target[idx - 2] === 'ا' && target[idx - 1] === 'ل' && (idx === 3 || target[idx - 4] === ' ')) {
        return true;
      }
    }
    idx = target.indexOf(tok, idx + 1);
  }
  return false;
}

/**
 * Fast word-boundary aware matcher that checks if `tok` appears as a distinct word
 * or with standard Arabic prefixes (ال، و، ب، ف، ك، ل، وال) in `target`.
 * Optimized single-pass substring search with fast length exit.
 */
export function wordMatchesInTokens(target: string, tok: string, strippedAl?: string): boolean {
  if (!target || !tok) return false;
  if (target.length >= tok.length && checkTokenAtBoundary(target, tok)) {
    return true;
  }
  const al = strippedAl !== undefined ? strippedAl : (tok.startsWith('ال') && tok.length >= 5 ? tok.slice(2) : undefined);
  if (al !== undefined && target.length >= al.length) {
    return checkTokenAtBoundary(target, al);
  }
  return false;
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. Intent Extraction & Fast Multi-Tier Scoring
// ─────────────────────────────────────────────────────────────────────────────
export interface ParsedSearchIntent {
  rawQuery: string;
  normQuery: string;
  tokens: string[];
  meaningfulTokens: string[];
  matchedAuthor?: AuthorKnowledge;
  matchedAlias?: BookAliasKnowledge;
  matchedMadhhab?: { categoryId: number; name: string; tag: string };
  matchedDisciplines: Array<{ categoryId?: number; art: string; label: string }>;
  topicTokens: string[];
  nonMadhhabTokens: string[];
}

const RAW_PREPOSITIONS = new Set(['على', 'إلى', 'الى', 'في', 'من', 'عن', 'مع', 'حتى']);

export function parseSearchIntent(query: string): ParsedSearchIntent {
  const rawTokens = query.trim().split(/\s+/).filter(Boolean);
  const normQuery = normalizeArabic(query).trim();
  const tokens = normQuery.split(/\s+/).filter(Boolean);
  const meaningfulTokens = tokens.filter((t, i) => {
    if (CONNECTOR_STOPWORDS.has(t)) return false;
    if (i < rawTokens.length && RAW_PREPOSITIONS.has(rawTokens[i])) return false;
    return t.length > 1;
  });

  let matchedAuthor: AuthorKnowledge | undefined;
  let matchedAlias: BookAliasKnowledge | undefined;
  let matchedMadhhab: { categoryId: number; name: string; tag: string } | undefined;
  const matchedDisciplines: Array<{ categoryId?: number; art: string; label: string }> = [];
  const topicTokens: string[] = [];

  // 1. Check direct book alias (O(1) iterations over small array)
  for (let i = 0; i < BOOK_ALIASES_KB.length; i++) {
    const alias = BOOK_ALIASES_KB[i];
    if (
      normQuery === alias.normQuery ||
      normQuery.includes(alias.normQuery) ||
      (normQuery.length >= 6 && alias.normQuery.includes(normQuery))
    ) {
      matchedAlias = alias;
      break;
    }
  }

  // 2. Check author intent
  for (let i = 0; i < CLASSICAL_AUTHORS_KB.length; i++) {
    const auth = CLASSICAL_AUTHORS_KB[i];
    for (let j = 0; j < auth.normAliases.length; j++) {
      const alias = auth.normAliases[j];
      if (normQuery === alias || normQuery.includes(alias)) {
        matchedAuthor = auth;
        break;
      }
    }
    if (matchedAuthor) break;
  }

  // 3. Check madhhab intent
  for (const [key, val] of Object.entries(MADHHAB_KEYWORDS)) {
    if (normQuery.includes(normalizeArabic(key))) {
      matchedMadhhab = val;
      break;
    }
  }

  // 4. Check discipline & topic tokens
  const activeTokens = meaningfulTokens.length > 0 ? meaningfulTokens : tokens;
  for (let i = 0; i < activeTokens.length; i++) {
    const tok = activeTokens[i];
    let isDiscipline = false;
    for (const [key, val] of Object.entries(DISCIPLINE_KEYWORDS)) {
      if (tok === normalizeArabic(key) || tok.includes(normalizeArabic(key))) {
        if (!matchedDisciplines.some((d) => d.label === val.label)) {
          matchedDisciplines.push(val);
        }
        isDiscipline = true;
      }
    }
    if (!isDiscipline && tok.length >= 3) {
      topicTokens.push(tok);
    }
  }

  // 5. Compute non-madhhab tokens (tokens not accounting for madhhab, discipline, or generic keywords)
  const nonMadhhabTokens: string[] = [];
  if (matchedMadhhab) {
    const normMadhhab = normalizeArabic(matchedMadhhab.name);
    for (let i = 0; i < activeTokens.length; i++) {
      const tok = activeTokens[i];
      const isMadhhabTok =
        tok === normMadhhab ||
        tok.includes(normMadhhab) ||
        normMadhhab.includes(tok) ||
        Object.keys(MADHHAB_KEYWORDS).some(
          (k) => tok === normalizeArabic(k) || tok.includes(normalizeArabic(k))
        );
      const isDiscTok =
        matchedDisciplines.some((d) => tok.includes(normalizeArabic(d.label))) ||
        Object.keys(DISCIPLINE_KEYWORDS).some(
          (k) => tok === normalizeArabic(k) || tok.includes(normalizeArabic(k))
        );
      const isGeneric = tok === 'كتب' || tok === 'مذهب' || tok === 'المذهب';
      if (!isMadhhabTok && !isDiscTok && !isGeneric) {
        nonMadhhabTokens.push(tok);
      }
    }
  }

  return {
    rawQuery: query,
    normQuery,
    tokens,
    meaningfulTokens,
    matchedAuthor,
    matchedAlias,
    matchedMadhhab,
    matchedDisciplines,
    topicTokens,
    nonMadhhabTokens,
  };
}

/**
 * Ultra High-Speed High-Precision Intent Search over all books.
 * Precision architecture:
 * - Tier 1: Exact full title equality (score: +10000)
 * - Tier 2: Title + Author combination (score: +6000)
 * - Tier 3: Strict title prefix match (score: +5000)
 * - Tier 4: Exact phrase substring in title (score: +3000 + coverage)
 * - Tier 5: Canonical book alias match (score: +4000)
 * - Tier 6: Author direct/canonical intent match (score: +3000..+3500)
 * - Tier 7: Multi-token intersection with word boundary awareness (score: +350..+1000)
 * - Disciplines & Madhhabs are strictly BOOSTERS and never standalone qualifiers.
 */
export function searchBooksWithIntent(
  books: MediaItem[],
  query: string,
  selectedCategory: string = 'all',
  selectedLanguage: string = 'all'
): IntentMatchResult[] {
  const q = query.trim();
  if (!q) {
    return books.map((b) => ({ book: b, score: 1 }));
  }

  const intent = parseSearchIntent(q);
  const normQuery = intent.normQuery;

  // Empty or sub-minimal queries (< 2 characters) yield no results
  if (!normQuery || normQuery.length < 2) {
    return [];
  }

  // Preposition isolation guard: searching a single preposition returns empty array
  const rawQ = q.trim();
  if (
    rawQ === 'على' ||
    rawQ === 'في' ||
    rawQ === 'من' ||
    rawQ === 'عن' ||
    rawQ === 'إلى' ||
    rawQ === 'الى'
  ) {
    return [];
  }

  // Pure connector stop-words alone yield no results
  if (intent.meaningfulTokens.length === 0 && intent.tokens.length > 0) {
    return [];
  }

  const activeTokens = intent.meaningfulTokens.length > 0 ? intent.meaningfulTokens : intent.tokens;
  const tokenLen = activeTokens.length;

  interface PreparedToken {
    tok: string;
    strippedAl?: string;
  }

  const prepTokens: PreparedToken[] = [];
  for (let j = 0; j < tokenLen; j++) {
    const t = activeTokens[j];
    prepTokens.push({
      tok: t,
      strippedAl: t.startsWith('ال') && t.length >= 5 ? t.slice(2) : undefined,
    });
  }

  // Sort longest token first: in Arabic, longer tokens are content-distinctive (e.g. 'الجهمية' before 'الرد'),
  // allowing fast early-break for 98%+ of non-matching catalog items.
  prepTokens.sort((a, b) => b.tok.length - a.tok.length);

  const matchedAlias = intent.matchedAlias;
  const aliasTitles = matchedAlias?.normTargetTitles;
  const aliasAuthor = matchedAlias?.normTargetAuthor;
  const matchedAuthor = intent.matchedAuthor;
  const authorAliases = matchedAuthor?.normAliases;
  const authorCanonical = matchedAuthor?.canonicalName;
  const authorDeath = matchedAuthor?.deathHijri;
  const topicTokens = intent.topicTokens;
  const topicTokenLen = topicTokens.length;

  const prepTopics: PreparedToken[] = [];
  for (let j = 0; j < topicTokenLen; j++) {
    const t = topicTokens[j];
    prepTopics.push({
      tok: t,
      strippedAl: t.startsWith('ال') && t.length >= 5 ? t.slice(2) : undefined,
    });
  }

  const matchedMadhhab = intent.matchedMadhhab;
  const madhhabCatId = matchedMadhhab?.categoryId;
  const madhhabTag = matchedMadhhab?.tag;
  const nonMadhhabTokens = intent.nonMadhhabTokens;
  const matchedDisciplines = intent.matchedDisciplines;
  const discLen = matchedDisciplines.length;

  const results: IntentMatchResult[] = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i] as unknown as MediaItem & {
      language?: string;
      tags?: string[];
      matchReason?: string;
      shamelaPath?: string;
      _normTitle?: string;
      _normAuthor?: string;
    };

    // 1. Language Filter
    if (selectedLanguage !== 'all' && book.language && book.language !== selectedLanguage) {
      continue;
    }

    // 2. Category Filter
    if (selectedCategory !== 'all' && selectedCategory !== 'shamela') {
      const tags = book.tags;
      if (selectedCategory === 'quran' && book.islamicArt !== 'quran' && !tags?.some((t: string) => t.includes('quran') || t.includes('مصحف'))) continue;
      if (selectedCategory === 'sunnah' && book.islamicArt !== 'hadith' && !tags?.some((t: string) => t.includes('حديث') || t.includes('سنة'))) continue;
      if (selectedCategory === 'fiqh' && book.islamicArt !== 'fiqh' && !tags?.some((t: string) => t.includes('فقه'))) continue;
      if (selectedCategory === 'shobohat' && book.islamicArt !== 'aqeedah' && !tags?.some((t: string) => t.includes('عقيدة'))) continue;
      if (selectedCategory === 'history' && book.islamicArt !== 'history' && !tags?.some((t: string) => t.includes('تاريخ') || t.includes('سيرة'))) continue;
      if (selectedCategory === 'language_literature' && book.islamicArt !== 'language' && !tags?.some((t: string) => t.includes('لغة') || t.includes('شعر'))) continue;
      if (selectedCategory === 'mwaez' && book.islamicArt !== 'raqaiq' && !tags?.some((t: string) => t.includes('رقائق') || t.includes('زهد'))) continue;
    }

    let score = 0;
    let matchReason: string | undefined;
    let hasDirectMatch = false;

    const normTitle: string = book._normTitle || normalizeArabic(book.title) || '';
    const normAuthor: string = book._normAuthor || normalizeArabic(book.sheikhName) || '';

    // TIER 1: Exact Full Title Equality (Dominant over any topic accumulation)
    if (normTitle === normQuery) {
      score += 20000;
      matchReason = '📚 تطابق تام لعنوان الكتاب';
      hasDirectMatch = true;
    }
    // TIER 2: Title + Author Substring Combination Match (e.g. "مغني ابن قدامة")
    else if (
      !matchedAuthor &&
      normTitle.length >= 3 &&
      normAuthor.length >= 3 &&
      normQuery.includes(normTitle) &&
      normQuery.includes(normAuthor)
    ) {
      score += 6000;
      matchReason = '📚 تطابق العنوان مع المؤلف';
      hasDirectMatch = true;
    }
    // TIER 3: Title Prefix Match (e.g. edition or subtitle follows: "صحيح البخاري - ط التأصيل")
    else if (
      !matchedAuthor &&
      (normTitle.startsWith(normQuery + ' ') ||
        normTitle.startsWith(normQuery + ' -') ||
        normTitle.startsWith(normQuery + ' :') ||
        normTitle.startsWith(normQuery + '،'))
    ) {
      score += 5000;
      matchReason = '📚 تطابق بداية العنوان';
      hasDirectMatch = true;
    }
    // TIER 4: Exact Phrase Match in Title (Word-Boundary Aware)
    else if (normTitle.length >= normQuery.length && checkTokenAtBoundary(normTitle, normQuery)) {
      const coverageRatio = normQuery.length / Math.max(normTitle.length, 1);
      score += 3000 + Math.round(coverageRatio * 1500);
      matchReason = '📚 تطابق عبارة العنوان';
      hasDirectMatch = true;
    }

    // TIER 5: Canonical Book Alias Match
    if (aliasTitles) {
      for (let j = 0; j < aliasTitles.length; j++) {
        const at = aliasTitles[j];
        if (normTitle === at || (normTitle.length >= at.length && normTitle.includes(at))) {
          score += 4000;
          matchReason = `🎯 تطابق: ${matchedAlias!.explanation}`;
          hasDirectMatch = true;
          break;
        }
      }
      if (aliasAuthor && normAuthor.length >= aliasAuthor.length && (normAuthor === aliasAuthor || normAuthor.includes(aliasAuthor))) {
        score += 800;
      }
    }

    // TIER 6: Author Direct Match or Canonical Intent
    if (authorAliases && normAuthor.length > 0) {
      let authorMatched = false;
      for (let j = 0; j < authorAliases.length; j++) {
        const aAlias = authorAliases[j];
        if (normAuthor === aAlias || (normAuthor.length >= aAlias.length && normAuthor.includes(aAlias))) {
          score += 6500;
          authorMatched = true;
          hasDirectMatch = true;
          matchReason = `👤 مؤلفات: ${authorCanonical} ${authorDeath ? `(ت ${authorDeath} هـ)` : ''}`;
          break;
        }
      }
      if (authorMatched && topicTokenLen > 0) {
        for (let j = 0; j < topicTokenLen; j++) {
          if (wordMatchesInTokens(normTitle, prepTopics[j].tok, prepTopics[j].strippedAl)) score += 500;
        }
      }
    } else if (
      normAuthor &&
      normAuthor.length >= normQuery.length &&
      (normAuthor === normQuery || checkTokenAtBoundary(normAuthor, normQuery))
    ) {
      score += 3500;
      if (!matchReason) matchReason = '👤 تطابق اسم المؤلف';
      hasDirectMatch = true;
    }

    // TIER 6.5: Madhhab Intent Direct Match (e.g. "فقه الحنابلة", "فقه الشافعية")
    // Strictly qualified ONLY when query has no extra non-madhhab tokens (e.g. not "فقه الحنابلة البطيخ")
    if (madhhabCatId !== undefined && nonMadhhabTokens.length === 0) {
      if (
        book.shamelaCategoryId === madhhabCatId ||
        (book.tags && book.tags.some((t: string) => t.includes(matchedMadhhab!.name)))
      ) {
        score += 2500;
        hasDirectMatch = true;
        if (!matchReason) {
          matchReason = `⚖️ المذهب: ${madhhabTag}`;
        }
      }
    }

    // TIER 7: Token Level Matching (Word-Boundary Aware)
    if (!hasDirectMatch) {
      let matchedTitleTokens = 0;
      let matchedAuthorTokens = 0;
      const minRequired = tokenLen === 1 ? 1 : Math.ceil(tokenLen * 0.6);

      for (let j = 0; j < tokenLen; j++) {
        const pt = prepTokens[j];
        if (wordMatchesInTokens(normTitle, pt.tok, pt.strippedAl)) {
          matchedTitleTokens++;
        } else if (wordMatchesInTokens(normAuthor, pt.tok, pt.strippedAl)) {
          matchedAuthorTokens++;
        }

        // Fast early break if remaining tokens cannot reach minRequired
        if (tokenLen > 1 && matchedTitleTokens + matchedAuthorTokens + (tokenLen - 1 - j) < minRequired) {
          break;
        }
      }

      const totalMatched = matchedTitleTokens + matchedAuthorTokens;
      const matchRatio = totalMatched / tokenLen;

      if (tokenLen === 1 && totalMatched >= 1) {
        score += matchedTitleTokens * 400 + matchedAuthorTokens * 300;
        hasDirectMatch = true;
        if (!matchReason) {
          matchReason = matchedTitleTokens > 0 ? '📚 تطابق كلمة من العنوان' : '👤 تطابق المؤلف';
        }
      } else if (tokenLen > 1 && (totalMatched === tokenLen || matchRatio >= 0.6)) {
        score += matchedTitleTokens * 350 + matchedAuthorTokens * 250;
        if (totalMatched === tokenLen) score += 1000;
        if (matchedTitleTokens > 0 && matchedAuthorTokens > 0) {
          score += 2500;
          matchReason = '📚 تطابق العنوان مع المؤلف';
        }
        hasDirectMatch = true;
        if (!matchReason) {
          matchReason = '📚 تطابق كلمات البحث';
        }
      }
    }

    // RE-RANKING BOOSTERS (Strict Safeguard: ONLY applied if hasDirectMatch is TRUE)
    if (hasDirectMatch) {
      // Madhhab booster
      if (madhhabCatId !== undefined) {
        if (
          book.shamelaCategoryId === madhhabCatId ||
          (book.tags && book.tags.some((t: string) => t.includes(matchedMadhhab!.name)))
        ) {
          score += 300;
          if (!matchReason) {
            matchReason = `⚖️ المذهب: ${madhhabTag}`;
          }
        }
      }

      // Discipline booster
      if (discLen > 0) {
        for (let j = 0; j < discLen; j++) {
          const disc = matchedDisciplines[j];
          if (
            (disc.categoryId && book.shamelaCategoryId === disc.categoryId) ||
            book.islamicArt === disc.art ||
            (book.tags && book.tags.some((t: string) => t.includes(disc.label)))
          ) {
            score += 200;
            break;
          }
        }
      }

      results.push({
        book,
        score,
        matchReason,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
