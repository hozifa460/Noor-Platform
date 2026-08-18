import ar from "./ar.json";
import en from "./en.json";

export const translations = {
  ar,
  en,
} as const;

export type SupportedLocale = keyof typeof translations;
export const DEFAULT_LOCALE: SupportedLocale = "ar";

export function getTranslation(locale: SupportedLocale = DEFAULT_LOCALE) {
  return translations[locale] || translations[DEFAULT_LOCALE];
}
