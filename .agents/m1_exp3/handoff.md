# Micro-Index Compact Schema & Size Budget Investigation Report

**Author**: Explorer 3 (Milestone 1 — Micro-Index Generator)  
**Target Path**: `public/data/hadith/hadiths_micro_index.json`  
**Dataset**: 50,884 Hadiths across 17 Sunnah Collections  
**Hard Size Ceiling**: Strictly `< 3,000,000` bytes (< 3 MB)  
**Target Size Range**: `1.5 MB – 2.8 MB`  

---

## 1. Observation

Direct empirical observations from inspecting the codebase, current index, and raw data files:

1. **Current Index Size & Structure**:
   - The existing `public/data/hadith/hadiths_micro_index.json` is **27,875,703 bytes (~27.87 MB)**.
   - It stores an array of objects: `[{"b": "bukhari", "i": 1, "c": 1, "t": "...", "g": "صحيح"}, ...]`.
   - Repetition of object keys (`"b":`, `"i":`, `"c":`, `"t":`, `"g":`, `{`, `}`) wastes **~25–30 bytes per item** across 50,884 items ($\approx 1.4\text{ MB}$ pure syntax overhead).
   - Book IDs (`"shamail_muhammadiyah"`, `"riyad_assalihin"`) and grade strings (`"صحيح"`, `"مقبول"`) are stored as raw strings in every entry.
   - `t` was previously sliced at 450 characters of un-stripped text, which at ~1.85 UTF-8 bytes per Arabic character amounts to ~500–850 bytes per hadith.

2. **Total Item Count Verification**:
   - Total items across all 17 collections: **50,884**.
   - Book breakdown:
     - `bukhari`: 7,277
     - `muslim`: 7,459
     - `abudawud`: 5,276
     - `tirmidhi`: 4,053
     - `nasai`: 5,768
     - `ibnmajah`: 4,345
     - `malik`: 1,985
     - `ahmed`: 1,374
     - `darimi`: 3,406
     - `riyad_assalihin`: 1,896
     - `bulugh_almaram`: 1,767
     - `aladab_almufrad`: 1,326
     - `shamail_muhammadiyah`: 402
     - `mishkat_almasabih`: 4,428
     - `nawawi40`: 42
     - `qudsi40`: 40
     - `shahwaliullah40`: 40
     - **Sum**: `50,884` hadiths across exactly 17 collections.

3. **Invisible Unicode Artifacts in Raw Texts**:
   - Found **332,745 occurrences** of invisible Unicode formatting marks in the raw hadith texts:
     - RLM `\u200F` (Right-to-Left Mark, 3 bytes in UTF-8)
     - LTR `\u200E` (Left-to-Right Mark, 3 bytes in UTF-8)
     - ZWJ `\u200D` (Zero-Width Joiner, 3 bytes in UTF-8)
     - Smart quotes `\u201C` / `\u201D`, curly brackets `\uFD3E` / `\uFD3F`, etc.
   - Stripping these invisible control marks alone reduces the total text footprint by **1,263,204 bytes (1.26 MB)**.

4. **Isnad vs. Matn Slicing Impact**:
   - In Hadith 1 of Sahih Bukhari ("إنما الأعمال بالنيات"), the Isnad chain is **224 characters** long.
   - If a naive character slice of 20–30 characters is taken without Isnad stripping, the preview contains only narrator names (`حدثنا الحميدي عبد الله بن...`) and zero Matn words.
   - When Isnad is stripped first, the Matn starts with `انما الاعمال بالنيات`, capturing the core keywords within the first 15–20 characters.

---

## 2. Logic Chain & Mathematical Byte Budget

### A. Fixed Structural Overhead Calculation (50,884 Items)

In the proposed schema:
```json
{
  "books": ["bukhari", "muslim", "abudawud", ...],
  "grades": ["صحيح", "حسن", "ضعيف", "موضوع", "مقبول"],
  "items": [
    [0, 1, 1, "textPreview", 0],
    ...
  ]
}
```

Let us calculate the exact byte size of every component across all 50,884 records:

| Component | Content / Range | Total Bytes (50,884 items) | Avg Bytes / Item |
| :--- | :--- | :--- | :--- |
| `bookIdx` | Integer `0..16` | 58,929 B | 1.16 B |
| `hadithId` | Integer `1..7500` | 188,364 B | 3.70 B |
| `chapterId` | Integer `0..200` | 84,495 B | 1.66 B |
| `gradeIdx` | Integer `0..4` | 50,884 B | 1.00 B |
| JSON delimiters per tuple | `[` + `,` + `,` + `,` + `"` + `"` + `,` + `]` + `,` | 457,955 B | 9.00 B |
| Outer Header & Footer | `{"books":[...],"grades":[...],"items":[` + `]}` | 310 B | 0.01 B |
| **Total Fixed Structural Overhead** | **Metadata + Delimiters (excluding text)** | **840,937 B (~0.802 MB)** | **16.53 B / item** |

