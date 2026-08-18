# Handoff Report: Hadith Data Survey & Micro-Index Architecture

**Agent**: `teamwork_preview_explorer_survey_1`  
**Date**: 2026-08-16  
**Type**: Hard Handoff (Task Complete)

---

## 1. Observation

1. **Collections Catalog & URLs**:
   - `src/lib/hadith-data.ts` (lines 14–207) enumerates 17 `HadithBookMeta` items (`bukhari`, `muslim`, `abudawud`, `tirmidhi`, `nasai`, `ibnmajah`, `malik`, `ahmed`, `darimi`, `riyad_assalihin`, `bulugh_almaram`, `aladab_almufrad`, `shamail_muhammadiyah`, `mishkat_almasabih`, `nawawi40`, `qudsi40`, `shahwaliullah40`).
   - Remote Hugging Face repository `https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books/` was queried for all 17 books via HEAD and GET requests. Every book returned HTTP 200 with total actual hadith count of **50,884 hadiths**, 567 chapters, and combined raw JSON payload size of **71.43 MB**.
   - `HadeethEnc_Sharh/hadeethenc_sharh.json` returned HTTP 200 with **3,553 explanations** (9.72 MB).

2. **Schema Structure in Collections**:
   - Inspected JSON files in `survey_results.json`: Each book contains root `{ id, metadata: { length, arabic: { title, author }, english }, chapters: [{ id, bookId, arabic, english }], hadiths: [{ id, idInBook, chapterId, bookId, arabic, english: { narrator, text } }] }`.

3. **Current Index Generator Sizing & Deficiencies**:
   - `public/data/hadith/hadiths_micro_index.json` currently exists with size **14.66 MB** (`15,370,717` bytes).
   - In `scripts/generate_hadiths_micro_index.mjs` (lines 48–54), records are stored as `{ b, i, c, t: normAr.slice(0, 140), g }`.
   - Inspection of Bukhari Hadith #1 (`inspect_text.mjs`) showed that the word `"بالنيات"` begins at character index 248 because lines 0–247 contain the narrator isnad (`حدثنا الحميدي عبد الله بن الزبير قال حدثنا سفيان...`). Slicing at index 140 missed the actual hadith text entirely.

4. **Compaction Benchmarks**:
   - In `benchmark_formats.mjs` and `test_trial_index.mjs`:
     - 140-char full object: **14.66 MB**
     - 60-char tuple: **5.70 MB**
     - 45-char tuple: **4.60 MB**
     - 35-char tuple: **3.81 MB**
     - 24-char tuple `[bookIdx, idInBook, chapterId, textPreview, gradeCode]` with Matn extraction: **2.91 MB** (Meets < 3.0 MB requirement).

5. **Search Query Latency & Stemming**:
   - Tested in `test_stem_search.mjs` and `test_birr.mjs`:
     - Inverted stem index search executes in **0.015 ms – 0.365 ms** (< 1ms).
     - Morphological stemming handling `ال`, `بال`, `وال`, `كال`, `لل`, `ب`, `و`, `ف`, `ل` successfully resolved `"النيات"` -> Bukhari #1, `"الصلاة"` -> Bukhari #57, `"بر الوالدين"` -> Bukhari #5970, `"الحياء"` -> Bukhari #9, and `"الجهاد"` -> Bukhari #2447.

---

## 2. Logic Chain

1. *From Observation 1 & 2*: All 17 collections are verified to exist with standard schemas and 50,884 total hadiths.
2. *From Observation 3*: The current micro-index is oversized (14.66 MB) and misses famous hadith keywords because it stores isnad boilerplate rather than the prophetic matn.
3. *From Observation 4*: Storing dictionary-encoded tuples `[bookIdx, idInBook, chapterId, textPreview, gradeCode]` with Matn extraction and a 24-character preview compresses the entire 50,884 collection down to **2.91 MB**, satisfying Acceptance Criterion R1 (< 3MB).
4. *From Observation 5*: Utilizing morphological prefix stripping (`بال` -> `نيات`, `الوالدين` -> `والدين`) with inverted stem mapping guarantees sub-millisecond (< 1ms) query latency and authentic Sahihayn ranking, fulfilling Acceptance Criterion R2.
5. *From Observation 1 & 3*: By downloading only the 2.91 MB micro-index on client startup and fetching individual book slices on-demand, memory footprint is reduced by over 95%, fulfilling Requirement R3.

---

## 3. Caveats

- In `HADITH_BOOKS_LIST`, `ahmed.json` lists catalog count 26,363, but the actual chunk hosted in the dataset contains 1,374 selected hadiths.
- Network connectivity to Hugging Face is required during build/generation if raw books are not already cached locally under `public/data/hadith/`.

---

## 4. Conclusion

1. The 17 Hadith collections (50,884 hadiths) can be indexed into `public/data/hadith/hadiths_micro_index.json` under **2.91 MB** using Matn-extracted tuples:
   `[bookIdx, hadithId, chapterId, textPreview, gradeCode]`.
2. `scripts/generate_hadiths_micro_index.mjs` and `scripts/generate_hadiths_inverted_index.mjs` must be updated with:
   - Arabic Matn extraction (stripping isnad transition markers).
   - Arabic morphological prefix normalizer (`بال`, `وال`, `كال`, `لل`, `ال`, `ب`, `و`, `ف`, `ل`).
   - Tuple format serialization with dictionary header `{ books, grades, items }`.
3. `src/lib/hadith-engine.ts` should execute global multi-token queries against the inverted index in < 1ms, eliminating full-book downloads during search.

---

## 5. Verification Method

1. **Inspect Survey Findings**:
   - Read `.agents/teamwork_preview_explorer_survey_1/survey_data.md` and `.agents/teamwork_preview_explorer_survey_1/survey_results.json`.
2. **Run Sizing & Search Benchmarks**:
   ```bash
   node .agents/teamwork_preview_explorer_survey_1/test_formats.mjs
   node .agents/teamwork_preview_explorer_survey_1/test_stem_search.mjs
   ```
3. **Invalidation Conditions**:
   - If `hadiths_micro_index.json` exceeds 3.0 MB.
   - If queries for `"النيات"` or `"بر الوالدين"` fail to locate Bukhari Hadith #1 or #5970.
