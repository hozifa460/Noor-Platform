# Noor Platform (منصة نور) — System Architecture & Engineering Blueprint

## 1. Executive Architecture Summary

**Noor Platform (منصة نور)** is an enterprise-grade digital platform engineered to preserve, organize, and serve the rich heritage of Islamic knowledge — encompassing the Holy Quran, authentic Prophetic Hadith, Classical Islamic Texts (Shamela & OpenITI), Fatwas, Adhkar, and 24/7 Live Audio Streams.

The platform is structured as a **Modular Monolith** adhering strictly to **Feature-Sliced Design (FSD)** and **Domain-Driven Design (DDD)** principles:
- High cohesion within domain boundaries, loose coupling across domains.
- Standardized 4-layer physical separation of concerns (`domain`, `infrastructure`, `model`, `ui`).
- Strict architectural boundaries enforced by ESLint and circular dependency checks.
- 100% backward-compatible facades guaranteeing zero regressions for legacy callers.
- Multi-tier quality assurance pipeline (Vitest unit tests, integration test suites, CodeQL security analysis, Turbopack static page generation).

---

## 2. High-Level Modular Monolith Topology

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             1. Application Layer (Next.js)                       │
│    App Router (`src/app/`): 49 Pre-rendered Static Pages, Layouts, Server Routes │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                    2. Feature Slices (`src/features/*`)                          │
│                                                                                  │
│   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │
│   │     quran/     │ │    hadith/     │ │     books/     │ │     fatwa/     │ ... │
│   │ 114 Surahs,    │ │ 17 Collections,│ │ 8,589 Shamela, │ │ 226k Fatwas,   │     │
│   │ 19 Qiraat,     │ │ Sunan Grades,  │ │ OpenITI,       │ │ Micro-Shards,  │     │
│   │ Audio Sync     │ │ Isnad Tree     │ │ Text Readers   │ │ Inverted Index │     │
│   └───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘     │
│           │                  │                  │                  │              │
│       [Public API Facade: `index.ts` — Sole Allowed Entrypoint]                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                    3. Shared Foundation & Libraries (`src/lib/shared/`)          │
│   Arabic Normalizer, Security Sanitizers, DOMPurify, Offline DB, Clipboard      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                    4. Data Infrastructure & Shard Layer                          │
│   Local Edge Assets (`public/data/`), Micro-Shards CDN, Hugging Face Repositories│
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Feature Slice Patterns & Canonical Directory

Depending on domain complexity, feature slices under `src/features/<domain>/` follow one of two disciplined patterns:

### A. The 4-Layer DDD Pattern (Quran, Hadith, Books, Fatwa)
Major multi-subsystem domains are organized into 4 standardized DDD layers with a single public entry point:

```text
src/features/<domain>/
├── domain/                      # Layer 1: Core Domain (Zero UI / Pure TS - No imports from UI, Model, or Infra)
│   ├── types.ts                 # Contracts, interfaces, entity types
│   ├── data.ts                  # Domain constants, registries, static taxonomies
│   └── index.ts                 # Clean re-export barrel for domain models
│
├── infrastructure/              # Layer 2: Infrastructure & Data Access
│   ├── engines/loaders          # Remote shard fetchers, parsers, search algorithms
│   ├── storage/cache            # Local cache, IndexedDB, worker client managers
│   └── index.ts                 # Infrastructure exports
│
├── model/                       # Layer 3: Application State & Coordination
│   ├── <domain>-store.ts        # Reactive Zustand store (client state)
│   ├── hooks/                   # Custom domain coordination hooks
│   └── index.ts                 # Model exports
│
├── ui/                          # Layer 4: Presentational UI Components
│   ├── <Domain>HubView.tsx      # Main hub screen
│   ├── subcomponents/           # Modular cards, drawers, toolbars, dialogs
│   └── index.ts                 # UI component exports
│
├── __tests__/                   # Feature-Level Test Suite
│   └── <domain>.test.ts         # Vitest unit tests verifying domain contracts
│
└── index.ts                     # Public API Facade (The ONLY external entry point)
```

