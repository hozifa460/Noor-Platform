 
/**
 * Service Worker for منصة النور — Islamic Streaming Platform.
 *
 * Strategy:
 *  - Cache-first for static assets (JS, CSS, fonts, images).
 *  - Stale-while-revalidate for index.json / content JSON files.
 *  - Network-only for media streams (audio/video/HLS).
 *  - Offline fallback to cached responses when network fails.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `isp-static-${CACHE_VERSION}`;
const CONTENT_CACHE = `isp-content-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/sample-data/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET.
  if (req.method !== 'GET') return;

  // Bypass cross-origin media streams (YouTube, HLS CDNs, etc.) — let network handle.
  const isMediaStream = /\.(m3u8|mp4|mp3|aac|ogg|wav|m4a)(\?|$)/i.test(url.pathname) ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('ytimg');
  if (isMediaStream) return;

  // Same-origin JSON: stale-while-revalidate.
  const isJson = url.pathname.endsWith('.json') || req.headers.get('accept')?.includes('application/json');
  if (isJson && url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, CONTENT_CACHE));
    return;
  }

  // Static assets (same-origin): cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Cross-origin raw.githubusercontent / gitlab raw: stale-while-revalidate.
  if (url.hostname.includes('raw.githubusercontent.com') || url.hostname.includes('gitlab.com')) {
    event.respondWith(staleWhileRevalidate(req, CONTENT_CACHE));
    return;
  }

  // Default: try network, fall back to cache.
  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((r) => r || caches.match(OFFLINE_URL))),
  );
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
