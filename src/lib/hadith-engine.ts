/**
 * Unified Hadith Engine Facade (Clean Architecture).
 * Re-exports loaders, search engines, and sharh matchers for 100% backward compatibility.
 */

export * from './hadith/types';
export * from './hadith/matn';

export {
  loadHadithBook,
  loadHadithBookFromShards,
  loadSpecificHadith,
  prepareBookData,
} from './hadith/loader';

export {
  loadHadeethEncSharh,
  buildSharhInvertedIndex,
  findHadithSharh,
  getSharhByHadithId,
} from './hadith/sharh';

export {
  searchHadithsInBook,
  searchAcrossAllBooks,
  loadHadithMicroIndex,
  parseMicroIndexPayload,
} from './hadith/search';