### B. The Focused Utility Pattern (Adhkar, Radio)
Single-purpose utility domains avoid artificial folder overhead and organize directly around single responsibilities:
- `engines/`: Data normalization, streaming, and CDN resolvers.
- `components/`: Pure presentational and interactive UI cards.
- `hooks/`: Reactive state and event coordinators (e.g. `use-dhikr-counter.ts`).
- `types.ts`: Domain contracts and catalog types.
- `__tests__/`: Feature unit tests.
- `index.ts`: The unified public entry point.

### Canonical Feature Slices Directory

| Feature Slice | Path | Architecture Pattern | Domain Scope & Capabilities |
| :--- | :--- | :--- | :--- |
| **Holy Quran** | `src/features/quran/` | 4-Layer DDD | 114 Surahs metadata, 19 Qiraat recitations, MP3Quran 240+ reciters catalog, Tafsir Muyassar/Saadi/Ibn Kathir/Baghawi, 4 I'rab books, 8 global language translations, verse audio loop & sync. *(Note: Hafs uses the interactive Vector Mushaf; paired with Shu'bah from Aasim in Qira'at PDF registry).* |
| **Prophetic Hadith** | `src/features/hadith/` | 4-Layer DDD | 17 Hadith collections (Sahihayn, Sunan, Musnads, Forties), HadeethEnc explanations dataset, Darussalam/Albani Sunan grade maps, interactive Isnad tree, 60+ verified fabricated hadith detector. |
| **Islamic Books** | `src/features/books/` | 4-Layer DDD | Shamela 4 catalog (8,589 titles), OpenITI dynamic shard streaming, 11 Islamic art categories, 12 world languages, modular pure text reader (`EBookTextReader`), vector Mus-haf reader (`VectorMushafReader`). |
| **Fatwa Encyclopedia**| `src/features/fatwa/` | 4-Layer DDD | 226,000+ categorized fatwas, 10 prominent scholars filter, micro-shard inverted keyword index, v3 content hash shards, background Web Worker search offloading, network recovery resilience. |
| **Islamic Radio** | `src/features/radio/` | Focused Utility | 24/7 verified live Quran and Islamic radio stations, dynamic artwork and visualizer mapping, SSRF-hardened audio relay proxy. |
| **Adhkar & Fortress**| `src/features/adhkar/` | Focused Utility | 132 categories, 267 authentic dhikrs from Hisn al-Muslim, Hugging Face CDN audio resolution, pure React StrictMode-safe state counter. |


## 4. Key Domains & Subsystem Blueprints

### 4.1 Classical EBook Reader Subsystem (`src/components/books/`)
- **Deconstructed Architecture**:
  - `EBookTextReader.tsx`: Minimal coordinator (< 160 lines) orchestrating presentation.
  - `ebook/use-ebook-reader.ts`: Domain hook encapsulating chunk loading, adjacent chapter preloading, search, and reading progress.
  - `ebook/EBookToolbar.tsx`: Font size, font family, color themes (Light, Sepia, Oasis, OLED), Tashkeel level, speech TTS, and PDF facsimile toggle.
  - `ebook/EBookSidebarToc.tsx`: Drawer for chapters, in-book text search, and saved highlights.
  - `ebook/EBookSearchModal.tsx`: Search dialog with live term highlight and instant navigation.
  - `ebook/EBookPaginationBar.tsx`: Navigation bar with chapter slider, page indicators, and RTL pagination.
  - `ebook/EBookContentView.tsx`: Typography canvas handling classical prose, poetry verses, headings, and footnotes.

### 4.2 PDF Viewer Subsystem (`src/components/pdf-viewer/`)
- **Offscreen Canvas Rendering**: Renders pages via PDF.js offscreen canvas to avoid blank canvas race conditions.
- **Modular Subcomponents**:
  - `PdfViewer.tsx`: Clean top-level coordinator.
  - `use-pdf-controls.ts`: Focus mode auto-hiding, keyboard shortcuts, mouse-wheel zoom, pinch-to-zoom gestures.
  - `PdfViewerError.tsx`: Contextual error recovery with retry and external viewer fallback.
  - `PdfViewerLoading.tsx`: Tabular progress indicator.
  - `PdfViewerMobileBar.tsx`: Responsive touch bottom controls.

