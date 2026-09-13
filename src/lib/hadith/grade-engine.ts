/**
 * Compatibility facade for Hadith grading engine.
 * Canonical implementation lives in @/features/hadith.
 */
export {
  loadSunanGrades,
  getHadithGrade,
  isMuttafaqunAlayh,
  type HadithGradeInfo,
} from '@/features/hadith';

export * from '@/features/hadith/infrastructure/grade-engine';
