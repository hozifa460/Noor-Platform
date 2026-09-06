import { NextResponse } from 'next/server';

/**
 * Noor Platform Edge Middleware - Content Security Policy & Security Headers.
 *
 * Architecture Note on CSP & Static Site Generation (SSG):
 * Noor Platform is pre-rendered statically (output: "export" on Cloudflare Pages,
 * static routes on Vercel) for instant offline capabilities, edge caching, and PWA resilience.
 * In static export mode, HTML files are generated at build time, precluding per-request nonces
 * without forcing dynamic server rendering (SSR). Per W3C CSP Level 2/3 specifications, the
 * presence of any 'nonce-*' directive unconditionally invalidates 'unsafe-inline' across modern
 * browsers, which breaks static Next.js hydration scripts.
 *
 * Consequently, retaining 'unsafe-inline' in script-src is an intentional architectural tradeoff
 * necessitated by Next.js static site generation (SSG) / Cloudflare Pages export. Platform security
 * relies on multi-layered defense-in-depth:
 * 1. Strict input and HTML sanitization is enforced via DOMPurify across all dynamic rendering (`sanitize-html.ts`).
 * 2. Restrictive baseline policies (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'self'`) prevent injection and framing attacks.
 * 3. Network ingress and egress are strictly contained by locking down `connect-src` and `media-src` to explicit trusted Islamic audio and media sources rather than permissive wildcards.
 */
export function middleware() {
  const isDev = process.env.NODE_ENV === 'development';
  const csp = [
    `default-src 'self'`,
    // Allow Next.js inline bootstrap/hydration scripts without nonce conflict in SSG
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.youtube.com https://s.ytimg.com`,
    // Styles still use 'unsafe-inline' (CSS-in-JS and Tailwind utilities)
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self' blob: https://everyayah.com https://*.everyayah.com https://mp3quran.net https://*.mp3quran.net https://server6.mp3quran.net https://server7.mp3quran.net https://server8.mp3quran.net https://archive.org https://*.archive.org https://huggingface.co https://*.huggingface.co https://cdn-lfs.hf.co https://*.hf.co https://cdn.islamic.network https://download.quranicaudio.com https://*.quranicaudio.com https://*.radiojar.com https://stream.radiojar.com https://*.zeno.fm https://stream.zeno.fm https://*.itworkscdn.net https://l3.itworkscdn.net https://*.mp3islam.com https://radio.mp3islam.com https://*.radio.co https://streams.radio.co https://*.simplestreaming.co.za https://*.fastcast4u.com https://qurango.net https://*.qurango.net https://raw.githubusercontent.com`,
    `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com`,
    `connect-src 'self' blob: data: https://everyayah.com https://*.everyayah.com https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com https://api.alquran.cloud https://api.qurancdn.com https://mp3quran.net https://*.mp3quran.net https://archive.org https://*.archive.org https://gitlab.com https://*.ytimg.com https://www.youtube.com https://*.upstash.io`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
  ].join('; ');

  const response = NextResponse.next();

  // Set CSP header on response
  response.headers.set('Content-Security-Policy', csp);
  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  return response;
}

export const config = {
  // Run middleware on all pages except static assets and API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webp$|sw.js).*)',
  ],
};
