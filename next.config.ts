import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Dual deployment target:
// 1. Vercel (serverless): default output, route handlers in src/app/api/* active.
// 2. Cloudflare Pages: static export (out/) via CF_PAGES, edge functions in functions/ active.
const isVercel = Boolean(process.env.VERCEL);
const isCloudflare = Boolean(process.env.CF_PAGES || process.env.CLOUDFLARE_PAGES);

// Origins the browser is allowed to load images/media from. Keep this list
// explicit — a bare `https:` wildcard would let any compromised data source
// inject arbitrary remote images.
const IMG_ORIGINS = [
  "https://i.ytimg.com",
  "https://*.ytimg.com",
  "https://yt3.ggpht.com",
  "https://*.ggpht.com",
  "https://*.googleusercontent.com",
  "https://archive.org",
  "https://*.archive.org",
  "https://huggingface.co",
  "https://*.huggingface.co",
  "https://cdn-lfs.hf.co",
  "https://*.hf.co",
  "https://raw.githubusercontent.com",
  "https://mp3quran.net",
  "https://*.mp3quran.net",
  "https://cdn.islamic.network",
  "https://static.qurancdn.com",
  "https://*.qurancdn.com",
];

const MEDIA_ORIGINS = [
  "https://everyayah.com",
  "https://*.everyayah.com",
  "https://mp3quran.net",
  "https://*.mp3quran.net",
  "https://server6.mp3quran.net",
  "https://server7.mp3quran.net",
  "https://server8.mp3quran.net",
  "https://archive.org",
  "https://*.archive.org",
  "https://huggingface.co",
  "https://*.huggingface.co",
  "https://cdn-lfs.hf.co",
  "https://*.hf.co",
  "https://cdn.islamic.network",
  "https://download.quranicaudio.com",
  "https://*.quranicaudio.com",
  "https://*.radiojar.com",
  "https://*.zeno.fm",
  "https://stream.zeno.fm",
];

const CONNECT_ORIGINS = [
  "https://everyayah.com",
  "https://*.everyayah.com",
  "https://huggingface.co",
  "https://*.huggingface.co",
  "https://cdn-lfs.hf.co",
  "https://*.hf.co",
  "https://raw.githubusercontent.com",
  "https://api.alquran.cloud",
  "https://api.qurancdn.com",
  "https://mp3quran.net",
  "https://*.mp3quran.net",
  "https://archive.org",
  "https://*.archive.org",
  "https://gitlab.com",
  "https://*.ytimg.com",
  "https://www.youtube.com",
  "https://*.upstash.io",
];

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com https://s.ytimg.com;`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      `img-src 'self' data: blob: ${IMG_ORIGINS.join(" ")};`,
      `media-src 'self' blob: ${MEDIA_ORIGINS.join(" ")};`,
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com;",
      `connect-src 'self' blob: data: ${CONNECT_ORIGINS.join(" ")};`,
      "font-src 'self' data: https://fonts.gstatic.com;",
      "worker-src 'self' blob:;",
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
      "frame-ancestors 'self';",
      "upgrade-insecure-requests;",
    ].join(" "),
  },
];

const nextConfig: NextConfig = {
  // On Cloudflare Pages (CF_PAGES=1), export static HTML into out/ with unoptimized images.
  // On Vercel / Node server, keep default serverless output so API route handlers work.
  ...(isCloudflare ? { output: "export" as const } : {}),
  // Vercel-specific headers (on Cloudflare Pages, public/_headers is used instead)
  ...(isVercel || !isCloudflare
    ? {
        async headers() {
          return [
            { source: "/:path*", headers: securityHeaders },
            {
              // Avatars and proxied assets are immutable per query key.
              source: "/api/sheikh-avatar",
              headers: [
                { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
              ],
            },
          ];
        },
      }
    : {}),
  images: isCloudflare
    ? { unoptimized: true }
    : {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
          { protocol: "https", hostname: "i.ytimg.com" },
          { protocol: "https", hostname: "yt3.ggpht.com" },
          { protocol: "https", hostname: "**.googleusercontent.com" },
          { protocol: "https", hostname: "archive.org" },
          { protocol: "https", hostname: "**.archive.org" },
          { protocol: "https", hostname: "huggingface.co" },
          { protocol: "https", hostname: "**.hf.co" },
          { protocol: "https", hostname: "raw.githubusercontent.com" },
        ],
      },
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
