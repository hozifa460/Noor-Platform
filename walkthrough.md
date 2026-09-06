# Noor Platform — Post-Review Hardening Walkthrough

This document records the resolution of the two deficiencies identified during the review of PR #73.

---

## 1. Deficiencies Addressed

### 1.1 Fatwa Answer Loading Assertion Inadequacy (`tests/e2e/search-flows.spec.ts`)
- **Problem**:
  - `src/features/fatwa/ui/FatwaCard.tsx:41` falls back to `fatwa.description` when `content?.answer` is not yet loaded: `cleanFatwaText(content?.answer || fatwa.description || '')`.
  - In `src/features/fatwa/model/fatwa-store.ts:57`, `indexItemToMediaItem` maps `description: item.question`.
  - In `tests/e2e/search-flows.spec.ts`, the search input selector `page.locator('input[placeholder*="ابحث"], input[type="text"]').first()` was capturing the global header search textbox rather than the fatwa search input inside `<main>`.
  - The previous test assertion only checked `text.trim().length > 20`. Because `fatwa.description` (the question) exceeded 70 characters, the test passed prematurely on the showcase Salah question without ever executing the "صيام" search or waiting for the authentic scholarly answer to load.
- **Fix**:
  - Scoped the search input locator to the library's search bar: `page.locator('main input[placeholder*="ابحث"]').first()`.
  - Added synchronization on search execution: waiting for the results header (`نتائج البحث عن`) to appear and the search spinner (`جاري البحث`) to disappear.
  - Captured both the card title (`cardTitle`) and the pre-expansion fallback text (`initialFallbackQuestion` from `answerContainer`), verifying it initially has `line-clamp-2` and contains `'هل يفسد صيام المريض'`.
  - Deepened answer assertions to verify that:
    1. The answer container has substantive text (`> 20` characters) and is not placeholder text.
    2. The displayed answer is distinct from the card title/question (`expect(text).not.toEqual(cardTitle)`, `expect(text).not.toContain(cardTitle)`).
    3. The displayed answer is distinct from the pre-expansion fallback question (`expect(text).not.toEqual(initialFallbackQuestion)`, `expect(text).not.toContain(initialFallbackQuestion)`).
    4. The displayed answer does not contain the question prompt (`expect(text).not.toContain('هل يفسد صيام المريض')`).
    5. The text contains authentic scholarly answer phrases exclusive to the answer (`expect(text).toMatch(/لا يفطر.*الصائم|لا يفطران الصائم|لتوسيع الشعب|أصح قولي أهل العلم|يجوز لك.*تُفْطر|الإفطار أفضل للمُسافر|يجوز أن تصوم/)`).

### 1.2 CSP Media Sources Lockdown & Honest Architectural Documentation (`src/middleware.ts`, `public/_headers`, `next.config.ts`)
- **Problem**:
  - In `src/middleware.ts`, `media-src 'self' blob: https:` utilized the permissive `https:` wildcard, allowing media streaming from any HTTPS endpoint globally.
  - `public/_headers` contained obsolete comments referencing nonces (`# CSP uses nonce for inline scripts... # TODO: remove this once all inline scripts are nonced`), which contradicted the static SSG architecture.
  - `next.config.ts` was missing `https://raw.githubusercontent.com` from `MEDIA_ORIGINS`.
- **Fix**:
  - Locked down `media-src` in `src/middleware.ts` and `public/_headers` to explicit trusted Islamic audio and media sources:
    `'self' blob: https://everyayah.com https://*.everyayah.com https://mp3quran.net https://*.mp3quran.net https://archive.org https://*.archive.org https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com`.
  - Removed the `https:` wildcard from `media-src`.
  - Added `https://raw.githubusercontent.com` to `MEDIA_ORIGINS` in `next.config.ts` for full cross-environment consistency.
  - Documented in the header of `src/middleware.ts` and comments of `public/_headers` that `'unsafe-inline'` in `script-src` is an intentional architectural tradeoff necessitated by Next.js static site generation (SSG) and Cloudflare Pages static export, where build-time static HTML precludes per-request nonces (which invalidate `unsafe-inline` under W3C CSP Level 2/3).
  - Detailed the platform's multi-layered defense-in-depth:
    1. Input sanitization via DOMPurify across dynamic rendering (`src/lib/shared/sanitize-html.ts`).
    2. Restrictive baseline policies (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`).
    3. Explicit origin containment for `connect-src` and `media-src`.
  - Deepened unit test coverage in `src/__tests__/security.test.ts` verifying that `middleware()` sets the locked-down `media-src` and `connect-src` directives, rejects the `https:` and `*` wildcards, and enforces baseline defense directives.

---

## 2. Verification Record

### Quality Gate Results
- **Circular Dependency Check**: `npm run test:circular` -> Passed (492 files processed, 0 circular dependencies).
- **Unit Tests**: `npm run test:unit` -> Passed (14/14 test files, 208/208 tests).
- **TypeScript Typecheck**: `npm run typecheck` -> Passed (0 errors).
- **ESLint Linting**: `npm run lint` -> Passed (0 errors, 0 warnings).
- **Comprehensive Test Suite**: `npm test` (`scripts/run-all-tests.mjs`) -> Passed (11/11 test suites passed, 100% success).
- **Production Build**: `npm run build` -> Passed (49/49 static pages generated, service worker created).
- **Playwright E2E**: `npm run test:e2e` -> Passed (9/9 tests passed across chromium workers).