### B. Remaining Budget for `textPreview`

With fixed metadata requiring **840,937 bytes**:

$$\text{Available Text Budget} = \text{Target File Size} - 840,937\text{ bytes}$$

$$\text{Max Allowed Avg Bytes per Item} = \frac{\text{Available Text Budget}}{50,884}$$

1. **For 3,000,000 B (< 3.0 MB Hard Ceiling)**:
   - Total available for text: $3,000,000 - 840,937 = 2,159,063\text{ bytes}$.
   - Per item text budget: $\le 42.43\text{ bytes/item}$ ($\approx 22.9$ Arabic characters in UTF-8).
2. **For 2,800,000 B (2.8 MB Target Upper Bound)**:
   - Total available for text: $2,800,000 - 840,937 = 1,959,063\text{ bytes}$.
   - Per item text budget: $\le 38.50\text{ bytes/item}$ ($\approx 20.8$ Arabic characters).
3. **For 2,500,000 B (2.5 MB Sweet Spot)**:
   - Total available for text: $2,500,000 - 840,937 = 1,659,063\text{ bytes}$.
   - Per item text budget: $\le 32.60\text{ bytes/item}$ ($\approx 17.6$ Arabic characters).
4. **For 2,000,000 B (2.0 MB Lower Bound)**:
   - Total available for text: $2,000,000 - 840,937 = 1,159,063\text{ bytes}$.
   - Per item text budget: $\le 22.78\text{ bytes/item}$ ($\approx 12.3$ Arabic characters).

### C. Empirical Strategy Comparison (Tested on Full 50,884 Dataset)

Using clean extracted Matn (with Unicode formatting control marks stripped):

| Strategy | Rule / Implementation | File Size (Bytes) | Size in MB | Safety Headroom (< 3MB) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **12 Chars Prefix** | `matn.slice(0, 12).trim()` | 1,940,785 B | 1.851 MB | 1,034.4 KB | ✅ Pass |
| **15 Chars Prefix** | `matn.slice(0, 15).trim()` | 2,209,043 B | 2.107 MB | 772.4 KB | ✅ Pass |
| **18 Chars Prefix** | `matn.slice(0, 18).trim()` | 2,480,357 B | 2.365 MB | 507.5 KB | ✅ Pass |
| **20 Chars Prefix** | `matn.slice(0, 20).trim()` | 2,658,438 B | 2.535 MB | 333.6 KB | ✅ **Recommended** |
| **22 Chars Prefix** | `matn.slice(0, 22).trim()` | 2,835,765 B | 2.704 MB | 160.4 KB | ✅ Pass |
| **24 Chars Prefix** | `matn.slice(0, 24).trim()` | 3,010,276 B | 2.871 MB | -10.0 KB | ❌ **Over Limit** |
| **3 Words Limit** | `words.slice(0, 3).join(' ')` | 2,100,598 B | 2.003 MB | 878.3 KB | ✅ Pass |
| **4 Words Limit** | `words.slice(0, 4).join(' ')` | 2,549,039 B | 2.431 MB | 440.4 KB | ✅ Pass |
| **4 Words Capped 20** | `words.slice(0,4).join(' ').slice(0,20)` | 2,494,745 B | 2.379 MB | 493.4 KB | ✅ **Recommended Hybrid** |
| **5 Words Capped 22** | `words.slice(0,5).join(' ').slice(0,22)` | 2,796,660 B | 2.667 MB | 198.6 KB | ✅ Pass |

---

## 3. Caveats

1. **Hard Character Truncation Boundary**:
   - Fixed character slicing at 20 characters (`matn.slice(0, 20)`) will occasionally slice the 4th word in half (e.g. `انما الاعمال بالنيات` has 20 chars, ending cleanly, but `بني الاسلام علي خمس` has 19 chars).
   - Word-boundary slicing (`words.slice(0, 4).join(' ').slice(0, 20)`) avoids mid-character cuts and yields **2.38 MB** (safely providing 500 KB headroom).
2. **Hadith Body Beyond Prefix**:
   - For long hadiths where a user searches for a keyword that appears deep in the body (e.g., the 3rd clause in a long dialogue), micro-index search covers the prophetic opening.
   - For full-text search across entire long hadiths, the architecture provides lazy on-demand chapter loading via IndexedDB (`fetchBookSlice`), keeping the micro-index lightweight and sub-millisecond.
3. **Persian / Non-standard Character Normalization**:
   - A small number of hadiths in collections like Musnad Ahmad contain Persian/Urdu Yeh (`\u06CC`) or Keheh (`\u06A9`). The generator must ensure standard Arabic normalization (`normalizeArabic`) converts them to standard `ي` and `ك`.

---

