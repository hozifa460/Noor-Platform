# Project: Noor Sunnah Hadith Micro-Index & Search Platform

## Architecture
- **Data Ingestion & Index Generation**:
  - `scripts/generate_hadiths_micro_index.mjs` processes raw JSONs for all 17 Sunnah collections (50,884 hadiths).
  - Extracts prophetic Matn (stripping isnad chains) and normalized morphological stems.
  - Outputs a compact tuple-based dictionary `{ books: [...], grades: [...], items: [[bIdx, hadithId, chapterId, textPreview, gradeIdx], ...] }` to `public/data/hadith/hadiths_micro_index.json` (< 3MB).
- **Sub-Millisecond Search Engine**:
  - `src/lib/hadith-engine.ts` loads the lightweight micro-index into memory.
  - Morphological multi-token search with Arabic normalizer (`src/lib/arabic-normalizer.ts`) and prefix handling (`ال`, `بال`, `وال`, `كال`, `لل`, `ب`, `و`, `ف`, `ل`).
  - Authenticity-priority ranking (Bukhari -> Muslim -> Sunan) with early exit ($N=50$) yielding query times < 2ms.
- **On-Demand Slice Fetching & UI**:
  - `src/stores/hadith-store.ts`, `src/lib/hadith-storage.ts`, and `src/components/hadith/` load only the micro-index for global search.
  - Full book texts and chapter slices are loaded lazily on-demand from remote/local cache into IndexedDB when a user opens a book or chapter.
  - Zero RAM bloat in client memory (avoids multi-megabyte JSON allocations).
- **Testing & Verification Pipeline**:
  - 128 existing tests (`scripts/test_*.mjs`) via `npx tsx`.
  - Comprehensive new Hadith E2E test suite (Tiers 1-4).
  - Next.js production build (`npx next build`) zero errors.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Automated Index Generator | `scripts/generate_hadiths_micro_index.mjs` compiling all 17 collections | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Matn Extraction & Stemming | Stripping narrator Isnad boilerplate to index core prophetic Matn | M1 | Survey Finding |
| 3 | Compact Tuple Index | `hadiths_micro_index.json` under 3MB (dictionary header + tuple items) | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Morphological Arabic Search | Sub-2ms search supporting prefix variants (`ال`, `بال`, `وال`, `لل`, etc.) | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Authenticity-Priority Ranking | Results ranked with Sahihayn (Bukhari/Muslim) prioritized first | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Famous Hadiths Accuracy | Exact matching for "النيات", "الوضوء", "بر الوالدين", "الصلاة", etc. | M2 | ORIGINAL_REQUEST Acceptance |
| 7 | On-Demand Slice Loading | Lazy fetching of chapters/books into IndexedDB without RAM bloat | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Hadith Hub UI Integration | Global & in-book search, virtualized scrolling, Sharh modal integration | M3 | Survey Finding |
| 9 | 100% E2E & 128 Test Pass | All 128 existing tests + new Hadith E2E test suite pass | Final Milestone | ORIGINAL_REQUEST Acceptance |
| 10 | Build & Graph Verification | `npx next build` succeeds with 0 errors | Final Milestone | ORIGINAL_REQUEST Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Micro-Index Generator | Refactor `scripts/generate_hadiths_micro_index.mjs` to produce `< 3MB` `hadiths_micro_index.json` with Matn extraction | none | IN_PROGRESS |
| M2 | Sub-Millisecond Search Engine | Implement `< 2ms` multi-token morphological search & Sahihayn ranking in `src/lib/hadith-engine.ts` | M1 | PLANNED |
| M3 | Slice Fetching & UI Integration | Integrate on-demand slice loading and verify zero RAM bloat in `src/stores/hadith-store.ts` & UI | M2 | PLANNED |
| M_FINAL | E2E Pass & Adversarial Hardening | Pass 100% E2E test suite (Tiers 1-4), 128 baseline tests, `next build`, and Tier 5 adversarial verification | M1, M2, M3 | PLANNED |

## Interface Contracts
### Generator (`scripts/generate_hadiths_micro_index.mjs`) ↔ Search Engine (`src/lib/hadith-engine.ts`)
- **Output File**: `public/data/hadith/hadiths_micro_index.json`
- **Schema**:
  ```ts
  interface HadithMicroIndexPayload {
    books: string[]; // ['bukhari', 'muslim', ...]
    grades: string[]; // ['sahih', 'hasan', 'daif', ...]
    items: [
      bookIdx: number,
      idInBook: number,
      chapterId: number,
      textPreview: string, // Normalized Matn prefix or stems
      gradeIdx: number
    ][];
  }
  ```
- **File Size**: < 3,000,000 bytes (< 3 MB).
- **Item Count**: 50,884 items across all 17 collections.

### Search Engine (`src/lib/hadith-engine.ts`) ↔ UI (`src/stores/hadith-store.ts`, `src/components/hadith/`)
- **Function**: `searchAcrossAllBooks(query: string, options?: { limit?: number; bookId?: string }): Promise<HadithSearchResult[]>`
- **Performance**: Returns ranked results in < 2ms (micro-index in memory).
- **Result Item**:
  ```ts
  interface HadithSearchResult {
    bookId: string;
    hadithId: number;
    chapterId: number;
    textPreview: string;
    grade: string;
    gradeBadge: string;
    score: number;
  }
  ```

### Storage Slicing (`src/lib/hadith-storage.ts`) ↔ UI
- **Function**: `fetchBookSlice(bookId: string, chapterId?: number): Promise<HadithBook>`
- **Behavior**: Downloads and caches individual book JSON in IndexedDB on-demand. Never loads all 17 full books into memory simultaneously.

## Code Layout
- `scripts/generate_hadiths_micro_index.mjs` — Index generator script
- `public/data/hadith/hadiths_micro_index.json` — Generated compact micro-index
- `src/lib/hadith-engine.ts` — Search engine, morphological matcher, and ranking
- `src/lib/hadith-data.ts` — Metadata, book catalogs, URLs
- `src/lib/hadith-storage.ts` — IndexedDB caching & slice fetching
- `src/stores/hadith-store.ts` — State management for search and reading
- `src/components/hadith/` — React UI components (HadithHubView, HadithCard, HadithDetailModal)
- `scripts/test_hadith_integration.mjs` — Hadith integration test runner
- `scripts/test_hadith_e2e.mjs` — Comprehensive 4-Tier E2E test runner
