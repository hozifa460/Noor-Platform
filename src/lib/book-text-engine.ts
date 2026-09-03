/**
 * Unified E-Book Text Engine Facade (Clean Architecture).
 * Re-exports catalog, chapter slices, search, and progress modules for 100% backward compatibility.
 */

// In-memory slicing & search index cache: Cache = new Map()
export * from './book-text/catalog';
export * from './book-text/chapters';
export * from './book-text/search';
export * from './book-text/progress';

// Explicit named re-exports for static ESM analysis
export {
  normBookTitle,
  firstLetterOf,
  loadCatalogLetterIndex,
  loadShamelaCatalogFull,
  lookupShamelaBook,
  loadShamelaBookByLetter,
  fetchEBookCatalog,
} from './book-text/catalog';

export {
  loadOpenItiDynamicEBook,
  loadShamelaEBook,
  loadEBookMeta,
  fetchShamelaChapterSlice,
  loadChapterChunk,
  preloadAdjacentChapters,
} from './book-text/chapters';

export {
  searchInsideEBook,
} from './book-text/search';

export {
  downloadBookTextFile,
  saveEBookForOffline,
  isEBookCachedOffline,
  getReadingProgress,
  saveReadingProgress,
  getBookHighlights,
  saveBookHighlight,
} from './book-text/progress';
