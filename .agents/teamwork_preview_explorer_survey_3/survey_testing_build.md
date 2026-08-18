# Comprehensive Survey Report: Testing Framework, Build System, and Hadith Quality Infrastructure

**Generated Date**: 2026-08-16  
**Agent**: `teamwork_preview_explorer_survey_3`  
**Workspace**: `c:/projectapps/Noor-Platform-main/Noor-Platform-main`  
**Project**: Noor Platform (منصة النور)

---

## Executive Summary

This survey provides a comprehensive audit and architectural inspection of the testing infrastructure, existing test harness (128 tests), `graft` repository map validation, build pipeline (Next.js 16, TypeScript 5, ESLint 9, Tailwind CSS 4), and outlines the four-tier testing specification for the new **Hadith Micro-Index Generator and Sub-Millisecond Sunnah Search Engine**.

### Key Findings
1. **Testing Infrastructure**: Built upon native Node.js ESM and `npx tsx` (TypeScript Execution with `@/*` path alias resolution). Test scripts reside in `scripts/test_*.mjs` and execute with 100% pass rate.
2. **Existing Test Harness**: 7 test files containing 128 verified test points across Quran, Hadith, Fatwa inverted indexing (226k+ items), Arabic normalizer, Books, Security/SSRF guards, and Hugging Face dataset sync.
3. **Graft Repository Mapping**: The repository contains a complete AST wiring graph (`graft/.graph/wiring.json` with 963 nodes and 2,109 edges) and 192 per-file markdown cards under `graft/`.
4. **Build Pipeline**: Production build (`next build` with Next.js 16.1.3 Turbopack) compiles cleanly in ~10 seconds with 0 TypeScript errors and produces 12 static/dynamic routes.
5. **Hadith Testing Framework**: Formulated a 4-Tier quality assurance protocol (Micro-index integrity, sub-millisecond search performance, zero-RAM-bloat slice loading, and Sharh/authenticity grading integration).

---

## 1. Testing Infrastructure & Runner Configuration

### 1.1 Technology Stack & Architecture
- **Runtime Environment**: Node.js v24.14.1 (with native TypeScript support & ESM modules) and Bun compatibility (`bun-types`).
- **Execution Harness**: `npx tsx` is the standard test runner. It dynamically resolves TypeScript path aliases (`@/* -> ./src/*`) defined in `tsconfig.json` without requiring build artifacts.
- **Assertion Framework**: Dual support for Node's built-in `node:assert/strict` and lightweight structured assertion wrappers (`assert(condition, name, details)`).
- **Test Architecture**: Modular standalone test scripts under `scripts/test_*.mjs` providing:
  - Colorized console reports (`✅ PASS`, `❌ FAIL`).
  - Structured test suites with logical groupings (`--- Test Suite N: ... ---`).
  - Deterministic exit codes (`process.exit(0)` on success, `process.exit(1)` on any failure).
  - Integration with `.sentrux/rules.toml` architectural invariant enforcement.

---

## 2. Inventory of Existing 128 Test Points & Verification Commands

All 7 core test suites were executed and verified locally. The full suite passes with 0 failures:

| Test Script | Target Domain | Suites | Test Points | Execution Command | Result |
|---|---|---|---|---|---|
| `test_arabic_normalizer.mjs` | Arabic NLP, Tashkeel, Alef/Yaa/Taa normalization, token scoring | 6 | 16 | `npx tsx scripts/test_arabic_normalizer.mjs` | **16/16 PASS** |
| `test_books_integration.mjs` | Deluxe Islamic Library, Mus-hafs (Warsh/Qaloon), categories, languages | 3 | 12 | `npx tsx scripts/test_books_integration.mjs` | **12/12 PASS** |
| `test_fatwa_inverted_index.mjs` | Inverted index across 226,580 fatwas, morphological expansion, NLQ | 4 | 18 | `npx tsx scripts/test_fatwa_inverted_index.mjs` | **18/18 PASS** |
| `test_hadith_integration.mjs` | 17 collections catalog, remote book fetch, HadeethEnc Sharh (3500+), search | 6 | 15 | `npx tsx scripts/test_hadith_integration.mjs` | **15/15 PASS** |
| `test_huggingface_sync.mjs` | Hugging Face datasets (Telewat, Dawah, Fatawa, Books), SSRF check | 5 | 14 | `npx tsx scripts/test_huggingface_sync.mjs` | **14/14 PASS** |
| `test_quran_hub_integration.mjs` | 114 Surahs, 19 Qira'at, translations, 7 Tafsirs, 240+ MP3Quran reciters | 6 | 21 | `npx tsx scripts/test_quran_hub_integration.mjs` | **21/21 PASS** |
| `test_security_audit.mjs` | SSRF protection, IP loopback/cloud metadata blocks, sliding rate limiter | 4 | 30 | `npx tsx scripts/test_security_audit.mjs` | **30/30 PASS** |
| **Total** | **Full Platform Coverage** | **34** | **126 (128 assertions)** | *See master command below* | **100% PASS** |

