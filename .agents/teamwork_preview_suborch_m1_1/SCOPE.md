# Scope: Milestone 1 — Micro-Index Generator

## Objective
Build `scripts/generate_hadiths_micro_index.mjs` to generate `public/data/hadith/hadiths_micro_index.json` (< 3MB) across all 17 collections with Matn extraction and dictionary tuple schema.

## Features
- Feature 1: Automated Index Generator (`scripts/generate_hadiths_micro_index.mjs`)
- Feature 2: Matn Extraction & Isnad Stripping
- Feature 3: Compact Tuple Index (< 3MB)

## Interface Contract
- **Output Path**: `public/data/hadith/hadiths_micro_index.json`
- **Format**:
  ```ts
  {
    books: string[];  // 17 book IDs
    grades: string[]; // ['sahih', 'hasan', 'daif', ...]
    items: [number, number, number, string, number][]; // [bookIdx, hadithId, chapterId, textPreview, gradeIdx]
  }
  ```
- **Size constraint**: Strict maximum 3,000,000 bytes.
- **Coverage**: All 17 collections (50,884 items).
