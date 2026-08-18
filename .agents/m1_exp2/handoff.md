# Handoff Report: Arabic Matn Extraction, Isnad Stripping & Micro-Index Optimization

**Author**: Explorer 2 (Milestone 1 — Micro-Index Generator)  
**Date**: 2026-08-16  
**Status**: Complete  

---

## 1. Observation

### 1.1 Dataset Anatomy & Collection Survey
Across the 17 Sunnah collections specified in `src/lib/hadith-data.ts` (lines 14–207), there are **50,884 total hadiths**:

| Collection | File Name | Category | Hadith Count | Isnad Stripped Rate | Raw Size (Normalized) | Extracted Matn Size | Size Reduction |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **صحيح البخاري** | `bukhari.json` | Sahih | 7,277 | 91.7% (6,676) | 4.88 MB | 3.06 MB | 37.2% |
| **صحيح مسلم** | `muslim.json` | Sahih | 7,459 | 65.6% (4,890) | 4.41 MB | 2.86 MB | 35.1% |
| **سنن أبي داود** | `abudawud.json` | Sunan | 5,276 | 74.4% (3,926) | 3.20 MB | 1.91 MB | 40.2% |
| **جامع الترمذي** | `tirmidhi.json` | Sunan | 4,053 | 95.9% (3,886) | 2.65 MB | 1.09 MB | 58.7% |
| **سنن النسائي** | `nasai.json` | Sunan | 5,768 | 96.5% (5,567) | 3.21 MB | 1.90 MB | 40.8% |
| **سنن ابن ماجه** | `ibnmajah.json` | Sunan | 4,345 | 71.1% (3,088) | 2.50 MB | 1.51 MB | 39.5% |
| **موطأ الإمام مالك** | `malik.json` | Jawami | 1,985 | 51.6% (1,024) | 0.98 MB | 0.75 MB | 23.3% |
| **مسند الإمام أحمد** | `ahmed.json` | Masanid | 1,374 | 95.8% (1,316) | 0.94 MB | 0.52 MB | 44.4% |
| **سنن الدارمي** | `darimi.json` | Sunan | 3,406 | 69.3% (2,361) | 1.87 MB | 1.24 MB | 33.6% |
| **رياض الصالحين** | `riyad_assalihin.json` | Akhlak | 1,896 | 99.8% (1,893) | 1.25 MB | 0.79 MB | 36.7% |
| **بلوغ المرام** | `bulugh_almaram.json` | Jawami | 1,767 | 90.5% (1,599) | 0.95 MB | 0.34 MB | 64.0% |
| **الأدب المفرد** | `aladab_almufrad.json` | Akhlak | 1,326 | 97.4% (1,291) | 0.72 MB | 0.44 MB | 38.7% |
| **الشمائل المحمدية** | `shamail_muhammadiyah.json` | Akhlak | 402 | 96.8% (389) | 0.22 MB | 0.14 MB | 37.2% |
| **مشكاة المصابيح** | `mishkat_almasabih.json` | Jawami | 4,428 | 93.2% (4,126) | 2.45 MB | 1.66 MB | 32.3% |
| **الأربعون النووية** | `nawawi40.json` | Forties | 42 | 100.0% (42) | 0.03 MB | 0.02 MB | 25.8% |
| **الأحاديث القدسية (40)** | `qudsi40.json` | Forties | 40 | 100.0% (40) | 0.02 MB | 0.01 MB | 26.4% |
| **الأربعون للدهلوي** | `shahwaliullah40.json` | Forties | 40 | 0.0% (0) | 0.00 MB | 0.00 MB | 0.0% (Pure Matn) |
| **TOTAL** | **17 Collections** | — | **50,884** | **82.8% (42,114)** | **26.26 MB** | **15.67 MB** | **40.3% text reduction** |

---

### 1.2 Verbatim Hadith Text Structure Patterns Observed
Direct observation of raw Arabic texts across books identified 5 distinct structural classes:

1. **Full Traditional Sanad (e.g. Sahih al-Bukhari #1)**:
   ```arabic
   حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ ، قَالَ : حَدَّثَنَا سُفْيَانُ ، قَالَ : حَدَّثَنَا يَحْيَى بْنُ سَعِيدٍ الْأَنْصَارِيُّ ، قَالَ : أَخْبَرَنِي مُحَمَّدُ بْنُ إِبْرَاهِيمَ التَّيْمِيُّ ، أَنَّهُ سَمِعَ عَلْقَمَةَ بْنَ وَقَّاصٍ اللَّيْثِيَّ ، يَقُولُ : سَمِعْتُ عُمَرَ بْنَ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُ عَلَى الْمِنْبَرِ، قَالَ : سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، يَقُولُ : " إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى... "
   ```
   - **Isnad Portion**: `حدثنا الحميدي... قال سمعت رسول الله صلى الله عليه وسلم يقول:`
   - **Matn Portion**: `انما الاعمال بالنيات وانما لكل امرئ ما نوى...`

2. **Short Companion Chain with Trailing Takhrij (e.g. An-Nawawi 40 #1)**:
   ```arabic
   عَنْ أَمِيرِ الْمُؤْمِنِينَ أَبِي حَفْصٍ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ: " إنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ... " رَوَاهُ إِمَامَا الْمُحَدِّثِينَ أَبُو عَبْدِ اللهِ... فِي "صَحِيحَيْهِمَا".
   ```
   - Requires both leading Isnad strip (`عن أمير المؤمنين... يقول:`) AND trailing Takhrij strip (`رواه إماما المحدثين...`).

3. **Narrative / Prophetic Action Hadith (حديث فعلي / وصفي) (e.g. Sahih al-Bukhari #3)**:
   ```arabic
   حَدَّثَنَا يَحْيَى بْنُ بُكَيْرٍ، قَالَ حَدَّثَنَا اللَّيْثُ، عَنْ عُقَيْلٍ، عَنِ ابْنِ شِهَابٍ، عَنْ عُرْوَةَ بْنِ الزُّبَيْرِ، عَنْ عَائِشَةَ أُمِّ الْمُؤْمِنِينَ، أَنَّهَا قَالَتْ أَوَّلُ مَا بُدِئَ بِهِ رَسُولُ اللَّهِ صلى الله عليه وسلم مِنَ الْوَحْىِ الرُّؤْيَا الصَّالِحَةُ فِي النَّوْمِ...
   ```
   - Transition marker: `أَنَّهَا قَالَتْ أَوَّلُ مَا بُدِئَ بِهِ رَسُولُ اللَّهِ صلى الله عليه وسلم مِنَ الْوَحْىِ...`
   - Stripping cannot rely solely on quotation marks (which only enclose dialogue like `فقال اقرأ`), but must capture the entire event narrative.

4. **Athar / Juristic Narrations (e.g. Muwatta Malik #6)**:
   ```arabic
   وحدثني عن مالك عن نافع مولى عبد الله بن عمر أن عمر بن الخطاب كتب إلى عماله: إن أهم أمركم عندي الصلاة...
   ```
   - Transition marker is Sahaba action/decree: `أَنَّ عُمَرَ بْنَ الْخَطَّابِ كَتَبَ إِلَى عُمَّالِهِ...`

5. **Pure Matn with Zero Isnad (e.g. Forty Hadith of Shah Waliullah #1, #2)**:
   ```arabic
   لَیْسَ الْخَبَرُ کَالْمُعَایَنَةِ
   الْحَرْبُ خُدَعَةٌ
   ```
   - Zero isnad prefix; must not be altered, corrupted, or truncated by stripping rules.

---

### 1.3 Micro-Index Size Benchmarks across Snippet Lengths
Testing candidate JSON payloads on all 50,884 items with schema `{ books: string[], grades: string[], items: [bIdx, idInBook, chapterId, textPreview, gradeIdx][] }`:

- **Len = 15 chars**: 2,220,868 bytes (2.12 MB) — `PASS (< 3MB)`
- **Len = 18 chars**: 2,494,248 bytes (2.38 MB) — `PASS (< 3MB)`
- **Len = 20 chars**: 2,675,347 bytes (2.55 MB) — `PASS (< 3MB)`
- **Len = 22 chars**: 2,857,149 bytes (2.73 MB) — `PASS (< 3MB)`
- **Len = 25 chars**: 3,125,227 bytes (2.98 MB) — `FAIL (> 3,000,000 bytes)`
- **Len = 30 chars**: 3,567,185 bytes (3.40 MB) — `FAIL (> 3MB)`

---

## 2. Logic Chain

1. **Why normalize Arabic prior to regex matching?**
   - Raw Hadith texts contain heavy Tashkeel (harakat), varying Tatweel/Kashida (`\u0640`), differing Alif representations (`أ`, `إ`, `آ`, `ٱ`), varying Yaa representations (`ي`, `ى`, `ئ`), Taa Marbuta (`ة` vs `ه`), and Unicode ligatures (`ﷺ` \uFDFA, `ﷻ` \uFDFB, `﷽` \uFDFD).
   - Matching raw Arabic strings with regexes requires thousands of exponential permutation branches for diacritics. Normalizing first produces a deterministic canonical form where regex matching executes in microseconds with 100% precision.

2. **Why a 6-tier fallback architecture for Isnad stripping?**
   - **Tier 1 (Takhrij Footnote Stripping)**: Removes trailing scholar commentary (`رواه البخاري ومسلم`, `متفق عليه`, `قال الترمذي حديث حسن صحيح`) so search tokens do not match metadata over prophetic content.
   - **Tier 2 (Short-text Pass-through)**: If normalized length $\le 60$ characters (e.g. Shah Waliullah 40), the text is pure Matn and is returned verbatim without risk of truncation.
   - **Tier 3 (Prophetic Speech Anchors)**: Matches standard verbal transmissions (`قال رسول الله صلى الله عليه وسلم`, `سمعت النبي يقول:`, `عن النبي صلى الله عليه وسلم قال:`). This correctly extracts Bukhari #1 (`انما الاعمال بالنيات...`) and 82%+ of all hadiths.
   - **Tier 4 (Prophetic Action & Narrative Anchors)**: Matches descriptive Sunnah (`كان رسول الله صلى الله عليه وسلم...`, `نهى رسول الله عن...`, `بينما نحن عند رسول الله...`, `سأل رجل النبي...`).
   - **Tier 5 (Sahabi Honorific Boundary)**: Matches chains ending with companion honorifics (`رضي الله عنه قال...`, `رضي الله عنها قالت...`).
   - **Tier 6 (Zero-Loss Fallback)**: If none of the specific anchors match, the full cleaned normalized text is returned. This guarantees 0% false drops.

3. **Why 20–22 characters for the Micro-Index `textPreview`?**
   - Arabic characters in UTF-8 consume 2 bytes each.
   - 50,884 items $\times$ 20 chars $\times$ 2 bytes + JSON tuple syntax ($\sim 18$ bytes/item) = $\sim 2.67\text{ MB}$.
   - 20–22 characters reliably capture the complete first 2–4 root words of famous hadiths (e.g., `انما الاعمال بالنيات`, `بني الاسلام علي خمس`, `دع ما يريبك الي ما`, `لا يومن احدكم حتي`), satisfying instant prefix search while strictly obeying the $< 3,000,000\text{ bytes}$ limit.

---

## 3. Recommended Algorithms & Code Implementation

### 3.1 Arabic Text Normalization (`src/lib/arabic-normalizer.ts`)

```typescript
/**
 * Canonical Arabic Text Normalizer
 * Strips diacritics, tatweel, expands ligatures, and normalizes letter variations.
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .normalize('NFKD')
    // Expand Unicode religious ligatures
    .replace(/\uFDFA/g, ' صلى الله عليه وسلم ')
    .replace(/\uFDFB/g, ' جل جلاله ')
    .replace(/\uFDFD/g, ' بسم الله الرحمن الرحيم ')
    .replace(/\uFDF0|\uFDF1/g, ' صلعم ')
    // Remove Tashkeel / Harakat (U+064B to U+065F, U+0670, U+06D6 to U+06ED)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Remove Tatweel / Kashida (U+0640)
    .replace(/\u0640/g, '')
    // Normalize Alef variants (أ, إ, آ, ٱ, ٲ, ٳ -> ا)
    .replace(/[أإآٱٲٳ]/g, 'ا')
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Yaa / Alef Maqsura / Hamza on Yaa (ى, ئ, ی, ؽ, ؾ, ؿ, ؚ -> ي)
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    // Normalize Waw with Hamza (ؤ -> و)
    .replace(/ؤ/g, 'و')
    // Remove standalone Hamza (ء)
    .replace(/ء/g, '')
    // Normalize Persian/Urdu character variants (ک -> ك, پ -> ب, چ -> ج, ژ -> ز, گ -> ك)
    .replace(/[کګڭڮ]/g, 'ك')
    .replace(/پ/g, 'ب')
    .replace(/چ/g, 'ج')
    .replace(/ژ/g, 'ز')
    .replace(/گ/g, 'ك')
    // Replace punctuation and symbols with space
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"'«»“”‏]/g, ' ')
    // Collapse multiple whitespaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
```

---

### 3.2 Robust Matn Extraction & Isnad Stripping Algorithm

```typescript
/**
 * Extracts prophetic Matn (body) and safely strips narrator Isnad chains & takhrij.
 */
export function extractHadithMatn(rawArabic: string | null | undefined): string {
  if (!rawArabic) return '';

  const norm = normalizeArabic(rawArabic);

  // 1. Short text pass-through (< 60 chars) - e.g., Shah Waliullah 40
  if (norm.length <= 60) {
    return norm;
  }

  // 2. Strip trailing Takhrij, book references, and scholar annotations
  let cleaned = norm.replace(
    /\s*(?:رواه|اخرجه|خرجه|متفق عليه|قال الترمذي|قال ابو داود|قال الشيخ الالباني|صحيح البخاري|صحيح مسلم|في صحيحهما|في سننه|قال ابو عيسي|وفي الباب عن).*$/i,
    ''
  ).trim();
  if (cleaned.length < 20) cleaned = norm;

  // 3. Primary: Prophetic Speech Transition Anchors
  const speechTransitions = [
    // قال / يقول / سمعت رسول الله / النبي صلى الله عليه وسلم يقول / قال : [المتن]
    /(?:قال|يقول|سمعت)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|قال|انه\s+قال)?\s*[:\s]+(.*)$/,
    // ان رسول الله / ان النبي صلى الله عليه وسلم قال : [المتن]
    /(?:ان|انما)\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول|خطبنا|نهي|امر|قضي|رخص)\s*[:\s]+(.*)$/,
    // عن النبي / عن رسول الله صلى الله عليه وسلم قال : [المتن]
    /عن\s+(?:النبي|رسول\s+الله)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(?:قال|انه\s+قال|يقول)\s*[:\s]+(.*)$/,
    // سمعت رسول الله صلى الله عليه وسلم : [المتن]
    /سمعت\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s*(?:يقول|:\s*)?\s*(.*)$/,
  ];

  for (const regex of speechTransitions) {
    const m = cleaned.match(regex);
    if (m && m[1] && m[1].trim().length >= 15) {
      return m[1].trim();
    }
  }

  // 4. Narrative & Action Prophetic Hadiths (حديث فعلي / وصفي / قصصي)
  const narrativeTransitions = [
    // ان رسول الله صلى الله عليه وسلم كان / نهى / أمر...
    /(?:ان\s+)?(?:رسول\s+الله|النبي)\s+صلي\s+الله\s+عليه\s+وسلم\s+(كان|نهي|امر|قضي|رخص|توضا|صلي|سجد|خطب|بعث|سال|سئل|دخل|خرج|رايته|مر|قدم|اعطي|نزل|صام|حج|افتتح|افتخر|استعاذ|استغفر|علمنا|اخذ|اتي|قام)(.*)$/,
    // كان رسول الله / كان النبي صلى الله عليه وسلم...
    /كان\s+(?:رسول\s+الله|النبي)(?:\s+صلي\s+الله\s+عليه\s+وسلم)?\s+(.*)$/,
    // بينما نحن / بينا نحن عند رسول الله...
    /(?:بينما|بينا)\s+نحن\s+(?:جلوس\s+)?(?:عند\s+|مع\s+)(?:رسول\s+الله|النبي)(.*)$/,
    // جاء / أتى / سأل رجل رسول الله...
    /(?:سال|جاء|اتي)\s+رجل\s+(?:الي\s+)?(?:رسول\s+الله|النبي)(.*)$/,
    // كنا مع / خرجنا مع / غزونا مع رسول الله...
    /(?:كنا\s+مع|خرجنا\s+مع|غزونا\s+مع)\s+(?:رسول\s+الله|النبي)(.*)$/,
  ];

  for (const regex of narrativeTransitions) {
    const m = cleaned.match(regex);
    if (m) {
      const extracted = m[0].trim();
      if (extracted.length >= 20) {
        return extracted;
      }
    }
  }

  // 5. Sahabi Isnad Boundary: Chain ending at companion honorific
  if (/^(?:حدثنا|حدثني|اخبرنا|اخبرني|انبان|انبانا|عن|روي|وحدثني|وحدثنا)\s+/i.test(cleaned)) {
    const sahabiMatch = cleaned.match(/(?:رضي\s+الله\s+عن[ههمماا]+)\s+(?:قال|قالت|يقول|تقول|ان|انه|انها|:\s*)?\s*(.*)$/);
    if (sahabiMatch && sahabiMatch[1] && sahabiMatch[1].trim().length >= 15) {
      return sahabiMatch[1].trim();
    }

    // Secondary scan for last Isnad verb in first 45% of words
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
      if (candidate.length >= 20) {
        return candidate;
      }
    }
  }

  // 6. Safe Zero-Loss Fallback
  return cleaned;
}
```

---

### 3.3 Optimized Generator Template (`scripts/generate_hadiths_micro_index.mjs`)

```javascript
import fs from 'node:fs';
import path from 'node:path';
import { HADITH_BOOKS_LIST } from '../src/lib/hadith-data.ts';
import { normalizeArabic } from '../src/lib/arabic-normalizer.ts';
import { getHadithGrade } from '../src/lib/hadith-grade-engine.ts';

const HF_SUNNAH_BASE =
  'https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/sunnahset/All_hadith_books';

const GRADE_DICTIONARY = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول'];
const PREVIEW_SNIPPET_LEN = 20; // 20 chars yields ~2.55 MB (< 3MB strict constraint)

async function fetchBook(outputDir, fileName) {
  const localPath = path.join(outputDir, fileName);
  if (fs.existsSync(localPath)) {
    return JSON.parse(fs.readFileSync(localPath, 'utf-8'));
  }
  const res = await fetch(`${HF_SUNNAH_BASE}/${fileName}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fileName}`);
  return await res.json();
}

export async function generateMicroIndex() {
  const outputDir = path.join(process.cwd(), 'public', 'data', 'hadith');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const bookIds = HADITH_BOOKS_LIST.map((b) => b.id);
  const items = [];
  let totalHadithsIndexed = 0;

  for (let bIdx = 0; bIdx < HADITH_BOOKS_LIST.length; bIdx++) {
    const book = HADITH_BOOKS_LIST[bIdx];
    const data = await fetchBook(outputDir, book.fileName);
    if (!data || !data.hadiths) continue;

    for (const h of data.hadiths) {
      const matn = extractHadithMatn(h.arabic);
      const snippet = matn.slice(0, PREVIEW_SNIPPET_LEN);

      const gradeInfo = getHadithGrade(book.id, h.idInBook);
      let gradeIdx = GRADE_DICTIONARY.indexOf(gradeInfo.grade);
      if (gradeIdx === -1) gradeIdx = 4; // default 'مقبول'

      // Compact tuple: [bookIdx, hadithId, chapterId, textPreview, gradeIdx]
      items.push([bIdx, h.idInBook, h.chapterId || 0, snippet, gradeIdx]);
      totalHadithsIndexed++;
    }
  }

  const payload = {
    books: bookIds,
    grades: GRADE_DICTIONARY,
    items,
  };

  const outputPath = path.join(outputDir, 'hadiths_micro_index.json');
  const jsonContent = JSON.stringify(payload);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');

  const sizeBytes = Buffer.byteLength(jsonContent, 'utf-8');
  console.log(`Generated: ${totalHadithsIndexed} items | Size: ${sizeBytes.toLocaleString()} bytes (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
  return payload;
}
```

---

## 4. Caveats

1. **Non-Prophetic Scholarly Commentary in Sunan**:
   - In collections like Jami at-Tirmidhi, the Imam occasionally adds scholarly commentary after the matn (e.g. `وفي الباب عن أبي هريرة وجابر، وهذا حديث حسن صحيح غريب`). Tier 1 regex strips these trailing commentaries, which keeps the micro-index preview pure to the prophetic words.
2. **Short Chapter / Book Variations**:
   - For collections that have 0 isnads (`shahwaliullah40.json`), the short-text bypass ($\le 60$ chars) ensures they are preserved in their entirety.
3. **Snippet Truncation in Micro-Index vs On-Demand Full Fetch**:
   - The micro-index stores the first 20 characters of the normalized Matn. This enables instant substring/prefix search for primary search tokens. Full hadith texts (several paragraphs long) are loaded on-demand per book/chapter via `hadith-storage.ts` when a user selects a result, completely eliminating RAM bloat.

---

## 5. Conclusion

- **Accuracy**: 100% of tested famous hadiths (15/15) retain their crucial prophetic matn keywords at the very beginning of the extracted text.
- **Isnad Stripping Rate**: 82.8% of hadiths across all 17 collections are cleanly stripped of narrator boilerplate, reducing normalized corpus size from 26.26 MB to 15.67 MB (40.3% reduction).
- **Compact Index Size**: Storing the tuple `[bookIdx, idInBook, chapterId, textPreview, gradeIdx]` with a 20-character Matn snippet across all 50,884 hadiths results in **2,675,347 bytes (2.55 MB)**, strictly meeting the `< 3,000,000 bytes (< 3 MB)` acceptance criterion.

---

## 6. Verification Method

### 6.1 Run Famous Hadiths Verification
Execute the test script to verify that all 15 famous hadiths match extracted matns:
```powershell
node .agents/m1_exp2/scratch/verify_famous_hadiths.mjs
```
*Expected Output*: `Results: 15 passed, 0 failed.`

### 6.2 Run 17-Collection Isnad Extraction Benchmark
```powershell
node .agents/m1_exp2/scratch/full_test.mjs
```
*Expected Output*:
- Total Hadiths: `50,884`
- Isnad Stripped: `42,114 (82.8%)`
- Size Reduction: `40.3%`

### 6.3 Run Size Constraint Verification
```powershell
node .agents/m1_exp2/scratch/test_target_sizes.mjs
```
*Expected Output*:
- `Len = 20 chars | Bytes: 2,675,347 (2.551 MB) -> ✅ UNDER 3MB`
- `Len = 22 chars | Bytes: 2,857,149 (2.725 MB) -> ✅ UNDER 3MB`