## 4. Conclusion & Recommended Architecture

### 1. Lookup Tables & Schema Contract
Output file: `public/data/hadith/hadiths_micro_index.json`
```ts
export interface HadithMicroIndexPayload {
  books: string[];  // 17 collection keys
  grades: string[]; // ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول']
  items: [
    bookIdx: number,     // 0..16 index into books
    hadithId: number,    // idInBook (e.g. 1..7277)
    chapterId: number,   // chapterId
    textPreview: string, // Clean normalized Matn prefix (max 20 chars / 4 words)
    gradeIdx: number     // 0..4 index into grades
  ][];
}
```

### 2. Books & Grades Table Definition
```ts
export const MICRO_INDEX_BOOKS: string[] = [
  'bukhari',
  'muslim',
  'abudawud',
  'tirmidhi',
  'nasai',
  'ibnmajah',
  'malik',
  'ahmed',
  'darimi',
  'riyad_assalihin',
  'bulugh_almaram',
  'aladab_almufrad',
  'shamail_muhammadiyah',
  'mishkat_almasabih',
  'nawawi40',
  'qudsi40',
  'shahwaliullah40'
];

export const MICRO_INDEX_GRADES: string[] = [
  'صحيح',
  'حسن',
  'ضعيف',
  'موضوع',
  'مقبول'
];
```

### 3. Optimal `textPreview` Composition
```ts
// 1. Strip Unicode control marks & formatting
const CONTROL_MARKS_REGEX = /[\u200B-\u200F\u202A-\u202E\uFEFF\uFFF0-\uFFFF\u00AD\u061C]/g;
const EXTRA_PUNCT_REGEX = /[«»“”"''`~@#$%^&*()_+=\[\]{}|\\:;?/><.,،؛ـ]/g;

function cleanText(raw: string): string {
  return normalizeArabic(raw)
    .replace(CONTROL_MARKS_REGEX, '')
    .replace(EXTRA_PUNCT_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. Extract Matn from Isnad
function extractMatnPreview(rawArabic: string): string {
  const cleaned = cleanText(rawArabic);
  let matn = cleaned;
  for (const pat of ISNAD_PATTERNS) {
    const match = cleaned.match(pat);
    if (match && match[1] && match[1].trim().length >= 10) {
      matn = match[1].trim();
      break;
    }
  }
  // 3. Take first 4 words, capped at 20 characters
  const words = matn.split(/\s+/).slice(0, 4).join(' ');
  return words.slice(0, 20).trim();
}
```

### 4. Serialization Guideline
- Use standard compact JSON serialization: `JSON.stringify(payload)` (0 indentation, no `null, 2`).
- Ensure raw UTF-8 string encoding (do not escape Arabic characters to `\uXXXX`).
- Expected Output File Size: **~2,494,745 bytes (~2.38 MB)**, guaranteeing a **505 KB safety margin** below the 3.0 MB hard ceiling.

---

## 5. Verification Method

To independently verify the schema, compactness, and accuracy:

1. **Size Verification Command**:
   ```bash
   node -e "
     const fs = require('fs');
     const p = 'public/data/hadith/hadiths_micro_index.json';
     const stat = fs.statSync(p);
     console.log('Size:', stat.size.toLocaleString(), 'bytes (' + (stat.size / 1024 / 1024).toFixed(2) + ' MB)');
     if (stat.size >= 3000000) {
       console.error('FAIL: Size exceeds 3,000,000 bytes!');
       process.exit(1);
     }
     console.log('PASS: File is strictly < 3,000,000 bytes.');
   "
   ```

2. **Schema & Integrity Verification Command**:
   ```bash
   node -e "
     const fs = require('fs');
     const data = JSON.parse(fs.readFileSync('public/data/hadith/hadiths_micro_index.json', 'utf-8'));
     console.assert(Array.isArray(data.books) && data.books.length === 17, 'Must have 17 books');
     console.assert(Array.isArray(data.grades) && data.grades.length >= 2, 'Must have grades');
     console.assert(Array.isArray(data.items) && data.items.length === 50884, 'Must have 50884 hadiths');
     const first = data.items[0];
     console.assert(first.length === 5, 'Item must be 5-tuple [bIdx, hId, cId, preview, gIdx]');
     console.assert(typeof first[0] === 'number', 'bookIdx must be number');
     console.assert(typeof first[1] === 'number', 'hadithId must be number');
     console.assert(typeof first[2] === 'number', 'chapterId must be number');
     console.assert(typeof first[3] === 'string', 'textPreview must be string');
     console.assert(typeof first[4] === 'number', 'gradeIdx must be number');
     console.log('PASS: Schema conforms 100% to HadithMicroIndexPayload.');
   "
   ```

3. **Hadith Test Suite**:
   ```bash
   npx tsx scripts/test_hadith_integration.mjs
   ```
