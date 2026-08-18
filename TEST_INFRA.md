# E2E Test Infra: Noor Sunnah Hadith Micro-Index & Search Platform

## Test Philosophy
- **Opaque-box & Requirement-driven**: Derived directly from `ORIGINAL_REQUEST.md`. Does not depend on internal helper implementations.
- **Methodology**: Systematic 4-Tier verification (Category-Partition, Boundary Value Analysis, Pairwise Combinations, Real-World Workloads) + Tier 5 Adversarial Hardening.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|----------------------|:------:|:------:|:------:|:------:|
| 1 | Micro-Index Generation & Size (<3MB) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | 17 Collections Full Coverage | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Matn Extraction & Isnad Stripping | Survey / Acceptance | 5 | 5 | ✓ | ✓ |
| 4 | Morphological Arabic Search | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 5 | Sub-Millisecond Search Latency (<2ms)| ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Authenticity-Priority Ranking | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 7 | Famous Hadiths Exact Matches | Acceptance Criteria | 5 | 5 | ✓ | ✓ |
| 8 | Zero RAM Bloat On-Demand Slice Loading | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **E2E Test Runner**: `scripts/test_hadith_e2e.mjs` executed via `npx tsx scripts/test_hadith_e2e.mjs`.
- **Existing Baseline Test Suite**: `scripts/test_*.mjs` (7 test files, 128 assertions).
- **Pass / Fail Semantics**: Exit code 0 if 100% tests pass; exit code 1 on any failure or latency/size regression.

## Test Tier Definitions
### Tier 1: Feature Coverage (≥5 per feature)
- Validating micro-index file existence, valid JSON syntax, header dictionary keys (`books`, `grades`, `items`).
- Validating all 17 collections are indexed with item counts > 0.
- Validating single-word keyword searches across collections.
- Validating Sahihayn priority ordering for general queries.
- Validating on-demand slice fetcher returns valid Hadith objects.

### Tier 2: Boundary & Corner Cases (≥5 per feature)
- Empty queries, single-character queries, punctuation/tashkeel-only queries.
- Very long multi-token queries (> 10 tokens).
- Non-existent hadith IDs or out-of-bounds chapter IDs.
- Slicing and fetching cold vs warm cache behavior.
- Micro-index file size limit enforcement (< 3,000,000 bytes).
- Search execution latency threshold enforcement (< 5ms max, target < 2ms).

### Tier 3: Cross-Feature Combinations (Pairwise Coverage)
- Morphological prefixes + Sahihayn ranking (e.g. `وبالوالدين` ranking Bukhari #5970 first).
- Filter by specific book + morphological stem match.
- Filter by grade + multi-token query.
- Search result selection -> On-demand slice fetch -> Full text & Sharh resolution.

### Tier 4: Real-World Application Scenarios
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Famous Hadith Search: "إنما الأعمال بالنيات" | F1, F2, F3, F4, F6, F7 | High |
| 2 | Famous Hadith Search: "بر الوالدين" | F4, F5, F6, F7 | Medium |
| 3 | Famous Hadith Search: "الوضوء" & "الصلاة" | F4, F5, F6, F7 | High |
| 4 | Rapid Interactive Search (100 sequential queries in < 200ms) | F4, F5 | High |
| 5 | Full User Journey: Global Search -> Select Result -> Fetch Slice -> Render Sharh | F1-F8 | High |

## Coverage Thresholds
- Tier 1: ≥40 test cases across 8 features
- Tier 2: ≥40 boundary test cases
- Tier 3: ≥10 pairwise interaction test cases
- Tier 4: ≥5 real-world end-to-end user scenarios
- Total: ≥95 new test assertions in `scripts/test_hadith_e2e.mjs` + 128 baseline tests = ≥223 total test points.
