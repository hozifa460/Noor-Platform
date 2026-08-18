# Dispatch: E2E Test Suite Writer

## Mission
Author the comprehensive 4-Tier E2E test suite in `scripts/test_hadith_e2e.mjs`.

## Input Files
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/ORIGINAL_REQUEST.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/PROJECT.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/TEST_INFRA.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_explorer_e2e_1/handoff.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_spec_miner_e2e_1/handoff.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_explorer_e2e_2/handoff.md`

## Write Ownership
- `scripts/test_hadith_e2e.mjs` (exclusive)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Requirements
1. Implement all 4 Tiers:
   - Tier 1: Feature Coverage (42 test cases across 8 features)
   - Tier 2: Boundary & Corner Cases (42 test cases)
   - Tier 3: Cross-Feature Combinations (12 pairwise tests)
   - Tier 4: Real-World Application Scenarios (6 user scenarios)
   Total: 102 tests.
2. Must execute cleanly via `npx tsx scripts/test_hadith_e2e.mjs` and output structured tier-by-tier progress, latency benchmarks, size checks, and return exit code 0 when all tests pass (or exit code 1 if any fail).
3. Test against actual project code (`src/lib/hadith-engine.ts`, `src/lib/arabic-normalizer.ts`, `src/lib/hadith-data.ts`, `src/lib/hadith-grade-engine.ts`, `public/data/hadith/hadiths_micro_index.json`).
4. Support both schema representations (tuple dictionary `{ books, grades, items }` and flat array `[{ b, i, c, t, g }]`) gracefully where appropriate.
5. Run the test script to verify that it executes properly and record the execution output in `handoff.md`.

## Required Output
Write your completion report to `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_test_writer_e2e_1/handoff.md`.
Send a completion message back when done.

## 2026-08-16T04:10:38Z
Implement the comprehensive 4-Tier E2E test suite in `scripts/test_hadith_e2e.mjs`.
Write Ownership: `scripts/test_hadith_e2e.mjs` (exclusive)
1. Write the complete, production-grade `scripts/test_hadith_e2e.mjs` incorporating the full 102 test cases across all 4 Tiers.
2. Execute `npx tsx scripts/test_hadith_e2e.mjs` to verify test suite functionality and document the test output.
3. Write your report with passing test logs to `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_test_writer_e2e_1/handoff.md`.
4. Send a message back when completed.

