# BRIEFING — 2026-08-16T04:14:00Z

## Mission
Investigate Compact Schema Design & Size Budget Optimization for `hadiths_micro_index.json` to guarantee < 3MB size for 50,884 hadiths.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_exp3
- Original parent: b4cf6177-8e92-4654-87fd-9164eae21dd9
- Milestone: Milestone 1 (Micro-Index Generator)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Index size strictly < 3,000,000 bytes (< 3MB), ideally 1.5 - 2.8 MB for 50,884 hadiths
- Work in `.agents/m1_exp3` only for metadata/handoffs

## Current Parent
- Conversation ID: b4cf6177-8e92-4654-87fd-9164eae21dd9
- Updated: 2026-08-16T04:14:00Z

## Investigation State
- **Explored paths**:
  - `public/data/hadith/hadiths_micro_index.json` (original 27.87 MB file analyzed)
  - `scripts/generate_hadiths_micro_index.mjs`
  - `src/lib/hadith-data.ts`, `src/lib/arabic-normalizer.ts`, `src/lib/hadith-grade-engine.ts`, `src/lib/hadith-engine.ts`
  - 50,884 hadith records across all 17 collections
- **Key findings**:
  - Tuple schema `[bookIdx, hadithId, chapterId, textPreview, gradeIdx]` + dictionary tables (`books`, `grades`) saves ~2.04 MB in pure syntax overhead.
  - Fixed structural metadata + delimiters for 50,884 items takes exactly 840,937 bytes (~0.802 MB, 16.53 bytes/item).
  - Removing 332,745 invisible Unicode formatting marks saves 1.26 MB across the dataset.
  - Optimal `textPreview` rule: 4 words capped at 20 characters from cleaned Matn produces **2,494,745 bytes (~2.38 MB)** with a **505 KB safety margin** below the 3.0 MB hard ceiling.
- **Unexplored areas**: None for M1 Exp3 scope.

## Key Decisions Made
- Recommended Schema: `{ books: string[], grades: string[], items: [number, number, number, string, number][] }`.
- Recommended Preview: 4 words capped at 20 characters (`words.slice(0, 4).join(' ').slice(0, 20).trim()`).
- Compact JSON Serialization: standard `JSON.stringify` with UTF-8 raw Arabic.

## Artifact Index
- DISPATCH.md — Initial task dispatch
- BRIEFING.md — Persistent working memory
- progress.md — Liveness and progress tracking
- simulate_budget.mjs — Simulation script for char limits
- calculate_exact_budget.mjs — Exact per-field byte breakdown
- compare_strategies.mjs — Strategy comparison and headroom calculation
- final_size_grid.mjs — Final size grid evaluation
- handoff.md — Complete 5-component investigation report
