'use client';

import { normalizeArabic, tokenizeArabic } from '@/lib/arabic-normalizer';
import {
  ARABIC_STOP_WORDS,
  FIQH_SYNONYM_MAP,
  SEMANTIC_DOMAINS,
  MORPHOLOGICAL_DICTIONARY,
  getMorphologicalVariants,
} from '@/lib/arabic-dictionary';

export { ARABIC_STOP_WORDS, FIQH_SYNONYM_MAP, SEMANTIC_DOMAINS, MORPHOLOGICAL_DICTIONARY, getMorphologicalVariants };


/**
 * Concept Group Representation for Multi-Term Queries.
 */
interface QueryConcept {
  originalToken: string;
  allVariants: string[];
}

export function extractConceptGroups(query: string): QueryConcept[] {
  const allTokens = tokenizeArabic(query);
  const coreTokens = allTokens.filter((t) => !ARABIC_STOP_WORDS.has(t) && t.length > 1);
  const tokensToUse = coreTokens.length > 0 ? coreTokens : allTokens;

  return tokensToUse.map((t) => {
    const variants = new Set<string>();
    variants.add(t);
    if (t.startsWith('ال') && t.length > 3) {
      variants.add(t.slice(2));
    }
    const cleanT = t.replace(/^ال/, '');
    const mapped = FIQH_SYNONYM_MAP[t] || FIQH_SYNONYM_MAP[cleanT];
    if (mapped) {
      for (const syn of mapped) {
        variants.add(normalizeArabic(syn));
      }
    }
    const morphVariants = getMorphologicalVariants(t);
    for (const syn of morphVariants) {
      variants.add(normalizeArabic(syn));
    }
    // Semantic domain expansion (lightweight): known fiqh domain terms pull
    // their concept family even when the exact word isn't in the synonym map.
    const domain = SEMANTIC_DOMAINS[cleanT];
    if (domain) {
      for (const term of domain) variants.add(term);
    }
    return {
      originalToken: t,
      allVariants: Array.from(variants).filter((v) => v.length > 1),
    };
  });
}

/**
 * Extracts and expands keywords with Arabic morphological roots and synonyms.
 */

export function extractAndExpandTokens(query: string): {
  coreTokens: string[];
  expandedKeywords: string[];
  rawQuery: string;
} {
  const concepts = extractConceptGroups(query);
  const coreTokens = concepts.map((c) => c.originalToken);
  const expandedSet = new Set<string>();

  for (const c of concepts) {
    for (const v of c.allVariants) {
      expandedSet.add(v);
    }
  }

  return {
    coreTokens,
    expandedKeywords: Array.from(expandedSet),
    rawQuery: query.trim(),
  };
}

/**
 * Intelligent Multi-Concept Fiqh Semantic Relevance Scorer
 */
export function scoreArabicSearch(
  query: string,
  normTitle: string,
  normQuestion: string,
  normScholar: string,
  normTags: string
): number {
  const normQuery = normalizeArabic(query);
  if (!normQuery) return 0;

  // 1. Exact phrase matches (Highest possible tier)
  if (normTitle === normQuery) {
    return 5000;
  }
  if (normTitle.startsWith(normQuery)) {
    return 3000;
  } else if (normTitle.includes(normQuery)) {
    return 2000;
  }

  const concepts = extractConceptGroups(query);
  if (concepts.length === 0) return 0;

  let score = 0;
  let conceptsMatched = 0;

  for (const concept of concepts) {
    let conceptMatchedInDoc = false;
    let conceptScore = 0;

    for (const variant of concept.allVariants) {
      const inTitle = tokenMatch(normTitle, variant);
      const inQuestion = tokenMatch(normQuestion, variant);
      const inScholar = tokenMatch(normScholar, variant);
      const inTags = tokenMatch(normTags, variant);

      if (inTitle) {
        conceptScore = Math.max(conceptScore, 300);
        conceptMatchedInDoc = true;
      } else if (inQuestion) {
        conceptScore = Math.max(conceptScore, 100);
        conceptMatchedInDoc = true;
      } else if (inTags) {
        conceptScore = Math.max(conceptScore, 80);
        conceptMatchedInDoc = true;
      } else if (inScholar) {
        conceptScore = Math.max(conceptScore, 50);
        conceptMatchedInDoc = true;
      }
    }

    if (conceptMatchedInDoc) {
      score += conceptScore;
      conceptsMatched++;
    }
  }

  // Precision Guard: Must match at least one concept
  if (conceptsMatched === 0) {
    return 0;
  }

  // Multi-Concept Intersection Multiplier (The Key to Google-like Precision)
  // If a query has 2 concepts (e.g. 'صلاة' + 'طائرة'), matching BOTH concepts gives massive priority!
  if (concepts.length > 1) {
    if (conceptsMatched === concepts.length) {
      // 100% of concepts matched -> 5x multiplier!
      score = score * 5 + 1500;
    } else {
      // Partial match (e.g. 1 out of 2 concepts) -> Penalize heavily so partials don't outrank complete matches
      score = Math.floor(score * 0.3);
    }
  }

  return score;
}

/**
 * Flexible Arabic token matcher (handles 'ال', 'ابن/بن', etc.)
 */
export function tokenMatch(target: string, token: string): boolean {
  if (!target || !token) return false;

  if (target.includes(token)) return true;

  // With / without "ال"
  if (token.startsWith('ال') && token.length > 3) {
    if (target.includes(token.slice(2))) return true;
  } else {
    if (target.includes('ال' + token)) return true;
  }

  // Ibn / Bin
  if ((token === 'ابن' || token === 'بن') && (target.includes('ابن') || target.includes('بن'))) {
    return true;
  }

  return false;
}
