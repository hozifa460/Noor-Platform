/**
 * Service Worker for منصة النور — Islamic Streaming Platform.
 *
 * Strategy:
 *  - Network-only for /api/* routes and media streams (audio/video/HLS).
 *  - Network-first for page navigations.
 *  - Cache-first for immutable static assets (_next/static, fonts, icons).
 *  - Stale-while-revalidate for static public data JSON.
 */

const CACHE_VERSION = 'v2-msz0j5jp';
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

  // 5. Static JSON under 2MB (stale-while-revalidate with LRU size limit)
  if (url.pathname.endsWith('.json') && !url.pathname.includes('manifest')) {
    event.respondWith(
      caches.open(CONTENT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then(async (networkRes) => {
            if (networkRes.ok) {
              const cl = networkRes.headers.get('content-length');
              // Only cache files under 2MB
              if (cl && parseInt(cl, 10) < 2 * 1024 * 1024) {
                const keys = await cache.keys();
                if (keys.length >= 100) {
                  await cache.delete(keys[0]);
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
  }
});
