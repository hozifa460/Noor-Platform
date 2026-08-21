# Noor Platform — Code Knowledge Graph & Architecture Map

> **Deterministic AST Knowledge Graph generated without external dependencies or Docker.**

| Metric | Count |
|---|---|
| **Source Files** | 198 |
| **AST Symbols (Functions/Components/Types)** | 332 |
| **Dependencies (Import Edges)** | 751 |
| **Next.js App Router Routes** | 13 |

## 🌐 App Router Route Hierarchy

| Route URL | Source Page File | Rendering Mode |
|---|---|---|
| `/books` | [page.tsx](file:///src/app/books/page.tsx) | Server Component |
| `/download/[videoId]` | [page.tsx](file:///src/app/download/[videoId]/page.tsx) | Client Component |
| `/downloads` | [page.tsx](file:///src/app/downloads/page.tsx) | Server Component |
| `/fatwa` | [page.tsx](file:///src/app/fatwa/page.tsx) | Server Component |
| `/favorites` | [page.tsx](file:///src/app/favorites/page.tsx) | Server Component |
| `/hadith` | [page.tsx](file:///src/app/hadith/page.tsx) | Server Component |
| `/history` | [page.tsx](file:///src/app/history/page.tsx) | Server Component |
| `/` | [page.tsx](file:///src/app/page.tsx) | Client Component |
| `/quran` | [page.tsx](file:///src/app/quran/page.tsx) | Server Component |
| `/radio` | [page.tsx](file:///src/app/radio/page.tsx) | Server Component |
| `/search` | [page.tsx](file:///src/app/search/page.tsx) | Server Component |
| `/settings` | [page.tsx](file:///src/app/settings/page.tsx) | Server Component |
| `/sheikhs` | [page.tsx](file:///src/app/sheikhs/page.tsx) | Server Component |

## 🗄️ Zustand State Management Flow

| Zustand Store | Caller Component / Module |
|---|---|
| `useNavStore` | `src/app/page.tsx` |
| `usePlayerStore` | `src/app/page.tsx` |
| `useSettingsStore` | `src/app/page.tsx` |
| `usePlayerStore` | `src/components/books/BookCard.tsx` |
| `useFavoritesStore` | `src/components/books/BookCard.tsx` |
| `useBooksStore` | `src/components/books/BooksLibraryView.tsx` |
| `usePlayerStore` | `src/components/books/BooksLibraryView.tsx` |
| `useFatwaStore` | `src/components/fatwa/FatwaLibraryView.tsx` |
| `usePlayerStore` | `src/components/fatwa/FatwaLibraryView.tsx` |
| `useHadithStore` | `src/components/hadith/HadithHubView.tsx` |
| `useContinueWatchingStore` | `src/components/home/ContinueWatching.tsx` |
| `useLibraryStore` | `src/components/home/ContinueWatching.tsx` |
| `useNavStore` | `src/components/home/ContinueWatching.tsx` |
| `useLibraryStore` | `src/components/home/HeroCarousel.tsx` |
| `usePlayerStore` | `src/components/home/HeroCarousel.tsx` |
| `useNavStore` | `src/components/home/HeroSection.tsx` |
| `useLibraryStore` | `src/components/home/HeroSection.tsx` |
| `useLibraryStore` | `src/components/home/HomeView.tsx` |
| `useLibraryStore` | `src/components/home/LiveStats.tsx` |
| `useLibraryStore` | `src/components/home/SectionRail.tsx` |
| `useNavStore` | `src/components/home/SectionRail.tsx` |
| `useLibraryStore` | `src/components/home/SheikhGrid.tsx` |
| `useNavStore` | `src/components/home/SheikhGrid.tsx` |
| `useNavStore` | `src/components/KeyboardShortcuts.tsx` |
| `usePlayerStore` | `src/components/layout/AppShell.tsx` |
| `useSettingsStore` | `src/components/layout/AppShell.tsx` |
| `useLibraryStore` | `src/components/layout/Footer.tsx` |
| `useNavStore` | `src/components/layout/Header.tsx` |
| `useLibraryStore` | `src/components/layout/Header.tsx` |
| `useNavStore` | `src/components/layout/MobileNav.tsx` |
