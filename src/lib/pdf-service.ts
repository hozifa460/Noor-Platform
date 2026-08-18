import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { validateSafeUrl } from './security';

const execFileAsync = promisify(execFile);

const CACHE_DIR = path.join(os.tmpdir(), 'noor-pdf-cache');
const MAX_CACHE_BYTES = 300 * 1024 * 1024; // 300 MB maximum total cache size
const MAX_PDF_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100 MB maximum single PDF size
const PDF_TIMEOUT_MS = 30_000;

/**
 * Ensures the cache directory exists.
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {
    // Already exists
  }
}

/**
 * LRU / Size-based cache eviction to prevent disk exhaustion DoS attacks.
 */
async function evictCacheIfNeeded(): Promise<void> {
  try {
    await ensureCacheDir();
    const files = await fs.readdir(CACHE_DIR);
    const fileStats: { path: string; size: number; mtime: number }[] = [];
    let totalSize = 0;

    for (const file of files) {
      const fullPath = path.join(CACHE_DIR, file);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          fileStats.push({ path: fullPath, size: stat.size, mtime: stat.mtimeMs });
          totalSize += stat.size;
        }
      } catch {
        // Skip unreadable files
      }
    }

    if (totalSize > MAX_CACHE_BYTES) {
      // Sort oldest first
      fileStats.sort((a, b) => a.mtime - b.mtime);
      const targetSize = MAX_CACHE_BYTES * 0.7; // Reduce to 70%
      let currentSize = totalSize;

      for (const item of fileStats) {
        if (currentSize <= targetSize) break;
        try {
          await fs.unlink(item.path);
          currentSize -= item.size;
        } catch {
          // Ignore deletion errors
        }
      }
    }
  } catch (err) {
    console.error('[pdf-service] Cache eviction error:', err);
  }
}

/**
 * Securely downloads and caches a PDF file.
 */
export async function getOrDownloadPdf(url: string): Promise<string> {
  const validation = await validateSafeUrl(url, { enforceWhitelist: true });
  if (!validation.safe) {
    throw new Error(`PDF security validation failed: ${validation.error}`);
  }

  await ensureCacheDir();
  const cacheKey = Buffer.from(url).toString('base64url').slice(0, 64);
  const cachedPath = path.join(CACHE_DIR, `${cacheKey}.pdf`);

  // Check if already in cache and not zero-byte
  try {
    const stat = await fs.stat(cachedPath);
    if (stat.size > 0) {
      // Touch mtime for LRU tracking
      await fs.utimes(cachedPath, new Date(), new Date()).catch(() => {});
      return cachedPath;
    }
  } catch {
    // Not cached
  }

  await evictCacheIfNeeded();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0)',
        'Accept': 'application/pdf, application/octet-stream',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF from source: HTTP ${response.status}`);
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const length = parseInt(contentLengthHeader, 10);
      if (!isNaN(length) && length > MAX_PDF_DOWNLOAD_BYTES) {
        throw new Error(`PDF exceeds maximum allowed file size of ${MAX_PDF_DOWNLOAD_BYTES / (1024 * 1024)}MB`);
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_PDF_DOWNLOAD_BYTES) {
      throw new Error(`Downloaded PDF size (${Math.round(buffer.length / 1024 / 1024)}MB) exceeds safety limit`);
    }

    await fs.writeFile(cachedPath, buffer);
    return cachedPath;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asynchronously renders a single PDF page to PNG using pdftoppm without blocking the event loop.
 */
export async function renderPdfPageAsync(
  pdfPath: string,
  page: number,
  width: number
): Promise<Buffer> {
  const tempPrefix = `pdf-page-${page}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const outputPathNoExt = path.join(os.tmpdir(), tempPrefix);
  const expectedOutputPng = `${outputPathNoExt}.png`;
  const dpi = Math.min(200, Math.max(72, Math.floor(width / 4)));

  const args = [
    '-png',
    '-f',
    String(page),
    '-l',
    String(page),
    '-r',
    String(dpi),
    '-singlefile',
    pdfPath,
    outputPathNoExt,
  ];

  try {
    // Non-blocking async execution with direct argument array (no shell interpolation)
    await execFileAsync('pdftoppm', args, { timeout: 25_000 });
  } catch (err: any) {
    // Clean up if created
    await fs.unlink(expectedOutputPng).catch(() => {});
    throw new Error(`PDF page rendering failed (pdftoppm): ${err.stderr || err.message}`);
  }

  try {
    const pngBuffer = await fs.readFile(expectedOutputPng);
    await fs.unlink(expectedOutputPng).catch(() => {});
    return pngBuffer;
  } catch {
    // Attempt to locate any matching file in tmpdir
    const tmpDir = os.tmpdir();
    const files = await fs.readdir(tmpDir);
    const match = files.find((f) => f.startsWith(tempPrefix));
    if (match) {
      const matchPath = path.join(tmpDir, match);
      const pngBuffer = await fs.readFile(matchPath);
      await fs.unlink(matchPath).catch(() => {});
      return pngBuffer;
    }
    throw new Error(`Rendered page file was not found: ${expectedOutputPng}`);
  }
}

/**
 * Asynchronously extracts PDF metadata (page count, dimensions) using pdfinfo.
 */
export async function getPdfInfoAsync(
  pdfPath: string
): Promise<{ numPages: number; width: number; height: number }> {
  try {
    const { stdout } = await execFileAsync('pdfinfo', [pdfPath], { timeout: 15_000 });
    const pagesMatch = stdout.match(/Pages:\s+(\d+)/);
    const sizeMatch = stdout.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);

    if (!pagesMatch) {
      throw new Error('Could not parse page count from pdfinfo output');
    }

    return {
      numPages: parseInt(pagesMatch[1], 10),
      width: sizeMatch ? parseFloat(sizeMatch[1]) : 595,
      height: sizeMatch ? parseFloat(sizeMatch[2]) : 842,
    };
  } catch (err: any) {
    throw new Error(`Failed to extract PDF metadata (pdfinfo): ${err.stderr || err.message}`);
  }
}
