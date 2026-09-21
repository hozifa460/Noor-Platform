/**
 * Public facade for the Hadith & Sunnah domain feature.
 * Following Feature-Sliced Design principles, this is the ONLY public entrypoint
 * accessible to other features and external layers.
 */

// Domain Layer
export type {
  HadithBookMeta,
  HadithItem,
  HadithChapter,
  HadithBookData,
  HadeethEncSharhItem,
  GlobalSearchResultItem,
  NarratorScholarlyOpinion,
  NarratorProfile,
  IsnadNodeRole,
  IsnadNode,
  ParsedIsnad,
  GradeFilterOption,
  MicroIndexEntry,
} from './domain';

export type {
  HadithGradeInfo,
  FakeHadithCategory,
  FakeHadithCategoryMeta,
  FakeHadithItem,
  AuthenticityCheckResult,
  TranslationSupportStatus,
  MicroIndexLoadOutcome,
} from './infrastructure';

export {
  HADITH_BOOKS_LIST,
  GRADE_FILTER_OPTIONS,
} from './domain';

// Infrastructure Layer
export {
  COMMON_STOP_WORDS,
  extractCleanMatn,
  prepareBookData,
  loadHadithBook,
  loadHadithBookFromShards,
  loadSpecificHadith,
  clearBookCache,
  getBookCacheSize,
  buildSharhInvertedIndex,
  loadHadeethEncSharh,
  findHadithSharh,
  getSharhByHadithId,
  clearSharhCache,
  isSharhCacheLoaded,
  parseMicroIndexPayload,
  isValidMicroIndexPayload,
  loadHadithMicroIndex,
  loadHadithMicroIndexOutcome,
  getMicroIndexLoadError,
  MicroIndexLoadError,
  searchHadithsInBook,
  searchAcrossAllBooks,
  loadSunanGrades,
  getHadithGrade,
  normalizeGradeText,
  isMuttafaqunAlayh,
  parseHadithIsnad,
  findNarratorBio,
  HADITH_INTENT_CLUSTERS,
  extractQueryCore,
  expandSemanticTerms,
  resolveSemanticConcept,
  FAKE_HADITH_CATEGORIES,
  loadFakeHadiths,
  searchFakeHadiths,
  checkHadithAuthenticity,
  SUPPORTED_TRANSLATION_LANGUAGES,
  isBookTranslationAvailable,
  getBookTranslationSupport,
  VERIFIED_CONCORDANT_BOOKS,
  VERIFIED_CONCORDANCE_MAP,
  CONCORDANCE_EVIDENCE_CATALOG,
  DOCUMENTED_SHARH_LINKS,
  fetchHadithTranslation,
  getCachedHadithBook,
  setCachedHadithBook,
  BUILTIN_SEED_SHARH,
} from './infrastructure';

export type { ConcordanceEvidenceItem, DocumentedSharhTarget } from './infrastructure';

// Model Layer
export {
  useHadithStore,
  type HadithState,
} from './model';

// UI Layer
export {
  HadithHubView,
  HadithCard,
  HadithDetailModal,
  HadithSearchHeader,
  HadithBookSelectorModal,
  HadithChapterSelectorModal,
  HadithGradesGuideModal,
  HadithIsnadTree,
  NarratorBioModal,
  FakeHadithChecker,
  HadithTranslationsView,
  HADITH_BOOK_CATEGORIES,
  GRADE_FILTERS,
  ArabicHighlight,
} from './ui';

