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

**الإصدار**: 2.0.0 | **تاريخ الاعتماد**: أغسطس 2026
