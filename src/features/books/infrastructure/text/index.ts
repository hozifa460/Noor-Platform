/**
 * Unified E-Book Text Engine Facade (Clean Architecture).
 * Re-exports catalog, chapter slices, search, progress modules for 100% backward compatibility.
 */

export * from './catalog';
export * from './chapters';
export * from './search';
export * from './progress';
export type { EBookMetaResponse } from './chapters';

// Explicit named re-exports for static ESM analysis
export {
  normBookTitle,
  firstLetterOf,
  loadCatalogLetterIndex,
  loadShamelaCatalogFull,
  lookupShamelaBook,
  loadShamelaBookByLetter,
  fetchEBookCatalog,
} from './catalog';

export {
  loadOpenItiDynamicEBook,
  loadShamelaEBook,
  loadEBookMeta,
  fetchShamelaChapterSlice,
  loadChapterChunk,
  preloadAdjacentChapters,
} from './chapters';

export {
  searchInsideEBook,
} from './search';

export {
  downloadBookTextFile,
  saveEBookForOffline,
  isEBookCachedOffline,
  getReadingProgress,
  saveReadingProgress,
  getBookHighlights,
  saveBookHighlight,
} from './progress';
