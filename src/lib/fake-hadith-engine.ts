export * from './hadith/fake-engine';
export type {
  FakeHadithCategory,
  FakeHadithCategoryMeta,
  FakeHadithItem,
  AuthenticityCheckResult,
} from './hadith/fake-engine';
export {
  FAKE_HADITH_CATEGORIES,
  loadFakeHadiths,
  searchFakeHadiths,
  checkHadithAuthenticity,
} from './hadith/fake-engine';
