# Noor Platform Maintenance Tools (`tools/`)

This directory houses categorized maintenance scripts, pipelines, and developer tooling for **Noor Platform (منصة نور)**.

Following the Architectural Audit (Phase 3), the repository's scripts have been classified into modular, domain-focused subdirectories under `tools/`, with backward-compatible facades in `scripts/` to ensure zero disruption to CI/CD and developer workflows.

---

## 📁 Directory Structure

```
tools/
├── build/                 # Production build hooks & asset processors
│   ├── build.mjs          # Next.js Turbopack production build runner
│   ├── postbuild.mjs      # Post-build integrity & Service Worker cache updater
│   ├── generate-icons.js  # PWA icon generator
│   └── download_quran_fonts.mjs # Quranic calligraphy font fetcher
│
├── data/                  # Offline datasets, index builders & Hugging Face pipelines
│   ├── sync-data.mjs      # Multi-repository dataset sync with SHA-256 validation
│   ├── hadith/            # Hadith micro-indices and splitters (50,884 hadiths)
│   ├── fatwa/             # 300k fatwa shard indexers and browse builders
│   ├── books/             # Shamela & OpenITI catalog splitters & processors
│   ├── quran/             # Surah datasets, translations, and Riwayaat audio maps
│   ├── radio/             # Live Islamic radio catalog verifier & builders
│   └── sheikhs/           # Reciter & scholar portrait fetchers
│
├── audit/                 # Quality, security, and performance audit tools
│   ├── deep_audit.mjs     # Deep catalog and integrity validator
│   ├── test_security_audit.mjs   # SSRF, path traversal, and header security checks
│   ├── load_test_benchmarks.mjs  # Benchmark latency & search engine load tests
│   ├── investigate_benchmarks.mjs # Performance profiling
│   └── generate_audit_pdf.py     # Architecture report generator
│
└── tests/                 # Integration and end-to-end regression suites
    ├── run-all-tests.mjs  # Unified test runner orchestrating all integration suites
    └── test_*.mjs         # Domain integration suites (Adhkar, Quran, Hadith, Fatwa, etc.)
```

---

## 🚀 Common Commands

### 1. Build & Compilation
```bash
# Canonical build runner
node tools/build/build.mjs
# Via npm
npm run build
```

### 2. Dataset Synchronization
```bash
# Canonical sync with cryptographic SHA-256 verification
node tools/data/sync-data.mjs
# Via npm
npm run data:sync
```

### 3. Integration & Unit Tests
```bash
# Vitest unit test suite (including FSD Adhkar feature tests)
npm run test:unit

# Full regression & integration suite
npm test
```

---

## 🛡️ Compatibility Facades (`scripts/`)

To preserve 100% backward compatibility for existing documentation, local scripts, and GitHub CI workflows:
- `scripts/build.mjs` → delegates to `tools/build/build.mjs`
- `scripts/postbuild.mjs` → delegates to `tools/build/postbuild.mjs`
- `scripts/download_quran_fonts.mjs` → delegates to `tools/build/download_quran_fonts.mjs`
- `scripts/generate-icons.js` → delegates to `tools/build/generate-icons.js`
- `scripts/sync-data.mjs` → delegates to `tools/data/sync-data.mjs`
- `scripts/run-all-tests.mjs` → delegates to `tools/tests/run-all-tests.mjs`
- `scripts/deep_audit.mjs` → delegates to `tools/audit/deep_audit.mjs`
- `scripts/test_security_audit.mjs` → delegates to `tools/audit/test_security_audit.mjs`
- `scripts/investigate_benchmarks.mjs` → delegates to `tools/audit/investigate_benchmarks.mjs`
- `scripts/load_test_benchmarks.mjs` → delegates to `tools/audit/load_test_benchmarks.mjs`
- `scripts/generate_audit_pdf.py` → delegates to `tools/audit/generate_audit_pdf.py`
- All existing test and indexing scripts in `scripts/` remain operational.

