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
} from './domain';

export {
  HADITH_BOOKS_LIST,
  GRADE_FILTER_OPTIONS,
} from './domain';

// Infrastructure Layer
export {
  extractCleanMatn,
  loadHadithBook,
  loadSpecificHadith,
  loadHadeethEncSharh,
  findHadithSharh,
  getSharhByHadithId,
  searchHadithsInBook,
  searchAcrossAllBooks,
  loadSunanGrades,
  getHadithGrade,
  isMuttafaqunAlayh,
  parseHadithIsnad,
  findNarratorBio,
  FAKE_HADITH_CATEGORIES,
  loadFakeHadiths,
  searchFakeHadiths,
  checkHadithAuthenticity,
  SUPPORTED_TRANSLATION_LANGUAGES,
  isBookTranslationAvailable,
  fetchHadithTranslation,
} from './infrastructure';

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
} from './ui';

