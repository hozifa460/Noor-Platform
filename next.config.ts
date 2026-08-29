import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Security headers that were previously set via Next.js `headers()` are
// now applied via `_headers` in the static export for Cloudflare Pages
// (and via `headers` in next.config for Vercel/dev). The values are
// kept identical so behaviour doesn't change between targets.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com https://s.ytimg.com;`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "img-src 'self' data: blob: https:;",
      "media-src 'self' blob: https:;",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com;",
      "connect-src 'self' blob: data: https://everyayah.com https://*.everyayah.com https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com https://api.alquran.cloud https://api.qurancdn.com https://mp3quran.net https://*.mp3quran.net https://archive.org https://*.archive.org https://gitlab.com https://*.ytimg.com https://www.youtube.com https://*.upstash.io;",
      "font-src 'self' data: https://fonts.gstatic.com;",
      "worker-src 'self' blob:;",
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
      "frame-ancestors 'self';",
    ].join(" "),
  },
];

const isVercel = Boolean(process.env.VERCEL);
const isCloudflareBuild = Boolean(process.env.CF_PAGES || process.env.CLOUDFLARE_PAGES);

// Build matrix:
//   Vercel production:   serverless output → /api/* work as today.
//   Cloudflare Pages:    `output: 'export'` → static site, no /api/* in
//                        the build, those are served by Cloudflare Pages
//                        Functions (functions/) or by Vercel as a fallback.
//   Local dev:           same as Cloudflare (static), so npm run build
//                        reproduces what Cloudflare will deploy.
const useStaticExport = isCloudflareBuild || (!isVercel && !isDev);

const nextConfig: NextConfig = {
  // `output: 'export'` produces a static `out/` directory for Cloudflare.
  // On Vercel the default serverless output is kept so /api/* works.
  ...(useStaticExport ? { output: 'export' as const } : {}),
  // Vercel-specific headers (CSP, HSTS, etc.) — on Cloudflare these are
  // served via the public/_headers file instead.
  ...(isVercel
    ? {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }
    : {}),
  // Prevent accidental image domains from generating runtime errors on
  // Cloudflare static export.
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Disable powered-by header to avoid leaking framework details.
  poweredByHeader: false,
};

export default nextConfig;

