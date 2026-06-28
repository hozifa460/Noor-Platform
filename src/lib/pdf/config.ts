/**
 * PDF.js Configuration
 *
 * Centralized configuration for PDF.js worker, cMaps, and standard fonts.
 * This module is loaded dynamically (client-side only) to avoid SSR issues
 * with PDF.js's browser-only APIs (DOMMatrix, canvas, etc.).
 */

// Lazy-loaded PDF.js module. Returns the same promise on subsequent calls.
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

export async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = (async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const mod = await import('pdfjs-dist');

        // Configure the worker — served from /public/pdf.worker.min.mjs
        mod.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        return mod;
      } catch (err) {
        lastErr = err;
        console.warn(
          `[pdfjs] Failed to load (attempt ${attempt + 1}/3):`,
          err,
        );
        // Exponential backoff: 500ms, 1000ms, 2000ms
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }
    // All retries failed — reset so the next call can try again.
    pdfjsPromise = null;
    throw lastErr instanceof Error
      ? lastErr
      : new Error('Failed to load PDF.js after 3 attempts');
  })();

  return pdfjsPromise;
}

/**
 * Get the document loading parameters for PDF.js.
 * Includes cMapUrl and standardFontDataUrl for Arabic text rendering.
 */
export function getDocumentParams(url: string) {
  return {
    url,
    // Loading strategy:
    //   - disableAutoFetch: false → let PDF.js fetch the whole file in background
    //     (faster for large PDFs because streaming is more efficient than many Range requests)
    //   - disableStream: false → use HTTP streaming (PDF.js can start rendering as data arrives)
    //   - rangeChunkSize: 65536 → 64KB chunks for Range requests when needed
    disableAutoFetch: false,
    disableStream: false,
    rangeChunkSize: 65536, // 64KB
    // Standard fonts + cMaps for Arabic text rendering.
    cMapUrl: '/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/standard_fonts/',
    useSystemFonts: true,
    verbosity: 0, // errors only
  };
}

/**
 * Validate a URL before loading it as a PDF.
 * Prevents XSS and ensures only allowed hosts are accessed.
 */
const ALLOWED_HOST_PATTERNS = [
  /^archive\.org$/i,
  /^([a-z0-9-]+\.)+archive\.org$/i,
  /^raw\.githubusercontent\.com$/i,
  /^gitlab\.com$/i,
];

export function isAllowedPdfHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow same-origin requests (relative URLs / our proxy).
    if (parsed.origin === window.location.origin) return true;
    return ALLOWED_HOST_PATTERNS.some((p) => p.test(parsed.host));
  } catch {
    return false;
  }
}

/**
 * Route cross-origin PDF URLs through our /api/proxy/pdf endpoint.
 * This bypasses CORS and strips X-Frame-Options.
 */
export function proxifyPdfUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) return url;
    return `/api/proxy/pdf?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
