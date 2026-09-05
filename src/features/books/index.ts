/**
 * Public facade for the Islamic Books & Library domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Domain Layer
export type {
  BookCategory,
  BookLanguage,
  EBookMetadata,
  EBookCategory,
  EBookEra,
  IslamicArtCategory,
  TableOfContentsItem,
  SectionParagraph,
  BookChapterChunk,
  InBookSearchResult,
  ReadingProgress,
  BookHighlight,
} from './domain';

export {
  BOOK_CATEGORIES,
  BOOK_LANGUAGES,
  QURANIC_MUS_HAFS,
  LANGUAGE_BOOK_FILES,
  CATEGORY_BOOK_FILES,
} from './domain';

// Infrastructure Layer
export {
  fetchEBookCatalog,
  searchBooksWithIntent,
  dedupeBooks,
  cachedLoadShamelaCatalog,
  getInitialCachedBooks,
  LOCAL_CACHE_KEY,
  FEATURED_ISLAMIC_CLASSICS,
  type FeaturedClassic,
  normBookTitle,
  firstLetterOf,
} from './infrastructure';

// Model Layer
export {
  useBooksStore,
  type BooksState,
} from './model';

// UI Layer
export {
  BooksLibraryView,
  BookCard,
  BooksFilterToolbar,
  FeaturedClassicsRibbon,
  EBookTextReader,
  VectorMushafReader,
} from './ui';

