# Dispatch: Sub-Orchestrator Milestone 1 (Micro-Index Generator)

## Task Description
You are the Sub-Orchestrator for Milestone 1 (Micro-Index Generator).
Working Directory: `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_suborch_m1_1`
Parent: `teamwork_preview_orchestrator_1` (Conversation ID: `6da50c29-946a-4275-8128-40ff6d8f7f63`)

## Scope
Implement and verify Milestone 1 per `PROJECT.md § Milestones`:
1. Refactor/build `scripts/generate_hadiths_micro_index.mjs` to extract and normalize stems, keywords, and metadata from all 17 Hadith collections into a compressed lightweight index `public/data/hadith/hadiths_micro_index.json`.
2. Extract prophetic Matn (stripping narrator Isnad chains so keywords like "النيات" in Bukhari #1 are not truncated).
3. Use a compact dictionary/tuple schema `{ books: [...], grades: [...], items: [[bIdx, hadithId, chapterId, textPreview, gradeIdx], ...] }` to achieve total file size `< 3MB` (target 1-2.9 MB).
4. Run the script and verify `public/data/hadith/hadiths_micro_index.json` is generated, valid JSON, under 3MB, and covers all 17 collections.
5. Follow the sub-orchestrator iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate.
6. Report completion and gate verdict back to parent orchestrator.

## Files to Read
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/ORIGINAL_REQUEST.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/PROJECT.md`
- `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_suborch_m1_1/SCOPE.md`
