# Dispatch: Survey Explorer 1 (Hadith Data & Indexing)

## Task Description
- **Objective**: Survey the repository for all 17 Sunnah Hadith collections and existing indexing scripts.
- **Scope**:
  1. Locate all raw Hadith data files in the workspace (JSONs, data folders, public assets). Enumerate all 17 collections (names, IDs, file paths, file sizes, hadith counts).
  2. Inspect schema/structure of the hadith items in each collection (fields: id, hadithNumber, text, chapter, grade, english, arabic, etc.).
  3. Look for existing scripts in `scripts/` or elsewhere related to hadith processing, index generation, or Quran indexing.
  4. Analyze requirements for `scripts/generate_hadiths_micro_index.mjs` and the format of `hadiths_micro_index.json` to keep it under 1-3 MB while covering all 17 collections (70,000+ hadiths) with `[bookId, hadithId, chapterId, textPreview, grade]`.
- **Files to read**:
  - `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/ORIGINAL_REQUEST.md`
  - Repository files, `package.json`, `scripts/`, data directories.
- **Deliverable**:
  - Write detailed findings to `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_explorer_survey_1/survey_data.md`
  - Write standard `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_explorer_survey_1/handoff.md`
  - Send completion message to parent orchestrator.
