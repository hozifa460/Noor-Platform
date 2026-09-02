import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a cryptographically secure nonce for CSP.
 * Used to allow inline scripts/styles only with matching nonce,
 * eliminating the need for 'unsafe-inline'.
 */
function generateNonce(): string {
  // Generate 16 random bytes → base64
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function middleware(request: NextRequest) {
  // Generate a fresh nonce for each request
  const nonce = generateNonce();

  // Build CSP with nonce (replaces 'unsafe-inline' for scripts)
  const isDev = process.env.NODE_ENV === 'development';
  const csp = [
    `default-src 'self'`,
    // Nonce allows inline scripts ONLY with matching nonce
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""} https://www.youtube.com https://s.ytimg.com`,
    // Styles still use 'unsafe-inline' (CSS-in-JS, many libraries need this)
    // TODO: migrate to nonce for styles too
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self' blob: https:`,
    `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com`,
    `connect-src 'self' blob: data: https://everyayah.com https://*.everyayah.com https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com https://api.alquran.cloud https://api.qurancdn.com https://mp3quran.net https://*.mp3quran.net https://archive.org https://*.archive.org https://gitlab.com https://*.ytimg.com https://www.youtube.com https://*.upstash.io`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
  ].join('; ');

  // Pass nonce via request header (so server components can read it)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Forward to the page
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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
