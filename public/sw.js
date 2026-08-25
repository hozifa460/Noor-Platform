/**
 * Service Worker for منصة النور — Islamic Streaming Platform.
 *
 * Strategy:
 *  - Network-only for /api/* routes and media streams (audio/video/HLS).
 *  - Network-first for page navigations.
 *  - Cache-first for immutable static assets (_next/static, fonts, icons).
 *  - Stale-while-revalidate for static public data JSON.
 */

const CACHE_VERSION = 'v3-hf-shards';
const STATIC_CACHE = `noor-static-${CACHE_VERSION}`;
const CONTENT_CACHE = `noor-content-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET.
  if (req.method !== 'GET') return;

  // 1. NEVER intercept or cache API endpoints
  if (url.pathname.startsWith('/api/')) return;

  // 2. Bypass cross-origin media streams and audio/video
  const isMediaStream =
    /\.(m3u8|mp4|mp3|aac|ogg|wav|m4a)(\?|$)/i.test(url.pathname) ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('ytimg') ||
    url.hostname.includes('everyayah.com') ||
    url.hostname.includes('mp3quran.net');
  if (isMediaStream) return;

  // 3. Page Navigations: Network-first with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || caches.match('/')))
    );
    return;
  }

  // 4. Next.js Static Assets & Fonts: Cache-first
  if (url.pathname.startsWith('/_next/static/') || /\.(woff2|woff|ttf|svg|png|jpg|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 5. Static JSON (stale-while-revalidate) — same-origin AND HuggingFace dataset.
  //    Fatwa shards on HF are immutable (1.1GB, 226k files); a long cache keeps
  //    repeat visitors off the network entirely.
  const isHfDataHost = url.hostname === 'huggingface.co' || url.hostname.endsWith('.huggingface.co');
  if (url.pathname.endsWith('.json') && !url.pathname.includes('manifest')) {
    const isFatwaShard = /\/data\/(fatwa_answers|shards|micro_shards|fatwa_browse)\//.test(url.pathname);
    // Also handle 2-level sharded paths (ab/cd/abcd1234.json)
    const isShardedShard = /\/(fatwa_answers|micro_shards)\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{8}\.json$/.test(url.pathname);
    const isAnyFatwaShard = isFatwaShard || isShardedShard;
    const sizeCap = isAnyFatwaShard ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
    const maxItems = isAnyFatwaShard ? 2000 : 100;
    event.respondWith(
      caches.open(CONTENT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then(async (networkRes) => {
            if (networkRes.ok) {
              const cl = networkRes.headers.get('content-length');
              if (cl && parseInt(cl, 10) < sizeCap) {
                const keys = await cache.keys();
                while (keys.length >= maxItems) {
                  await cache.delete(keys.shift());
                }
                cache.put(req, networkRes.clone());
              }
            }
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 6. Other HuggingFace dataset files (any non-JSON) — cache-first with LRU
  if (isHfDataHost) {
    event.respondWith(
      caches.open(CONTENT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        return fetch(req).then(async (res) => {
          if (res.ok) {
            const cl = res.headers.get('content-length');
            if (!cl || parseInt(cl, 10) < 10 * 1024 * 1024) {
              const keys = await cache.keys();
              while (keys.length >= 2000) await cache.delete(keys.shift());
              cache.put(req, res.clone());
            }
          }
          return res;
        });
      })
    );
  }
});
