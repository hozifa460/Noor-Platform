export * from './arabic/normalizer';
export {
  TASHKEEL_REGEX,
  TATWEEL_REGEX,
  ZERO_WIDTH_REGEX,
  PUNCTUATION_REGEX,
  stripTashkeel,
  stripHarakat,
  normalizeArabic,
  tokenizeArabic,
  matchSingleTokenFast,
  arabicSearchMatch,
  arabicSearchScore,
} from './arabic/normalizer';