### 2.1 Master Test Suite Command
To run all test suites in a single command pipeline:
```bash
npx tsx scripts/test_arabic_normalizer.mjs && npx tsx scripts/test_books_integration.mjs && npx tsx scripts/test_fatwa_inverted_index.mjs && npx tsx scripts/test_hadith_integration.mjs && npx tsx scripts/test_huggingface_sync.mjs && npx tsx scripts/test_quran_hub_integration.mjs && npx tsx scripts/test_security_audit.mjs
```

In PowerShell:
```powershell
npx tsx scripts/test_arabic_normalizer.mjs; npx tsx scripts/test_books_integration.mjs; npx tsx scripts/test_fatwa_inverted_index.mjs; npx tsx scripts/test_hadith_integration.mjs; npx tsx scripts/test_huggingface_sync.mjs; npx tsx scripts/test_quran_hub_integration.mjs; npx tsx scripts/test_security_audit.mjs
```

---

## 3. Graft Check & Codebase Validation Mechanism

### 3.1 What is Graft?
`graft` is an AST-driven codebase indexing and repository graph tool. It maps every function, class, type, export, file span, and import relationship across the project into a deterministic graph.

### 3.2 Workspace Artifacts
- `graft/.graph/wiring.json`: Contains the complete semantic graph (963 nodes, 2,109 edges across TS, TSX, JS, Python).
- `graft/*.md`: 192 per-file summary cards mirroring the source tree under `src/` and `scripts/`.
- `graft/INDEX.md`: Concept index and query entry point.

### 3.3 What `graft check` Validates
1. **Symbol & Span Consistency**: Ensures file spans (`L{start}-L{end}`), line counts, and AST symbols in `wiring.json` accurately match actual source code lines.
2. **Export Integrity**: Verifies all exported functions and types declared in `wiring.json` exist without breaking dependent callers.
3. **Graph Drift Detection**: Detects any uncommitted or untracked changes in the AST nodes by comparing content hashes (`body_hash`).
4. **Architectural Complement**: Works alongside `.sentrux/rules.toml` which validates layer order (`types` -> `lib` -> `stores` -> `hooks` -> `components` -> `app`), acyclicity (0 circular dependencies), and maximum file lengths.

---

## 4. Build Configuration & Validation

### 4.1 Next.js 16 & Turbopack
- **Next.js Version**: 16.1.3 (React 19.0.0, React DOM 19.0.0).
- **Configuration (`next.config.ts`)**:
  - `output: "standalone"` for optimized production containerization.
  - `reactStrictMode: true`.
  - `typescript: { ignoreBuildErrors: false }` — strict zero-error policy.
  - Hardened security headers: CSP, X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), Referrer-Policy, Strict-Transport-Security, Permissions-Policy.
- **Build Verification**: `npx next build` compiled in **10.2s** with 12 routes generated (10 static/prerendered, 2 dynamic server routes).

### 4.2 TypeScript Configuration (`tsconfig.json`)
- Target: `ES2017`, `moduleResolution: "bundler"`, `paths: { "@/*": ["./src/*"] }`.
- Strict mode enabled (`strict: true`).

### 4.3 ESLint 9 Flat Config (`eslint.config.mjs`)
- Configured with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Ignored paths: `node_modules/**`, `.next/**`, `public/**/*.js`, `examples/**`.
- *Note for developers*: `react-hooks/set-state-in-effect` is active under ESLint 9. Synchronous `setState` inside `useEffect` should be avoided or derived to avoid cascading renders.

### 4.4 PostCSS & Tailwind CSS v4
- Uses `@tailwindcss/postcss: ^4` and `tailwindcss: ^4` with standard `@theme` variables and `tailwindcss-animate`.

---

## 5. Guidelines and Patterns for Hadith Testing (Tiers 1-4)

To ensure the new **Hadith Micro-Index Generator (`hadiths_micro_index.json`)** and **Sub-Millisecond Sunnah Search Engine** meet all acceptance criteria, tests must be organized into four progressive tiers:

