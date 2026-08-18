# Noor Platform — System Architecture & Engineering Blueprint

## 1. Executive Overview
Noor Platform (منصة نور) is an enterprise-grade digital platform designed to preserve, organize, and serve the rich heritage of Islamic knowledge — encompassing the Holy Quran, authentic Prophetic Hadith, Classical Islamic Texts (Shamela & OpenITI), Fatwas, and Live Audio Streams.

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Layer                    │
│   (Next.js App Router, Responsive Hubs, Radix UI, Tailwind)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    State & Service Layer                    │
│   (Zustand Stores, Domain Services, Intent Search Engines)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Data & Ingestion Pipeline                  │
│  (IndexedDB, Web Workers, Sharded Indexes, Validation Schema)│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Security & Network Sandbox                 │
│  (SSRF Hardening, PDF Bounded Semaphores, SHA-256 Integrity)│
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Domain Separation
- **Quran Domain**: Surah metadata, audio recitation streams (Hafs, Warsh, Qaloon, etc.), tafsir engines, verse sync.
- **Hadith Domain**: Kutub al-Sittah + classical collections, HadeethEnc Sharh dataset, Grade validation, micro-prefix search index.
- **Books Domain**: Shamela 4.0 verified catalog (8,589 books), OpenITI classical texts, interactive PDF reader with canvas/text fallback.
- **Fatwa Domain**: HuggingFace verified fatwa shards with inverted keyword search.
- **Radio Domain**: 156+ verified 24/7 Islamic streaming stations.

---

## 3. Performance & Offline Strategy
1. **Dynamic Code Splitting**: All heavy hub views are loaded on-demand via Next.js dynamic imports.
2. **Client-side Web Worker Offloading**: CPU-intensive inverted index searches run on background worker threads without blocking UI responsiveness.
3. **PWA & Offline Resilience**: Service Worker caches critical core assets with automated cache eviction and versioning.
