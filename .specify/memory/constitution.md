# دستور وهندسة منصة النور (Noor Platform Constitution)

وثيقة المعايير الهندسية والمواصفات المعمارية الملزمة لتطوير وصيانة منصة النور، والمدمجة وفق منظومة **الثلاثي الهندسي المتكامل**:
1. **GitHub Spec Kit & Specify**: لإدارة المتطلبات والذاكرة التراكمية والدستور (Constitution & Specs).
2. **Sentrux Quality Guard**: لفرض الحدود المعمارية والطبقية ومنع الثغرات والتداخلات (Architecture Guard).
3. **NanoNets Graft**: لبناء الخريطة الطبوغرافية المعرفية للكود وتسريع الفهم الدلالي (Code Knowledge Graph).

---

## 🏛️ 1. المبادئ الأساسية الحاكمة (Core Architectural Principles)

### I. عدم التراجع البرمجي ومنع كسر الوظائف (Zero Regression & Invariant Protection)
- **القاعدة**: يمنع منعاً باتاً إضافة أي ميزة أو تعديل كود يؤدي إلى تعطيل المشغل، قارئ الكتب، الفتاوى، أو مزامنة المشايخ.
- **التطبيق**: كل تعديل يجب أن يُختبر برمجياً قبل وبعد التغيير، مع الحفاظ على سلامة الـ State والـ API contracts.

### II. الأمان المعماري الصارم (Security Invariants - Sentrux Guard)
- **SSRF Guard**: يمنع طلب أي رابط خارجي في الـ API دون تمريره عبر `validateSafeUrl()` للتحقق من عدم توجيهه لـ Private IPs أو Cloud Metadata.
- **DoS Guard**: يمنع استخدام `execSync` أو استدعاءات الأوامر المعطلة للـ Event Loop؛ تستخدم حصراً الدوال اللامتزامنة `execFileAsync` مع مصفوفة معاملات معقمة.
- **Rate Limiting**: تخضع جميع المسارات الحساسة لنظام Sliding Window Rate Limiter.
- **Untrusted Redirects**: يمنع توجيه المستخدم لأي موقع إعلانات خارجي.

### III. التطبيع الصرفي والبحث العربي الذكي (Arabic-First NLP & Search)
- **القاعدة**: تخضع جميع عمليات البحث والمطابقة في الفيديوهات، الفتاوى، المشايخ، والكتب لمحرك `arabic-normalizer.ts` و `arabic-search-engine.ts`.
- **المعايير**: معالجة تصريفات الأفعال، إزالة التشكيل، استخراج الجذور، وتوسيع المرادفات الفقهية.

### IV. كفاءة معالجة البيانات وانسيابية الواجهة (High-Performance Edge Ingestion)
- **القاعدة**: تمنع العمليات الثقيلة $O(N^2)$ في دوال الحالة وواجهات React.
- **التطبيق**: استخدام معالجة الخلفية (`Web Worker`) للبحث في الفهارس الموزعة (`Shards`) لضمان معدل تحديث 60 إطار/ثانية (60fps) دون تجميد المتصفح، مع التخزين الدائم لـ 0ms.

### V. خريطة الكود المعرفية الدلالية (Graft Context & Knowledge Graph)
- **القاعدة**: يتم توليد وتحديث خريطة الكود البيانية (`graft build` و `graft map`) لتوثيق نقاط الربط (`Hubs` & `Hotspots`) والتبعيات بين الدوال لتقليل استهلاك الـ Tokens وضمان سلامة التعديلات.

---

## 📐 2. الهيكلية المعمارية والطبقات (Sentrux Layer Order)

```
[UI Components]      --> src/components/**
      ↓
[Custom Hooks]       --> src/hooks/**
      ↓
[Zustand Stores]     --> src/stores/**
      ↓
[Core Libraries]     --> src/lib/** (security, normalizer, search-engine, fatwa-index)
      ↓
[Domain & Types]     --> src/lib/types.ts
```

