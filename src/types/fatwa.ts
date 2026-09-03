/**
 * Centralized TypeScript definitions for the Fatawa domain.
 */

export interface FatwaIndexItem {
  id: string;
  title: string;
  question: string;
  scholar: string;
  category?: string;
  tags?: string[];
  sourceFile?: string;
  audioUrl?: string;
  hasAnswer: boolean;
  answer?: string;
}

export interface FatwaCategory {
  id: string;
  name: string;
  emoji: string;
  keywords?: string[];
}

export interface FatwaScholar {
  id: string;
  name: string;
  query: string;
}

export interface FatwaContentResult {
  question: string;
  answer: string;
  found: boolean;
}
