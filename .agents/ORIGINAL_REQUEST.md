# Original User Request

## 2026-08-16T03:52:56Z

Build a high-performance, ultra-compact Hadith Micro-Index Generator and search engine for the 17 Sunnah collections (70,000+ hadiths), enabling sub-millisecond global search and on-demand slice loading without downloading full multi-megabyte book JSONs.

Working directory: c:/projectapps/Noor-Platform-main/Noor-Platform-main
Integrity mode: development

## Requirements

### R1. Hadith Micro-Index Generator (`hadiths_micro_index.json`)
Build an automated indexing script (`scripts/generate_hadiths_micro_index.mjs`) that extracts and normalizes stems, keywords, and metadata from all 17 Hadith collections into a compressed lightweight index (1-2 MB total) containing `[bookId, hadithId, chapterId, textPreview, grade]`.

### R2. Sub-Millisecond Sunnah Search Engine
Implement an ultra-fast search engine that loads the lightweight micro-index and executes morphological and multi-token Arabic queries across all 70,000 hadiths in < 2ms, returning ranked results prioritized by authenticity (Bukhari/Muslim first).

### R3. On-Demand Slice Fetching (Zero RAM Bloat)
Allow the UI to fetch and render only the selected Hadith or chapter text on demand, avoiding large 12MB+ JSON payloads in client memory.

## Acceptance Criteria

### Performance & Compactness
- [ ] The generated micro-index file is lightweight (< 3MB) and covers all 17 collections.
- [ ] Global search queries execute in < 5ms without freezing the UI.

### Accuracy & Integrity
- [ ] Searching famous Hadiths (e.g. "النيات", "الوضوء", "بر الوالدين", "الصلاة") returns exact matches with authentic book names and numbers.
- [ ] All 128 existing tests and new Hadith integration tests pass 100%.
- [ ] `graft check` is OK and `next build` succeeds with 0 errors.
