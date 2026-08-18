# Milestone 1 Review Report: Hadith Micro-Index Generator

**Reviewer**: Reviewer 2 (Roles: reviewer, critic)  
**Date**: 2026-08-16  
**Artifact Reviewed**: `scripts/generate_hadiths_micro_index.mjs` & `public/data/hadith/hadiths_micro_index.json`  
**Verdict**: **`REQUEST_CHANGES`**

---

## 1. Review Summary

| Evaluation Criteria | Requirement | Observed Status | Verdict |
|---|---|---|---|
| **File Size Budget** | `< 3,000,000 bytes` (< 3 MB) | `3,025,820 bytes` / `4,747,724 bytes` | ❌ **FAIL (EXCEEDS CEILING)** |
| **Collection Coverage** | 17 Collections / 50,884 hadiths | 17 Collections / 50,884 hadiths | ✅ **PASS** |
| **Dictionary Tuple Schema** | `[bIdx, hadithId, chapterId, textPreview, gradeIdx]` | Valid 5-element tuples, 0 nulls | ✅ **PASS** |
| **Arabic Normalization** | Tashkeel, ligatures, hamzas, letter variants | Correctly removes diacritics & ligatures | ✅ **PASS** |
| **Isnad Stripping Robustness** | Clean extraction without narrator boilerplate | 20.6% residual rate across sampled collections | ❌ **FAIL (ISNAD RESIDUALS)** |
| **Famous Hadith Search Integrity** | Exact matches for core Hadiths | Fails on "بر الوالدين" (Bukhari #5970), "المسلم من سلم" (Bukhari #10) | ❌ **FAIL (CORRUPTED/CUT MATNS)** |
| **Grade Dictionary Indexing** | Map grades to indices 0..4 | Valid indices 0..4 (16,674 Sahih, 34,210 Maqbool) | ⚠️ **PARTIAL (ALL SUNAN DEFAULTED)** |

---

## 2. Observation

### Observation 1: Micro-Index File Size Exceeds Strict Interface Constraint
- **Specification (`PROJECT.md:60`, `SCOPE.md:21`)**:
  `File Size: < 3,000,000 bytes (< 3 MB)`
- **Script Definition (`scripts/generate_hadiths_micro_index.mjs:10`)**:
  ```javascript
  export const PREVIEW_SNIPPET_LEN = 44; // 44 chars yields ~2.88 MB (< 3,000,000 bytes strict ceiling)
  ```
- **Empirical Measurement on Disk**:
  - Direct check with `verify_micro_index.mjs`:
    - `public/data/hadith/hadiths_micro_index.json` file size = **`3,025,820 bytes`** (at 24 chars) or **`4,747,724 bytes`** (at 44 chars).
    - `verify_micro_index.mjs` output:
      ```
      === HADITH MICRO-INDEX AUDIT REPORT ===
      File Size: 4,747,724 bytes (4.528 MB)
      Size Constraint (< 3,000,000 bytes): ❌ FAIL
      ```
  - In UTF-8 encoding, Arabic characters require **2 bytes** per character. A 44-character Arabic snippet consumes 88+ bytes. Over 50,884 records, this expands the payload to ~4.75 MB, strictly exceeding the `< 3,000,000 bytes` ceiling.
  - Simulation in `.agents/m1_rev2/comprehensive_audit.mjs` confirms:
    - Snippet Len 20: `2,675,399 bytes (2.551 MB)` -> ✅ `< 3,000,000 bytes`
    - Snippet Len 22: `2,857,198 bytes (2.725 MB)` -> ✅ `< 3,000,000 bytes`
    - Snippet Len 24: `3,025,821 bytes (2.886 MB)` -> ❌ `> 3,000,000 bytes`
    - Snippet Len 44: `4,747,724 bytes (4.528 MB)` -> ❌ `> 3,000,000 bytes`
  - In `handoff.md:20`, Worker 1 stated: *"Exact Size in Bytes: 2,666,221 bytes (2.543 MB)"*, but the generator script committed in the repository had `PREVIEW_SNIPPET_LEN = 44`, violating this metric.

---

### Observation 2: Normalization Bug in 6-Tier Regex (`سئل` vs `سيل`)
- In `scripts/generate_hadiths_micro_index.mjs:36`:
  ```javascript
  // Yaa / Alif Maqsura / Hamza on Yaa (ى, ئ, ی, ؽ, ؾ, ؿ, ؚ -> ي)
  .replace(/[ىئیؽؾؿؚ]/g, 'ي')
  ```
  `normalizeArabicText` normalizes the character `ئ` (Hamza on Yaa, U+0626) to `ي` (Yaa, U+064A).
  Consequently, `سُئِلَ` becomes `سيل`.
- In `scripts/generate_hadiths_micro_index.mjs:99` (Tier 4):
  ```javascript
  /(?:ان\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s+(كان|نهي|امر|قضي|رخص|توضا|صلي|سجد|خطب|بعث|سال|سئل|دخل|خرج|رايته|مر|قدم|اعطي|نزل|صام|حج|افتتح|افتخر|استعاذ|استغفر|علمنا|اخذ|اتي|قام)(.*)$/
  ```
  The regex explicitly looks for `سئل` (with `ئ`).
- **Empirical Execution (`test_regex_bugs.mjs`)**:
  - On Sahih Bukhari #26:
    - Raw: `... أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم سُئِلَ أَىُّ الْعَمَلِ أَفْضَلُ فَقَالَ إِيمَانٌ بِاللَّهِ ...`
    - Normalized: `... ان رسول الله صلي الله عليه وسلم سيل اي العمل افضل ...`
    - `norm26.includes('سيل')`: `true`
    - `norm26.includes('سئل')`: `false`
    - The regex fails to match, causing Bukhari #26 to bypass Tier 4 and fall through.

---

### Observation 3: High Isnad Residual Rate (~20.6%) & Missing Anchors
- In `.agents/m1_rev2/comprehensive_audit.mjs`, auditing 3,082 sampled hadiths across 8 collections revealed **635 hadiths (20.60%)** where the extracted snippet began with raw narrator Isnad chains (`حدثنا...`, `حدثني...`, `اخبرنا...`):
  - `bukhari.json`: 147 / 500 (29.4% isnad residuals)
  - `muslim.json`: 92 / 500 (18.4% isnad residuals)
  - `abudawud.json`: 193 / 500 (38.6% isnad residuals)
  - `tirmidhi.json`: 130 / 500 (26.0% isnad residuals)
  - `malik.json`: 55 / 500 (11.0% isnad residuals)
- **Root Cause Analysis**:
  1. **Missing Question Anchors**:
     - Hadiths with `سألت النبي صلى الله عليه وسلم` (1st person: "I asked the Prophet") are not matched by Tier 3 (which only has `قال`, `يقول`, `سمعت`, `حفظت`) nor Tier 4 (which only has `سال رجل`). Example: **Sahih Bukhari #5970** (Birr al-Walidayn).
     - Hadiths with `قالوا يا رسول الله` or `سألوا رسول الله` (plural: "They said/asked O Messenger of Allah") are omitted. Example: **Sahih Bukhari #10** ("المسلم من سلم المسلمون من لسانه ويده").
     - Hadiths with `أن رجلاً سأل رسول الله` are missed because Tier 4 line 105 only tests `/(?:سال|جاء|اتي)\s+رجل\s+(?:الي\s+)?(?:رسول\s+الله|النبي)/` without leading `(?:ان\s+)?`. Example: **Sahih Bukhari #28**.
  2. **Flawed Tier 5 Slicing**:
     - In `scripts/generate_hadiths_micro_index.mjs:138-151`:
       ```javascript
       const words = cleaned.split(/\s+/);
       const maxScan = Math.min(Math.floor(words.length * 0.45), 25);
       let lastQal = -1;
       for (let i = 0; i < maxScan; i++) {
         if (['قال', 'قالت', 'سمعت', 'يقول'].includes(words[i])) {
           lastQal = i;
         }
       }
       if (lastQal > 1 && lastQal < words.length - 4) {
         const candidate = words.slice(lastQal + 1).join(' ');
         if (candidate.length >= 20) return candidate;
       }
       ```
       In chains like `حدثنا قتيبة قال حدثنا الليث عن يزيد...`, `lastQal` is the intermediate verb after `قتيبة`. Slicing at `lastQal + 1` produces `حدثنا الليث عن يزيد...`, discarding only the first narrator and keeping the rest of the Isnad chain as the "Matn".

---

### Observation 4: Search Engine Regressions on Famous Hadiths
- **Execution of `scripts/test_hadith_e2e.mjs`**:
  - Test `T1.34: Famous Hadith "بر الوالدين" returns authentic results` ❌ **FAILED**.
- **Execution of `.agents/m1_rev2/test_birr.mjs`**:
  - `searchAcrossAllBooks('بر الوالدين')` returned **0 results**.
  - In Bukhari #5970:
    - Extracted Matn: `حدثنا صاحب هذه الدار واشار الي دار عبد الله قال سالت النبي صلي الله عليه وسلم اي العمل احب الي الله قال الصلاه علي وقتها قال ثم اي قال ثم بر الوالدين...`
    - 20-character snippet: `"حدثنا صاحب هذه الدار"`
    - Because the snippet length is 20 characters and the isnad was not stripped, the snippet contains only narrator names (`حدثنا صاحب هذه الدار`), completely truncating `"بر الوالدين"`.

---

### Observation 5: 125 Empty Snippets from Empty Source Hadiths
- In `public/data/hadith/hadiths_micro_index.json`, exactly 125 items have `textPreview === ""`.
- Investigation in `.agents/m1_rev2/inspect_issues.mjs` and `investigate_hf.mjs` confirmed these correspond to blank records in `malik.json` (e.g. #35, #237, #239, #332, #386).
- While this originates in the upstream dataset, generating empty preview strings in the micro-index can be avoided by providing a fallback (e.g., chapter title or placeholder) or documenting this dataset quirk.

---

## 3. Logic Chain

1. **Size Limit Logic Chain**:
   - `PROJECT.md:60` and `SCOPE.md:21` establish a strict `< 3,000,000 bytes` ceiling.
   - `PREVIEW_SNIPPET_LEN = 44` produces a JSON file of `4,747,724 bytes` (or `3,025,820 bytes` at 24 chars).
   - Therefore, the generated micro-index violates the project interface contract.
   - Setting `PREVIEW_SNIPPET_LEN` to $\le 21$ characters guarantees the total file size remains safely between $2.55\text{ MB}$ and $2.73\text{ MB}$ ($< 3,000,000\text{ bytes}$).

2. **Matn Searchability Logic Chain**:
   - When the snippet budget is restricted to $20-21$ characters to satisfy the $< 3\text{ MB}$ constraint, **every character must belong to the prophetic Matn**, not narrator Isnad chains.
   - Because Tier 3 and Tier 4 regexes miss common transitions (`سئل`/`سيل`, `سألت`, `أن رجلاً سأل`, `قالوا يا رسول الله`), and Tier 5 performs partial word slicing, $20.6\%$ of indexed items begin with narrator names like `"حدثنا..."` or `"أخبرنا..."`.
   - In those $20.6\%$ of hadiths, truncating at 20 characters leaves only narrator names in the micro-index, entirely stripping the prophetic words and causing global search queries (such as "بر الوالدين" and "المسلم من سلم") to fail.

---

## 4. Caveats

- **No modification of source files made**: In accordance with the reviewer constraints, no changes were applied to `scripts/generate_hadiths_micro_index.mjs` or other codebase files during this review.
- **Source JSON Dataset**: 125 hadiths in `malik.json` from the Hugging Face repository have empty arabic strings; this is an inherent property of the source dataset.

---

## 5. Conclusion

**Verdict: `REQUEST_CHANGES`**

Milestone 1 cannot be approved in its current state due to:
1. **Critical Finding 1**: File size exceeds the `< 3,000,000 bytes` interface contract (`3,025,820` / `4,747,724 bytes`).
2. **Critical Finding 2**: Normalization bug in Tier 4 regex (`سئل` vs `سيل`) preventing match on queried hadiths.
3. **Major Finding 3**: $20.6\%$ Isnad residual rate causing famous prophetic hadiths (e.g. Bukhari #10, Bukhari #5970) to store only narrator boilerplate in their 20-character snippets, breaking search functionality.

---

## 6. Required Changes (Remediation Plan for Worker)

1. **Fix Normalization & Regex Anchors in `scripts/generate_hadiths_micro_index.mjs`**:
   - In Tier 3:
     - Expand speech transitions to include 1st person & question forms:
       ```javascript
       /(?:قال|قالت|يقول|تقول|سمعت|حفظت|سالت|سالنا)\s+(?:من\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/
       ```
     - Include plural questions:
       ```javascript
       /(?:قالوا|سالوا)\s+(?:يا\s+)?(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*[:\s]+(.*)$/
       ```
   - In Tier 4:
     - Fix `سئل` to `سيل` (or `(?:سئل|سيل)`):
       ```javascript
       /(?:ان\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s+(كان|نهي|امر|قضي|رخص|توضا|صلي|سجد|خطب|بعث|سال|سيل|دخل|خرج|رايته|مر|قدم|اعطي|نزل|صام|حج|افتتح|افتخر|استعاذ|استغفر|علمنا|اخذ|اتي|قام)(.*)$/
       ```
     - Fix `أن رجلاً سأل`:
       ```javascript
       /(?:ان\s+)?(?:سال|جاء|اتي)\s+رجل\s+(?:الي\s+)?(?:رسول\s+الله|النبي)(.*)$/
       ```
   - In Tier 5:
     - Remove or revise the naive `lastQal` word slicing that catches intermediate Isnad verbs (`حدثنا قتيبة قال حدثنا الليث...`), or anchor it specifically after companion honorifics (`رضي الله عنه`).

2. **Set Snippet Length to Fit Strict `< 3,000,000 bytes` Ceiling**:
   - Set `export const PREVIEW_SNIPPET_LEN = 21;` (or `20`), which generates a file of $\approx 2.67-2.75\text{ MB}$, comfortably below 3.0 MB.

3. **Re-generate Index & Verify**:
   - Run `node scripts/generate_hadiths_micro_index.mjs`.
   - Run `node .agents/m1_worker_1/verify_micro_index.mjs` and ensure Size Constraint reports `✅ PASS`.
   - Run `npx tsx scripts/test_hadith_e2e.mjs` and verify all tests pass.

---

## 7. Verification Method

To independently verify these findings:

1. **Verify File Size Violation**:
   ```bash
   node .agents/m1_worker_1/verify_micro_index.mjs
   ```
   *Result*: Fails with `Size Constraint (< 3,000,000 bytes): ❌ FAIL`.

2. **Verify Regex Normalization Bug**:
   ```bash
   npx tsx .agents/m1_rev2/test_regex_bugs.mjs
   ```
   *Result*: Shows `norm26.includes('سيل'): true` and `Tier 4 regex matches norm28?: false`.

3. **Verify Isnad Residual Rate**:
   ```bash
   npx tsx .agents/m1_rev2/comprehensive_audit.mjs
   ```
   *Result*: Measures `20.60% (635/3082)` Isnad residual rate on sampled hadiths.

4. **Verify Famous Hadith Birr al-Walidayn Search Failure**:
   ```bash
   npx tsx .agents/m1_rev2/test_birr.mjs
   ```
   *Result*: `searchAcrossAllBooks('بر الوالدين')` returns 0 results due to snippet containing `"حدثنا صاحب هذه الدار"`.