```
┌─────────────────────────────────────────────────────────────┐
│ Tier 4: Sharh & Authenticity Grade Engine Integration       │
├─────────────────────────────────────────────────────────────┤
│ Tier 3: Zero-RAM Slice Loading & On-Demand Book Slicing     │
├─────────────────────────────────────────────────────────────┤
│ Tier 2: Sub-Millisecond Morphological Search & Ranking      │
├─────────────────────────────────────────────────────────────┤
│ Tier 1: Micro-Index File Integrity & Structural Validation  │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1: Micro-Index File Integrity & Structural Validation
- **Objective**: Validate the generated `public/data/hadith/hadiths_micro_index.json`.
- **Target Metrics**:
  - File size: **< 3MB** (ideally compressed to 1.5–2.5MB).
  - Total Hadiths indexed: **>= 70,000 hadiths**.
  - Complete collection coverage: Exactly **17 Hadith collections** (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Malik, Musnad Ahmad, Darimi, Nawawi 40, Qudsi 40, Shah Waliullah 40, Riyad al-Salihin, Mishkat al-Masabih, Bulugh al-Maram, Shamail Muhammadiyah, Hisn al-Muslim).
  - Data structure per entry: `[bookId, hadithId, chapterId, textPreview, grade]` with no undefined/null fields.

### Tier 2: Sub-Millisecond Morphological Search & Performance Verification
- **Objective**: Benchmark query speed and search accuracy across 70,000+ hadiths.
- **Target Metrics**:
  - Global query execution time: **< 2ms** in-memory search (and < 5ms under concurrent load).
  - Famous query accuracy:
    - `"النيات"` -> Top result returns Bukhari Hadith #1 (*إنما الأعمال بالنيات*).
    - `"الوضوء"` -> Accurate matches in Bukhari, Muslim, Abu Dawud, Nasai.
    - `"بر الوالدين"` -> Authentic narrations from Bukhari, Muslim, Tirmidhi.
    - `"الصلاة"` / `"الصيام"` / `"الحج"` -> High recall across Sunan collections.
  - Multi-token and morphological variations:
    - Root matching (e.g. `"يتوضأ"` / `"الوضوء"`, `"صلى"` / `"الصلاة"`).
    - Prefix stripping (`ال`, `و`, `ف`, `ب`, `ل`).
    - Alef and Taa Marbuta normalization (`إ/أ/آ` -> `ا`, `ة` -> `ه`, `ى` -> `ي`).
  - Authenticity prioritization: Sahihayn (Bukhari, Muslim) results are ranked first when match scores are equal.
  - Precision guard: Nonsense/gibberish queries (e.g. `"xyz_nonexistent_99"`) must return 0 results.

### Tier 3: Zero-RAM Slice Loading & On-Demand Book Slicing
- **Objective**: Ensure the UI does not download or retain multi-megabyte book JSONs (e.g. 12MB+ `ahmed.json` or `bukhari.json`) in client memory.
- **Target Metrics**:
  - Client memory footprint during search: **< 15MB total heap**.
  - On-demand slice fetching: Clicking a search result loads only the required Hadith item and chapter context.
  - Caching & offline strategy: Fetched slices are stored in IndexedDB (`hadith-storage.ts`) and memory cache (`Map`), avoiding redundant network calls.

### Tier 4: Sharh & Authenticity Grade Engine Integration
- **Objective**: Seamless integration with the 3,500+ HadeethEnc Sharh dataset and grading rules.
- **Target Metrics**:
  - Inverted index matching: Instant O(1) retrieval of explanation and vocabulary benefits for matched Hadiths.
  - Grading rules:
    - Consensus Sahih for Sahih al-Bukhari and Sahih Muslim (`صحيح - إجماع الأمة`).
    - Accurate parsing of explicit grades (Hasan, Sahih, Daif) from Tirmidhi, Abu Dawud, and Albani classifications.

---

## 6. Recommendations & Next Steps for Implementation Team

1. **Micro-Index Generation**:
   - Run indexing script `scripts/generate_hadiths_micro_index.mjs`.
   - Optimize serialization format (short tuple arrays `[b, i, c, t, g]` or integer mappings) to guarantee the final index size is **< 3MB** (currently 27.8MB unoptimized).
2. **Search Engine Optimization**:
   - Utilize pre-tokenized prefixes and normalized stem lookups in `src/lib/hadith-engine.ts`.
3. **Automated Verification**:
   - Run the 7 existing test scripts (`scripts/test_*.mjs`) plus the newly generated Hadith unit/integration tests to guarantee 100% pass rate.
   - Run `npx next build` to guarantee 0 TypeScript/build errors.
