# BRIEFING — 2026-08-16T04:37:00Z

## Mission
Adversarial and quality review of Milestone 1 (Micro-Index Generator): verify Arabic normalization, 6-tier Matn extraction, Isnad stripping, grade dictionary indexing, integrity compliance, and empirical correctness across all Hadith collections.

## 🔒 My Identity
- Archetype: reviewer
- Roles: reviewer, critic
- Working directory: c:/projectapps/Noor-Platform-main/Noor-Platform-main/.agents/m1_rev2
- Original parent: b4cf6177-8e92-4654-87fd-9164eae21dd9
- Milestone: Milestone 1 (Micro-Index Generator)
- Instance: Reviewer 2

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Review Arabic normalization and 6-tier Matn extraction / Isnad stripping logic in `scripts/generate_hadiths_micro_index.mjs`
- Verify Isnad chains are cleanly stripped without corrupting prophetic sayings
- Verify grade indexing (`getHadithGrade` -> grade dictionary indices 0..4)
- Run empirical checks across collections (Sahihayn, Sunan, Musnad Ahmad, Muwatta, Forties)
- Write complete review report to `handoff.md` with explicit verdict `APPROVE` or `REQUEST_CHANGES`

## Current Parent
- Conversation ID: b4cf6177-8e92-4654-87fd-9164eae21dd9
- Updated: 2026-08-16T04:37:00Z

## Review Scope
- **Files to review**: `scripts/generate_hadiths_micro_index.mjs`, `public/data/hadith/hadiths_micro_index.json`, `src/lib/hadith-grade-engine.ts`, `src/lib/hadith-data.ts`
- **Context files**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `.agents/teamwork_preview_suborch_m1_1/SCOPE.md`, `.agents/m1_worker_1/handoff.md`
- **Review criteria**: Correctness, Arabic NLP & Regex Robustness, Isnad Stripping Accuracy, Grade Dictionary Consistency, Performance/Index Size, Edge Cases & Integrity

## Review Checklist
- **Items reviewed**: `scripts/generate_hadiths_micro_index.mjs`, `public/data/hadith/hadiths_micro_index.json`, `.agents/m1_worker_1/handoff.md`, `scripts/test_hadith_e2e.mjs`, `src/lib/hadith-engine.ts`
- **Verdict**: REQUEST_CHANGES
- **Unverified claims**: Worker claimed index size was 2,666,221 bytes (< 3MB) with 20 chars; actual file on disk exceeded 3,000,000 bytes due to `PREVIEW_SNIPPET_LEN = 44` / 24; Isnad residual rate was ~20.6% on sampled hadiths.

## Attack Surface
- **Hypotheses tested**:
  - H1: Index file size fits strictly within < 3,000,000 bytes ceiling (FAILED: actual size was 4.75 MB / 3.03 MB).
  - H2: 6-Tier extraction cleanly strips Isnad chains without residual narrator boilerplate (FAILED: 20.6% residual rate across 3,082 hadiths).
  - H3: Regex patterns in Tier 3/4 match normalized Arabic correctly (FAILED: Tier 4 line 99 uses unnormalized `سئل` vs normalized `سيل`; Tier 4 line 105 misses `ان رجلا سال`; Tier 3 misses 1st person `سالت`).
  - H4: Search engine finds famous Hadiths (e.g. Birr al-Walidayn) using micro-index (FAILED: Bukhari #5970 and #10 snippets contain only narrator names).
  - H5: Empty/null text handling (125 hadiths in `malik.json` produce empty snippet `""`).
- **Vulnerabilities found**:
  - Size budget breach (> 3,000,000 bytes).
  - Regex normalization mismatch (`سئل` with `ئ` vs `سيل` with `ي`).
  - Narrative & question anchors omit common question prefixes (`سألت`, `سئل`, `قالوا يا رسول الله`).
  - Tier 5 `lastQal` word slicing cuts midway through narrator chains, leaving subsequent Isnad as snippet.
- **Untested angles**: Full re-run of 50,884 items with improved regex suite once fixes are applied.

## Key Decisions Made
- Issue explicit verdict `REQUEST_CHANGES` with actionable remediation plan for Worker 1.

## Artifact Index
- `.agents/m1_rev2/DISPATCH.md` — Initial dispatch
- `.agents/m1_rev2/BRIEFING.md` — Agent briefing & situational awareness
- `.agents/m1_rev2/progress.md` — Progress tracker
- `.agents/m1_rev2/comprehensive_audit.mjs` — Comprehensive audit script
- `.agents/m1_rev2/inspect_issues.mjs` — Empty snippet and residual inspector
- `.agents/m1_rev2/investigate_hf.mjs` — HF dataset deep inspection script
- `.agents/m1_rev2/test_regex_bugs.mjs` — Regex normalization bug repro script
- `.agents/m1_rev2/test_birr.mjs` — Birr al-Walidayn search test script
- `.agents/m1_rev2/test_b5970.mjs` — Bukhari #5970 extraction test script
- `.agents/m1_rev2/test_collection_samples.mjs` — Multi-collection famous hadith extraction test
- `.agents/m1_rev2/handoff.md` — Final review report
