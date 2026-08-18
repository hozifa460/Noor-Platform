## 2026-08-16T04:17:39Z

You are Worker 1 for Milestone 1 (Micro-Index Generator).
Your working directory is: c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_worker_1

Mandatory files to read first before writing any code:
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/ORIGINAL_REQUEST.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/PROJECT.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/teamwork_preview_suborch_m1_1/SCOPE.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_exp1/handoff.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_exp2/handoff.md
- c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_exp3/handoff.md

Write Ownership:
You exclusively own and may edit:
- `scripts/generate_hadiths_micro_index.mjs`
- `public/data/hadith/hadiths_micro_index.json` (generated file)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission & Implementation Specifications:
1. Refactor `scripts/generate_hadiths_micro_index.mjs` to:
   - Process all 17 Hadith collection files in `public/data/hadith/` (or fetch from remote if missing).
   - Use the canonical Arabic normalizer and robust 6-tier Matn extraction / Isnad stripping algorithms designed in Explorer 2's report (`.agents/m1_exp2/handoff.md`).
   - Extract the normalized prophetic Matn snippet (20 Arabic characters / ~4 words).
   - Use `getHadithGrade(bookId, hadithNumber)` from `src/lib/hadith-grade-engine.ts` with dictionary `['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول']`.
   - Output dictionary tuple schema:
     ```json
     {
       "books": ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah", "malik", "ahmed", "darimi", "riyad_assalihin", "bulugh_almaram", "aladab_almufrad", "shamail_muhammadiyah", "mishkat_almasabih", "nawawi40", "qudsi40", "shahwaliullah40"],
       "grades": ["صحيح", "حسن", "ضعيف", "موضوع", "مقبول"],
       "items": [
         [bookIdx, hadithId, chapterId, textPreview, gradeIdx],
         ...
       ]
     }
     ```
2. Execute the generator script to compile and generate `public/data/hadith/hadiths_micro_index.json`.
3. Verify:
   - The output file `public/data/hadith/hadiths_micro_index.json` is generated.
   - Total items count is exactly 50,884.
   - Total books is 17.
   - File size is strictly `< 3,000,000 bytes` (< 3 MB).
   - All existing tests (`npx tsx scripts/test_hadith_integration.mjs` or test scripts) pass or remain compatible.
4. Write your completion report to `c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_worker_1/handoff.md`.
5. Send a completion message to the parent orchestrator when finished.