* **قاعدة التبعية**: تتدفق التبعيات من الأعلى إلى الأسفل فقط؛ يمنع وجود أي حلقة اعتمادية (*Circular Dependency*).

---

## 🧪 3. بوابات الجودة والتحقق الإلزامي (Quality & Testing Gates)

قبل اعتماد أي ميزة أو تغيير، يجب اجتياز البوابات التالية بنجاح تام:
1. **بوابة الأمان والـ SSRF**: `npx tsx scripts/test_security_audit.mjs` (28/28 اختباراً).
2. **بوابة التطبيع الصرفي العربي**: `npx tsx scripts/test_arabic_normalizer.mjs` (16/16 اختباراً).
3. **بوابة مزامنة مستودعات Hugging Face**: `npx tsx scripts/test_huggingface_sync.mjs` (14/14 اختباراً).
4. **بوابة مكتبة الكتب والمصاحف**: `npx tsx scripts/test_books_integration.mjs` (12/12 اختباراً).
5. **بوابة محرك الفتاوى والبحث الصرفي**: `npx tsx scripts/test_fatwa_inverted_index.mjs` (17/17 اختباراً).
6. **بوابة فحص وتكامل Graft**: `npx @nanonets/graft check` (فحص سلامة خريطة الكود).
7. **بوابة البناء والإنتاج**: `npx next build` (بناء كامل بدون أي خطأ TypeScript أو Lint).

---

الإصدار: 2.0.0 | تاريخ الاعتماد: أغسطس 2026

**الإصدار**: 3.0.0 | **تاريخ التحديث**: 30 أغسطس 2026
**التغيير الجوهري**: اعتماد بنية **Astro 5 + Next.js 16 Hybrid** (انظر spec 005)

## 🏗️ 5. البنية المعمارية المعتمدة (Approved Hybrid Architecture)

> **اعتُمد في**: 30 أغسطس 2026
> **السبب**: Next.js 16 بُنْدِل 200KB JS = بطيء على 3G
> **الحل**: Astro 5 (0KB JS) للـ95% + Next.js (200KB) للـPDF reader فقط

### 5.1 تقسيم التطبيقات

| التطبيق | النطاق | الحجم | عدد الصفحات | المسار |
|---|---|---|---|---|
| **Astro Frontend** | القرآن، الأحاديث، الفتاوى، الرئيسية، البحث، المشايخ | **0 KB JS** | ~30 صفحة | `apps/astro-frontend/` |
| **Next.js Books** | المكتبة (PDF reader) | 200 KB | 4 صفحات | `apps/next-books/` |
| **Cloudflare Workers** | Search API، Auth، User data | n/a (edge) | n/a | `apps/workers-api/` |

### 5.2 التوزيع الجديد للملفات (بعد migration)

```
Noor-Platform/                          (monorepo)
├── apps/
│   ├── astro-frontend/                ← 95% من الموقع (0 KB JS)
│   ├── next-books/                    ← 5% (PDF.js reader)
│   └── workers-api/                   ← Backend (D1, KV, R2)
├── packages/
│   ├── shared-types/                  ← TS types
│   ├── data-engines/                  ← hadith, fatwa, book (isomorphic)
│   └── ui-react/                      ← React components
├── .specify/                          ← Spec Kit (5 specs now)
├── .sentrux/                          ← Quality rules
├── graft/                             ← Knowledge graph
└── docs/                              ← ADRs, ARCHITECTURE
```

### 5.3 معايير القبول (Acceptance Criteria)

لكل ميزة جديدة:
- [ ] هل يمكن تنفيذها في Astro (0 KB JS)؟ → نعم
- [ ] هل تحتاج state معقد بين islands؟ → لا (أو nanostores)
- [ ] هل تحتاج PDF.js؟ → ضعها في Next.js island
- [ ] هل تحتاج real-time؟ → لا (Astro/Cloudflare لا يدعم)

