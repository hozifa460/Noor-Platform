# 🕌 Noor Platform | منصة النور

<div align="center">

<img src="./public/logo.svg" alt="Noor Platform logo" width="140" />

## منصة النور — Islamic Streaming Platform

منصة إسلامية حديثة تجمع المحتوى المرئي والمسموع والكتب والفتاوى في تجربة واحدة، مع تحميل المحتوى تلقائيًا من مستودعات GitHub وGitLab ودمجه في مكتبة موحّدة.

*A modern Islamic platform that brings videos, audio, books, and fatwas together in one experience, while automatically loading content from GitHub and GitLab repositories into a unified library.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5a0fc8?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

[⭐ مستودع المشروع على GitHub](https://github.com/hozifa460/Noor-Platform)

</div>

---

## 📖 نبذة عن المشروع

منصة النور هي تطبيق ويب بواجهة عربية واتجاه RTL، صُمم ليكون مركزًا موحّدًا للوصول إلى المحتوى الإسلامي. تعتمد المنصة على ملفات JSON موزّعة في مستودعات GitHub وGitLab، ثم تقوم بجلبها ودمجها وتصنيفها تلقائيًا حسب نوع المحتوى واسم الشيخ.

### English

Noor Platform is an Arabic RTL web application designed as a unified hub for Islamic content. It reads distributed JSON indexes from GitHub and GitLab, merges them, and automatically classifies the content by media type and Sheikh name.

## ✨ المميزات الرئيسية

| الميزة | الوصف | Feature |
|---|---|---|
| 🎬 مكتبة وسائط موحّدة | فيديوهات، شورتس، بث مباشر، إذاعات، مقالات، كتب وفتاوى في مكان واحد. | Unified media library |
| 👳 ملفات المشايخ | اكتشاف المشايخ تلقائيًا من بنية الملفات مع صفحة خاصة لكل شيخ. | Sheikh profiles |
| 🔄 مزامنة تلقائية | جلب ملفات `index.json` ودمج المصادر مع دعم التحديث الدوري والتحميل التدريجي. | Automatic synchronization |
| 🛡️ مصادر احتياطية | التبديل تلقائيًا بين GitHub وGitLab عند الحاجة، مع إظهار حالة كل مصدر. | Repository fallback |
| 📚 قارئ PDF متقدم | بحث داخل الكتاب، إشارات مرجعية، حفظ موضع القراءة، تكبير، ملء الشاشة، وأنماط قراءة متعددة. | Advanced PDF reader |
| ▶️ مشغل متعدد | دعم YouTube والفيديو والصوت والبث المباشر وملفات PDF. | Multi-format player |
| ❤️ مكتبة شخصية | المفضلة، سجل المشاهدة، متابعة المشاهدة، والتنزيلات المحلية. | Personal library |
| 🌙 تجربة قابلة للتخصيص | الوضع الفاتح والداكن، إعدادات اللغة، موفر البيانات، والجلب المسبق. | Customizable experience |
| 📱 تطبيق قابل للتثبيت | دعم PWA وService Worker مع تصميم متجاوب للهواتف والحواسيب. | Installable PWA |
| ⌨️ اختصارات وتنقّل سلس | تنقّل داخلي سريع، دعم زر الرجوع في المتصفح، واختصارات لوحة المفاتيح. | Smooth navigation |

### English

The platform includes a unified media library, automatically discovered Sheikh profiles, progressive synchronization, GitHub/GitLab fallback sources, an advanced PDF reader, multi-format playback, favorites, history, continue watching, local downloads, themes, PWA support, responsive layouts, and keyboard-friendly navigation.

## 🧩 مصادر المحتوى الافتراضية

تأتي المنصة مهيّأة افتراضيًا مع المصادر التالية:

- `hozifa460/fatawa_database/radio_database` — مجموعات الفيديو والشورتس والبث ومحتوى المشايخ.
- `hazozahz-islamway/hazozahz-islamway/radio_islam` — مصدر GitLab احتياطي ومكمّل.
- `hozifa460/fatawa_database/fatawa_bibaz` — أرشيف الفتاوى.

يمكن تعديل المصادر أو إضافة مصادر جديدة من صفحة **الإعدادات** داخل التطبيق، مع تحديد المزود والفرع والمسار وتفعيل المزامنة.

### English

The default configuration includes the three sources above. Additional GitHub or GitLab repositories can be added from **Settings** by specifying the provider, branch, path, and synchronization status.

## 🛠️ التقنيات المستخدمة

- **Next.js 16** مع App Router وواجهات API.
- **React 19** و **TypeScript 5**.
- **Tailwind CSS 4** و **shadcn/ui / Radix UI** لبناء الواجهة.
- **Zustand** لإدارة حالة المكتبة والمشغل والإعدادات والمفضلة والسجل.
- **TanStack Query** لإدارة عمليات الجلب والتحديث.
- **PDF.js** لبناء قارئ الكتب داخل المنصة.
- **HLS.js** وواجهات YouTube لتشغيل مصادر الفيديو والبث.
- **IndexedDB وlocalStorage** للتخزين المحلي، التقدم، الإشارات المرجعية والتنزيلات.
- **Prisma وSQLite** كطبقة بيانات قابلة للتوسعة.

### English

The project is built with Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Radix UI, Zustand, TanStack Query, PDF.js, HLS.js, IndexedDB, localStorage, Prisma, and SQLite.

## 🚀 تشغيل المشروع محليًا

### المتطلبات

- Node.js 20 أو أحدث.
- npm أو Bun.
- اتصال بالإنترنت لجلب المحتوى من المستودعات الخارجية.

### التثبيت والتشغيل

```bash
git clone https://github.com/hozifa460/Noor-Platform.git
cd Noor-Platform
npm install
npm run dev
```

افتح بعد ذلك:

```text
http://localhost:3000
```

### أو باستخدام Bun

```bash
bun install
bun run dev
```

### English

Requirements: Node.js 20+, npm or Bun, and an internet connection for remote content sources.

```bash
git clone https://github.com/hozifa460/Noor-Platform.git
cd Noor-Platform
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

## 📦 أوامر المشروع

| الأمر | الاستخدام |
|---|---|
| `npm run dev` | تشغيل بيئة التطوير على المنفذ 3000. |
| `npm run build` | إنشاء نسخة الإنتاج. |
| `npm start` | تشغيل نسخة الإنتاج بعد البناء. |
| `npm run lint` | فحص الكود باستخدام ESLint. |
| `npm run db:generate` | توليد Prisma Client. |
| `npm run db:push` | مزامنة مخطط Prisma مع قاعدة البيانات. |

### English

Use `npm run dev` for development, `npm run build` to create a production build, `npm start` to serve it, `npm run lint` for linting, and the `db:*` scripts for Prisma database tasks.

## 🗂️ هيكل المشروع

```text
Noor-Platform/
├── public/                 # الشعار، الأيقونات، الكتب، الإذاعات وملفات PWA
├── prisma/                 # مخطط Prisma
├── scripts/                # أدوات مساعدة لإدارة البيانات والأيقونات
├── src/
│   ├── app/                # الصفحات وواجهات API
│   ├── components/         # مكونات الواجهة والمشغل وقارئ PDF
│   ├── hooks/              # المزامنة، المشاهدة، البث والـ PDF
│   ├── lib/                # الجلب، التصنيف، المستودعات والتخزين
│   └── stores/             # حالات المكتبة والمشغل والإعدادات
├── next.config.ts
├── package.json
└── tsconfig.json
```

### English

The main source code lives under `src/`: `app` contains pages and API routes, `components` contains the UI and players, `hooks` contains synchronization and viewer logic, `lib` contains data utilities, and `stores` contains application state. Static assets and built-in catalogs live under `public/`.

## ⚙️ كيف تعمل المزامنة؟

1. تُقرأ ملفات الفهرسة من المستودعات المفعّلة.
2. تُدمج المسارات القادمة من المصادر المختلفة مع دعم المصدر الاحتياطي.
3. تُجلب ملفات JSON بالتوازي وبعدد اتصالات محدود.
4. تُحوّل البيانات إلى عناصر وسائط موحّدة.
5. يُكتشف اسم الشيخ والقسم تلقائيًا من بنية الملفات.
6. تُعرض النتائج تدريجيًا، بينما تُحمّل ملفات الأرشيف عند طلب المستخدم.

### English

The app reads enabled repository indexes, merges file paths with fallback support, fetches JSON files concurrently with controlled concurrency, normalizes them into shared media items, derives Sheikh and section metadata, renders results progressively, and lazy-loads archive files when requested.

## 🤝 المساهمة

المساهمات مرحّب بها. يمكنك فتح Issue لاقتراح ميزة أو الإبلاغ عن مشكلة، أو إنشاء Pull Request لتحسين الكود أو الواجهة أو تجربة القراءة.

### English

Contributions are welcome. Open an Issue for feature requests and bug reports, or submit a Pull Request with improvements to the code, interface, or reading experience.

## ⚠️ ملاحظات مهمة

- يعتمد عرض المحتوى على توافر المستودعات ومصادر الوسائط الخارجية.
- تأكد من امتلاكك الحق في إعادة نشر أو استخدام أي محتوى تضيفه إلى مصادر البيانات.
- المنصة لا تدّعي ملكية المحتوى القادم من YouTube أو GitHub أو GitLab أو أي مصدر خارجي.
- استخدم خدمات التنزيل والمصادر الخارجية بما يتوافق مع شروط استخدامها والقوانين المحلية.
- لا تُضمّن أسرارًا أو مفاتيح API داخل المستودع.

### English

- Content availability depends on external repositories and media providers.
- Make sure you have permission to redistribute or use any content added to the data sources.
- The platform does not claim ownership of content originating from YouTube, GitHub, GitLab, or other external providers.
- Use download services and external sources in accordance with their terms and applicable laws.
- Never commit secrets or API keys to the repository.

## 📄 الترخيص

لم يتم تحديد ترخيص مفتوح رسمي للمشروع داخل المستودع حتى الآن. يُرجى التواصل مع صاحب المشروع قبل إعادة الاستخدام أو التوزيع.

### English

No formal open-source license has been specified in the repository yet. Contact the project owner before reusing or redistributing the code.

## 👨‍💻 المطوّر

**hozifa460**

- GitHub: [@hozifa460](https://github.com/hozifa460)
- Repository: [Noor-Platform](https://github.com/hozifa460/Noor-Platform)

### English

Developed by **hozifa460**. Visit the [GitHub profile](https://github.com/hozifa460) or the [Noor-Platform repository](https://github.com/hozifa460/Noor-Platform).

<div align="center">

### 🌙 نسأل الله أن يجعل هذا العمل نافعًا ومباركًا

*May Allah make this work beneficial and blessed.*

</div>
