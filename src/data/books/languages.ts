import type { BookLanguage } from "./types";

export const BOOK_LANGUAGES: BookLanguage[] = [
  { code: "all", name: "جميع اللغات", nativeName: "All Languages", flag: "🌐" },
  { code: "ar", name: "العربية", nativeName: "العربية", flag: "🇸🇦" },
  { code: "en", name: "الإنجليزية", nativeName: "English", flag: "🇬🇧" },
  { code: "fr", name: "الفرنسية", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "الإسبانية", nativeName: "Español", flag: "🇪🇸" },
  { code: "de", name: "الألمانية", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ru", name: "الروسية", nativeName: "Русский", flag: "🇷🇺" },
  { code: "id", name: "الإندونيسية", nativeName: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "التركية", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "ur", name: "الأردية", nativeName: "اردو", flag: "🇵🇰" },
  { code: "bn", name: "البنغالية", nativeName: "বাংলা", flag: "🇧🇩" },
  { code: "zh", name: "الصينية", nativeName: "中文", flag: "🇨🇳" },
];

export const LANGUAGE_BOOK_FILES: Record<string, string[]> = {
  ar: ["books/islamhouse_books_ar.json", "books/islamhouse_articles_ar.json"],
  en: ["books/islamhouse_books_en.json", "books/islamhouse_articles_en.json"],
  fr: ["books/islamhouse_books_fr.json", "books/islamhouse_articles_fr.json"],
  es: ["books/islamhouse_books_es.json", "books/islamhouse_articles_es.json"],
  id: ["books/islamhouse_books_id.json", "books/islamhouse_articles_id.json"],
  tr: ["books/islamhouse_books_tr.json", "books/islamhouse_articles_tr.json"],
  ru: ["books/islamhouse_books_ru.json", "books/islamhouse_articles_ru.json"],
  ur: ["books/islamhouse_books_ur.json"],
  bn: ["books/islamhouse_books_bn.json", "books/islamhouse_articles_bn.json"],
  hi: ["books/islamhouse_books_hi.json"],
  fa: ["books/islamhouse_books_fa.json"],
  de: ["books/islamhouse_articles_de.json"],
  zh: ["books/islamhouse_articles_zh.json"],
};

export const CATEGORY_BOOK_FILES: Record<string, string[]> = {
  openiti: ["books/OpenITI_14k_Classical_Books/openiti_books_index.json"],
};