### 4.3 Sheikh Media Domain (`src/components/sheikh/`)
- **Dynamic Avatar Fallback**: Multi-tier image fallback with automatic retry parameter.
- **Modular Components**:
  - `use-sheikh-profile.ts`: Memoized media grouping and section archive resolution.
  - `SheikhProfile.tsx`: Clean domain coordinator delegating to dedicated tab modules.
  - `SheikhHeader.tsx`: Profile avatar, verified badge, bio, and statistics.
  - `SheikhSectionContent.tsx`: Smart switching between flat grid (single group) and collapsible accordion (multi-group).
  - `SheikhAudioTab.tsx`: Dedicated audio collections tab with audio-specific archive loader.
  - `SheikhVideoTab.tsx`: Dedicated video tab supporting standard aspect ratios and short-form media grids.
  - `SheikhBooksTab.tsx`: Dedicated books tab for authored works and treatises.
  - `ArchiveLoader.tsx`: Lazy loading for older historical media archives with dynamic contextual labels.

---

## 5. Data Flow & Caching Strategy

```
[User Request]
      │
      ▼
┌──────────────┐      Hit      ┌────────────────────┐
│ Memory Cache ├──────────────►│ Return Cached Data │
└──────┬───────┘               └────────────────────┘
       │ Miss
       ▼
┌──────────────┐      Hit      ┌────────────────────┐
│  IndexedDB   ├──────────────►│ Populate Memory &  │
│  (idb-keyval)│               │ Return Cached Data │
└──────┬───────┘               └────────────────────┘
       │ Miss
       ▼
┌──────────────┐  Fetch & Parse ┌───────────────────┐
│ Network CDN  ├───────────────►│ Cache to IDB &    │
│ or API Proxy │                │ Return to Consumer│
└──────────────┘                └───────────────────┘
```

1. **Memory Caches (L1)**:
   - Chunk cache in `book-text-engine.ts` keeps up to 50 active chapter chunks in memory for instant chapter navigation.
   - Preloads adjacent chapters (`n-1`, `n+1`) in the background.
2. **IndexedDB Persistent Cache (L2)**:
   - Offline eBooks stored in `noor-ebooks-cache`.
   - Rendered PDF canvas tiles stored in `noor-pdf-cache`.
3. **Web Worker Offloading**:
   - Heavy morphological keyword matching runs asynchronously without freezing main thread 60fps animations.
4. **Service Worker PWA (L3)**:
   - Cache-first strategy for static JSON metadata catalogs and font assets.
   - Network-first with fallback for dynamic media and audio streams.

---

## 6. Guide: Adding New Features

### 6.1 Adding a New Hadith Collection
1. **Catalog Registration**: Add the collection metadata in `src/lib/hadith-engine.ts` inside `HADITH_COLLECTIONS`:
   ```ts
   {
     id: 'adab-al-mufrad',
     title: 'الأدب المفرد',
     author: 'الإمام البخاري',
     totalHadiths: 1322,
     hasSharh: true,
     source: 'shamela'
   }
   ```
2. **Data Shard**: Place the JSON data file in `public/data/hadith/adab-al-mufrad.json`.
3. **Grade Map (Optional)**: If scholarly gradings exist, add `public/data/hadith/grades/adab-al-mufrad.json`.
4. **Verification**: Run `node scripts/test_hadith_integration.mjs` to ensure indexing and search match correctly.

### 6.2 Adding a New Quran Reciter or Riwayah
1. **Reciter Definition**: Open `src/lib/quran-audio-engine.ts` and add entry to `QURAN_RECITERS`:
   ```ts
   {
     id: 'reciter-slug',
     name: 'اسم القارئ بالعربية',
     englishName: 'Reciter Name',
     riwayah: 'warsh', // 'hafs' | 'warsh' | 'qaloon' | 'aldori'
     serverUrl: 'https://server.mp3quran.net/slug/',
     hasAyahTiming: true,
   }
   ```
2. **Audio Sync Verification**: Run `node scripts/test_quran_hub_integration.mjs`.

### 6.3 Adding a New Fatwa Category or Dataset
1. **Category Definition**: Update `src/lib/fatwa/index-data.ts` in `FATWA_CATEGORIES`.
2. **Shard Processing**: Add the tokenized keyword inverted index shard to `public/data/fatwa/shards/`.
3. **Verification**: Run `node scripts/test_fatwa_inverted_index.mjs`.

