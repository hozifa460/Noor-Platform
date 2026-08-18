# Orchestration Plan: Hadith Micro-Index & Search Engine

## Objective
Build a lightweight micro-index (< 3MB) for 17 Sunnah collections (70,000+ hadiths), sub-millisecond search engine (< 2ms queries), on-demand slice loading (zero RAM bloat in client memory), passing all 128 existing tests + new tests, `graft check`, and `next build`.

## Plan Steps
1. **Phase 0: Multi-Perspective Survey (3 Explorers)**
   - Explorer 1: Sunnah collections data structure, raw file locations, existing scripts/generators, JSON formats.
   - Explorer 2: Search architecture, existing search utilities, normalization/stemming methods, UI search components and integration points.
   - Explorer 3: Testing environment, test runners, existing 128 tests, `graft check` configuration, build setup (`next build`).

2. **Phase 1: Synthesis & Decomposition**
   - Synthesize findings into `PROJECT.md` (Architecture, Feature Inventory, Milestones, Interface Contracts, Code Layout).
   - Establish `TEST_INFRA.md` (Opaque-box test matrix across Tiers 1-4).

3. **Phase 2: Dual Track Execution**
   - Track A: E2E Testing Orchestrator (Requirement-driven test suite across all 4 tiers).
   - Track B: Implementation Track (Milestone-based execution).
     * M1: Micro-Index Generator (`scripts/generate_hadiths_micro_index.mjs` -> `hadiths_micro_index.json` < 3MB).
     * M2: Sub-Millisecond Search Engine (morphological, multi-token Arabic queries, authenticity ranking).
     * M3: On-Demand Slice Fetching & UI Integration (zero RAM bloat).

4. **Phase 3: Integration & Final Verification**
   - Phase 1 of Final Milestone: 100% E2E test pass + 128 existing tests + `graft check` + `next build`.
   - Phase 2 of Final Milestone: Adversarial coverage hardening (Tier 5).

5. **Phase 4: Completion & Reporting**
   - Report results to Sentinel and claim victory.
