# Scope: E2E Testing Track

## Objective
Implement comprehensive 4-Tier test suite in `scripts/test_hadith_e2e.mjs` and publish `TEST_READY.md`.

## Features to Test
- F1: Micro-index generation & size (< 3MB)
- F2: All 17 Sunnah collections coverage
- F3: Matn extraction & Isnad stripping
- F4: Morphological Arabic search
- F5: Sub-millisecond search latency (< 2ms, max < 5ms)
- F6: Authenticity-priority ranking (Bukhari/Muslim first)
- F7: Famous Hadiths exact matches
- F8: On-demand slice loading (zero RAM bloat)

## Deliverables
- `scripts/test_hadith_e2e.mjs`
- `TEST_READY.md` at project root
- `handoff.md` in sub-orchestrator working directory