### 6.4 Adding a Classical Book to the Library
1. **Catalog Entry**: Add title, author, category, and total chapters into `public/data/ebooks/catalog.json`.
2. **Chunk Generation**: Provide chapter text chunks under `public/data/ebooks/[book-id]/chunk-[index].json`.
3. **Facsimile PDF (Optional)**: Place matching printed PDF URL in `pdfUrl` field.

---

## 7. Architectural Boundary Enforcement & Quality Gates

### 7.1 Boundary Rules Matrix (ESLint & Madge)

```text
┌──────────────────────────┬──────────────────────────┬──────────────────────────┬──────────────────────────────────┐
│ Consumer Layer           │ May Import From          │ Must NOT Import From     │ Enforcement Rule                 │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ `src/app/`               │ `@/features/<domain>`    │ `@/features/*/**`        │ Root facades only;               │
│                          │ `@/lib/shared/server`    │ (private subpaths)       │ No internal private subpaths     │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ `src/features/<feat>/`   │ Sibling relative paths   │ `@/features/*/**`        │ Cross-feature via public facade  │
│                          │ External `@/lib/*`       │ `../../<other-feature>`  │ only; No cross-feature relatives │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ `src/features/**/domain/`│ Sibling `./types`, data  │ `../ui`, `../model`      │ Domain layer is pure; must not   │
│                          │ Pure shared types        │ `../infrastructure`      │ depend on UI, state, or infra    │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ `src/lib/` (Standard)    │ Peer `@/lib/*`           │ `@/features`             │ Lower library layer cannot       │
│                          │ `@/lib/shared`           │ `@/features/**`          │ depend on feature slices         │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ `src/lib/` (7 Facades)   │ Backwards-compat only    │ N/A (Internal facades)   │ 7 dedicated compatibility folders│
│                          │ `@/features/<domain>`    │                          │ re-exporting for zero breakage   │
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│ `src/stores/`            │ `@/features/<domain>`    │ `@/features/*/**`        │ Public facades only              │
└──────────────────────────┴──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

### 7.2 Six-Tier Quality Gates Pipeline
Always verify modifications using the platform's six-tier test harness:
```bash
# 1. Circular Dependencies (0 cycles required)
npm run test:circular

# 2. Unit Tests (196 Vitest unit tests, 100% pass)
npm run test:unit

# 3. TypeScript Type Safety (0 errors required)
npm run typecheck

# 4. Code Quality & Architectural Boundaries (0 errors, 0 warnings required)
npm run lint

# 5. Comprehensive Domain Integration Suite (11 suites, 100% pass)
npm test

# 6. Production Build & Static Page Generation (49/49 static routes pre-rendered)
npm run build
```

### 7.3 Common Issues & Troubleshooting

| Symptom | Probable Cause | Resolution |
| :--- | :--- | :--- |
| **Circular dependency alert (`test:circular`)** | A lower-level module imported from a higher-level feature slice or a barrel pulling UI into types | Import only from `@/features/<domain>/types` or relative sibling domain modules |
| **Architectural boundary violation (`lint`)** | Direct import from an internal feature subpath (e.g. `@/features/quran/model/quran-store`) | Import exclusively through the public root facade (`@/features/quran`) |
| **CORS audio playback failure** | Direct stream URL blocked by remote CDN headers | Route stream through `/api/proxy-stream?url=...` |
| **PDF canvas rendering glitch** | Simultaneous canvas reuse during rapid scrolling | Ensure `_activeRenderTask.cancel()` is called before re-rendering |
| **Arabic text search misses terms** | Missing normalization (Hamza forms, Ta Marbuta, Tashkeel) | Always process search queries and target texts with `normalizeArabic()` from `src/lib/arabic` |
| **IndexedDB QuotaExceededError** | User device storage exhausted by cached books | Catch `DOMException` and evict least recently used entries using LRU timestamp eviction |

---

## 8. Summary

The Noor Platform codebase is built for extreme reliability, scholarly precision, zero circular dependencies, zero memory leaks, and offline readiness. All domain components maintain strict single-responsibility boundaries, enabling long-term maintainability and effortless extensibility.

