## 2026-08-16T04:42:09Z
You are Worker 2 for Milestone 1 (Micro-Index Generator) — Iteration 2 Remediation.
Your working directory is: c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_worker_2

Mandatory files to read first before writing any code:
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/ORIGINAL_REQUEST.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/PROJECT.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_suborch_m1_1/SCOPE.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_rev2/handoff.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_chal1/handoff.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_chal2/handoff.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/scripts/generate_hadiths_micro_index.mjs

Write Ownership:
You exclusively own and may edit:
- `scripts/generate_hadiths_micro_index.mjs`
- `public/data/hadith/hadiths_micro_index.json`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Remediation Tasks to Execute:
1. **Fix File Size Ceiling (`< 3,000,000 bytes`)**:
   - Set `PREVIEW_SNIPPET_LEN = 20` (or `21`) in `scripts/generate_hadiths_micro_index.mjs`.
   - Ensure the generated `public/data/hadith/hadiths_micro_index.json` is strictly `< 3,000,000 bytes` (target 2.5 - 2.7 MB).

2. **Fix Normalization Regexes**:
   - In `normalizeArabicText()`: strip `\u2013` (En-dash), `\uFD3E\uFD3F` (Quranic brackets), `?` (ASCII question mark), and `[\uF000-\uF0FF]` (private use glyphs).
   - In `extractHadithMatn()`:
     - Fix `سئل` vs `سيل`: In Tier 4, use `(?:سئل|سيل)` (since `normalizeArabicText` normalizes `ئ` to `ي`).
     - Add 1st person and question anchors in Tier 3/4:
       `/(?:قال|قالت|يقول|تقول|سمعت|حفظت|سالت|سالنا)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/`
       `/(?:قالوا|سالوا)\s+(?:يا\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*[:\s]+(.*)$/`
       `/(?:ان\s+)?(?:سال|جاء|اتي)\s+رجل\s+(?:الي\s+)?(?:رسول\s+الله|النبي)(.*)$/`
     - Strip conversational preamble before core prophetic speech where applicable:
       - `"أن رجلا قال للنبي صلى الله عليه وسلم أوصني قال : لا تغضب"` -> extracts `"لا تغضب"`.
       - `"يا غلام إني أعلمك كلمات : احفظ الله يحفظك"` -> extracts `"احفظ الله يحفظك"`.
       - `"سألت النبي صلى الله عليه وسلم أي العمل أحب إلى الله؟ قال: الصلاة... قال: ثم بر الوالدين"` -> ensures `"بر الوالدين"` or key question tokens are not lost in isnad.
     - Fix Tier 5 isnad word slicing: remove naive `lastQal` scan that leaves intermediate isnad chains (`حدثنا الليث...`).

3. **Fix Data Sanitization**:
   - Integer chapter IDs: `Math.floor(Number(h.chapterId) || 0)`.
   - Fallback for empty `h.arabic` in `malik` (125 items): provide fallback string e.g. `'حديث في الموطا'` or extracted title so `textPreview` is never empty.

4. **Regenerate and Verify**:
   - Run `node scripts/generate_hadiths_micro_index.mjs`.
   - Run `node scripts/test_chal2_micro_index_adversarial.mjs` (or test scripts in `.agents/m1_chal1/`, `.agents/m1_rev2/`).
   - Run `npx tsx scripts/test_hadith_integration.mjs`.
   - Verify file size is strictly `< 3,000,000 bytes` on disk and covers all 17 collections (50,884 hadiths).
5. Write your handoff report to `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_worker_2/handoff.md`.
6. Send completion message to parent.