### 5.4 حالات الاستخدام (Use Cases)

| السيناريو | التطبيق |
|---|---|
| قراءة قرآن | Astro |
| بحث في الأحاديث | Astro (island) |
| قراءة كتاب PDF | Next.js |
| تحميل PDF | Next.js |
| تسجيل مستخدم | Workers (API) |
| Bookmarks | Workers (D1) |

### 5.5 PoC - Astro 5 Verification (30 أغسطس 2026)

نُشر PoC للتحقق من جدوى Astro:
- **URL**: https://noor-platform-astro.pages.dev
- **GitHub**: github.com/hozifa460/noor-platform-astro
- **Status**: ✅ يعمل (141 صفحة، 0 KB JS، build 1.08s)
- **القرار**: ننتظر 1-2 شهر لتجربة PoC قبل قرار النقل الكامل

### 5.6 مراجعة الأمان - 31 أغسطس 2026

بعد مراجعة شاملة للكود، تم إصلاح:

| المشكلة | الحل | الحالة |
|---|---|---|
| **CSP `'unsafe-inline'`** | middleware.ts يولد nonce (مؤقت للـinline) | ✅ جاهز للـdev |
| **CSP في next.config.ts** | إزالة (بالوسيط) | ✅ |
| **CSP في _headers** | إضافة comment + TODO | ✅ |
| **.agents/** in gitignore | ✅ موجود (سطر 109) | ✅ |
| **URL validation** | `makeSvgFallback` يعقم الاسم الآن | ✅ |
| **Prettier** | `.prettierrc` + `.prettierignore` + script | ✅ |
| **Dependencies `latest`** | لا توجد (كلها `^`) | ✅ |

**الملفات المُضافة**:
- `src/middleware.ts` (CSP nonce generator)
- `src/lib/csp-nonce.ts` (helper للـcomponents)
- `.prettierrc` (config)
- `.prettierignore` (exclude list)

**القرار**: CSP nonce مؤقت (يحتاج migration للـcomponents) -> نكتفي بـ`'unsafe-inline'` حالياً (Cloudflare static export لا يستخدم middleware).

## 📌 4. الوضع الراهن للبنية التحتية للبيانات (Current Data Architecture State)

---

## 📌 4. الوضع الراهن للبنية التحتية للبيانات (Current Data Architecture State)

> **آخر تحديث**: أغسطس 2026 — يعكس الحالة الفعلية للمستودعات والبيئة المنشورة.
> **مصدر الحقيقة**: يجب مطابقة هذا القسم مع `src/lib/data-base.ts` و `docs/DATA_SOURCES.md`.

### 4.1 مستودعات Hugging Face (HF Datasets)

| المستودع | النطاق | الحجم | عدد الملفات | الحالة |
|---|---|---|---|---|
| `hozifa1/noor-platform-shards` | الكتب (legacy) | ~663 MB | ~35,000 | ⚠️ قيد الإزالة |
| `hozifa1/noor-platform-hadith` | الأحاديث (17 كتاب، 50,884 حديث) | ~84 MB | ~1,200 | ✅ نشط |
| `hozifa1/noor-platform-fatwa` | الفتاوى (~226K فتوى) | ~150 MB | ~10,000 | ✅ نشط |
| `hozifa1/noor-platform-books` | كتب (placeholder) | ~1 MB | 1 | ⚠️ فارغ (احتياطي) |

### 4.2 متغيرات البيئة الموحدة (Canonical env vars)

كل متغير يقرأ من `process.env.NEXT_PUBLIC_*` ثم fallback في `src/lib/data-base.ts`:

```ts
HADITH_BASE = process.env.NEXT_PUBLIC_HADITH_BASE
              ?? 'https://huggingface.co/datasets/hozifa1/noor-platform-hadith/resolve/main'
FATWA_BASE = process.env.NEXT_PUBLIC_FATWA_BASE
              ?? process.env.NEXT_PUBLIC_DATA_BASE
              ?? ''
BOOKS_BASE = process.env.NEXT_PUBLIC_BOOKS_BASE
              ?? process.env.NEXT_PUBLIC_DATA_BASE
              ?? ''
```

> **قاعدة**: لا تُضف متغير بيئة جديد إلا بتحديث هذا الدستور + `data-base.ts` + Vercel/Cloudflare env.

### 4.3 بنية البحث في قسم الأحاديث (Hadith Search)

- **micro_index.json** على HF: 38.5 MB (نص كامل 600 char × 50,884 حديث)
- **يُحمّل مرة واحدة** عبر SW cache (حتى 50 MB cap)
- **Engine**: `src/lib/hadith-engine.ts` → `loadHadithMicroIndex()` → `parseMicroIndexPayload()` → `buildMicroTokenMap()`
- **Sharded fallback**: 17 كتاب على HF في `data/hadith/books/{book}/chapters/NNN.json`
- **Search logic**: `searchAcrossAllBooks()` يبحث في الـmicro_index أولاً، fallback إلى book chunks

> **قاعدة**: لا تُنشئ آلية بحث جديدة (inverted index، prefix shards) دون تحديث constitution + specs.

### 4.4 بنية البحث في قسم الفتاوى (Fatwa Search)

- **micro_shards pattern** (مطابق لـfatwa): `data/micro_shards/{h[0:2]}/{h[2:4]}/{h}.json`
- **prefix_router.json** (27 KB) → يحول prefix 2-char من النص إلى hash
- **Engine**: `src/lib/micro-shard-engine.ts` (نمط `class MicroShardEngine`)
- **عدد الـfatwa shards**: 1,564

### 4.5 استراتيجية التخزين المؤقت (Service Worker Cache)

ملف: `public/sw.js`
- `CACHE_VERSION = 'v3-hf-shards'`
- **JSON size cap**:
  - fatwa shards: 10 MB
  - hadith micro_index: 50 MB
  - other JSON: 2 MB
- **maxItems**: fatwa = 2000, others = 100
- **Stale-while-revalidate** للـJSON
- **Network-first** للـnavigations
- **Cache-first** لـ `_next/static/*` والـfonts

### 4.6 البيئة المنشورة (Deployment)

- **Cloudflare Pages**: `noor-platform.pages.dev` (static export, `out/`)
- **Vercel**: `noor-platform-jade.vercel.app` (legacy، قيد الإزالة)
- **Build**: `output: 'export'` للـCloudflare، `output: 'standalone'` للـVercel
- **CI**: `.github/workflows/ci.yml`

### 4.7 ملفات العمل الحالية (Working Files)

> **تحذير**: هذه ملفات نشطة (ليست legacy):
> - `src/lib/data-base.ts` — يحدد `HADITH_BASE/FATWA_BASE/BOOKS_BASE`
> - `src/lib/hadith-engine.ts` — `loadHadithMicroIndex` + `searchAcrossAllBooks`
> - `src/lib/micro-shard-engine.ts` — Fatwa search
> - `src/lib/book-text-engine.ts` — Books loader
> - `src/stores/hadith-store.ts` — Hadith UI state
> - `src/stores/fatwa-store.ts` — Fatwa UI state
> - `public/sw.js` — Cache strategy

### 4.8 ملفات Legacy / مرشحة للحذف

- `src/lib/pdf/` subdirectory (تم استبداله بـ`book-text/`)
- `src/lib/book-intent-engine.ts` (مكرر من book-text-engine)
- `scripts/upload_shards_fast.py`, `upload_shards_to_hf.py` (استُبدلت بـ`fatwa_mover.py`)
- `scripts/inspect_empty_previews.mjs` (debugging legacy)
- ~15 سكريبت في `scripts/` يعود تاريخها 2025 (يجب مراجعتها)

