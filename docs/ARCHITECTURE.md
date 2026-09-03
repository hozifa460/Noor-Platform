# Noor Platform (منصة نور) — System Architecture & Engineering Blueprint

## 1. Executive Overview

**Noor Platform (منصة نور)** is an enterprise-grade digital platform engineered to preserve, organize, and serve the rich heritage of Islamic knowledge — encompassing the Holy Quran, authentic Prophetic Hadith, Classical Islamic Texts (Shamela & OpenITI), Fatwas, Adhkar, and 24/7 Live Audio Streams.

Built on Next.js (App Router), TypeScript, Tailwind CSS, Radix UI, and Zustand, the platform adheres strictly to **Clean Architecture**, **Domain-Driven Design (DDD)**, and **DRY (Don't Repeat Yourself)** principles.

---

## 2. Layered Architecture

The platform follows an inverted dependency model where high-level policy does not depend on low-level details.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. Presentation Layer                           │
│   Next.js App Router (`src/app/`), Hub Views, Radix UI & Tailwind CSS  │
│   Component Domains: `books/`, `quran/`, `hadith/`, `sheikh/`, etc.     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        2. Application Hooks Layer                      │
│   Custom React Hooks (`src/hooks/`): `use-sheikh-profile.ts`,          │
│   `use-pdf-viewer.ts`, `use-library.ts`, `use-quran-player.ts`         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                         3. State Management                            │
│   Zustand Stores (`src/stores/`): `library.store.ts`, `player.store.ts`│
│   `books-store.ts`, `hadith.store.ts`, `quran.store.ts`, `nav.store.ts`│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        4. Domain Engine Layer                          │
│   Pure Domain Logics (`src/lib/`): `arabic-normalizer.ts`,             │
│   `book-text-engine.ts`, `hadith-engine.ts`, `quran-audio-engine.ts`   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    5. Data, Caching & Sandbox                          │
│   IndexedDB (`noor-ebooks-cache`), Offline Service Workers,            │
│   SSRF-Hardened Streaming Proxies (`/api/proxy-stream`)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Organization & Responsibilities

```
src/
├── app/                  # Next.js App Router (Layouts, Pages, Server API Routes)
│   ├── api/
│   │   ├── proxy-stream/ # SSRF-hardened audio stream relay with bounded buffer
│   │   ├── proxy-pdf/    # PDF streaming with HTTP Range request support
│   │   └── sheikh-avatar/# Dynamic avatar generator with fallback
│   ├── layout.tsx        # Root HTML layout with PWA meta & font declarations
│   └── page.tsx          # Single-page dynamic hub coordinator
│
├── components/           # UI Components organized strictly by domain
│   ├── books/            # Classical Books Library
│   │   ├── ebook/        # Deconstructed text reader (Toolbar, TOC, Search, Pagination)
│   │   ├── cards/        # Book cover and metadata cards
│   │   └── mushaf/       # Vector Quran reader
│   ├── hadith/           # Hadith collections, sharh drawers, grading badges
│   ├── pdf-viewer/       # Modular PDF reader (Toolbar, Sidebar, PageRenderer, Gestures)
│   ├── quran/            # Surah explorer, Riwayaat selector, Ayah sync player
│   ├── sheikh/           # Sheikh profile, header, media tabs, archive loaders
│   ├── player/           # Global floating audio/video media player (HLS-ready)
│   └── ui/               # Reusable headless UI primitives (Radix UI wrappers)
│
├── hooks/                # Domain-specific React hooks (State-to-UI orchestration)
│   ├── use-sheikh-profile.ts # Pre-computed media groups and archive filtering
│   ├── use-pdf-viewer.ts     # PDF.js document lifecycle and zoom engine
│   ├── use-library.ts        # Media library synchronization and archive loader
│   └── use-quran-player.ts   # Ayah-level timestamp tracking & recitation sync
│
├── stores/               # Reactive Client State (Zustand)
│   ├── books-store.ts    # Shamela catalog, active category/language filters
│   ├── hadith.store.ts   # Hadith collections, active chapter, search query
│   ├── library.store.ts  # Sheikhs catalog, media items, archive registry
│   ├── player.store.ts   # Audio/video playback state, queue, speed, HLS
│   └── quran.store.ts    # Active Surah, Ayah, reciter, Tafsir selection
│
├── lib/                  # Pure Business Logic, Algorithms & Data Engines
│   ├── arabic-normalizer.ts # Morphological root match, Alef/Yaa normalization, Tashkeel removal
│   ├── book-text-engine.ts  # Chunk loading, search index, IndexedDB offline cache
│   ├── hadith-engine.ts     # Cross-book search, HadeethEnc sharh loader, grade map
│   ├── quran-audio-engine.ts# MP3Quran reciters registry, verse timestamp sync
│   └── types.ts             # Core domain TypeScript definitions
│
└── public/data/          # Static verified catalogs & indexed data shards
    ├── ebooks/           # Shamela 4 catalog (8,589 verified classical titles)
    ├── hadith/           # 17 Hadith collections, grades maps, fake hadith detector
    └── quran/            # Surah metadata, reciters directory, tafsir databases
```

---

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
1. **Category Definition**: Update `src/lib/fatwa-index-engine.ts` in `FATWA_CATEGORIES`.
2. **Shard Processing**: Add the tokenized keyword inverted index shard to `public/data/fatwa/shards/`.
3. **Verification**: Run `node scripts/test_fatwa_inverted_index.mjs`.

### 6.4 Adding a Classical Book to the Library
1. **Catalog Entry**: Add title, author, category, and total chapters into `public/data/ebooks/catalog.json`.
2. **Chunk Generation**: Provide chapter text chunks under `public/data/ebooks/[book-id]/chunk-[index].json`.
3. **Facsimile PDF (Optional)**: Place matching printed PDF URL in `pdfUrl` field.

---

## 7. Quality Assurance & Troubleshooting Guide

### 7.1 Standard Verification Commands
Always verify modifications using the platform's four-tier test harness:
```bash
# 1. Type Safety (0 errors required)
npm run typecheck

# 2. Code Quality & Linting (0 errors, 0 warnings required)
npm run lint

# 3. Comprehensive Domain Integration Suite (11 suites, 100% pass)
npm test

# 4. Production Build & Static Page Generation
npm run build
```

### 7.2 Common Issues & Troubleshooting

| Symptom | Probable Cause | Resolution |
| :--- | :--- | :--- |
| **CORS audio playback failure** | Direct stream URL blocked by remote CDN headers | Route stream through `/api/proxy-stream?url=...` |
| **PDF canvas rendering glitch** | Simultaneous canvas reuse during rapid scrolling | Ensure `_activeRenderTask.cancel()` is called before re-rendering (handled in `PageRenderer.tsx`) |
| **Arabic text search misses terms** | Missing normalization (Hamza forms, Ta Marbuta, Tashkeel) | Always process search queries and target texts with `normalizeArabic()` from `src/lib/arabic-normalizer.ts` |
| **IndexedDB QuotaExceededError** | User device storage exhausted by cached books | Catch `DOMException` and evict least recently used entries using LRU timestamp eviction |
| **HLS Stream stall on live stations** | Dropped fragments on low-bandwidth connections | HLS player auto-switches to audio-only lower bitrate rendition via `hls.js` event recovery |

---

## 8. Summary

The Noor Platform codebase is built for extreme reliability, scholarly precision, zero memory leaks, and offline readiness. All domain components maintain strict single-responsibility boundaries, enabling long-term maintainability and effortless extensibility.
