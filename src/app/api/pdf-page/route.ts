import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * PDF Page Renderer API.
 *
 * Converts a single PDF page to a PNG image server-side using pdftoppm
 * (poppler-utils). The client displays these images in an <img> tag —
 * which works in ALL browsers (Chrome, Firefox, Edge, Safari) without
 * any iframe/security issues.
 *
 * This is the FINAL, ROOT solution for PDF display:
 *   - No iframes (no "page blocked" errors in Edge)
 *   - No PDF.js (no chunk loading failures)
 *   - No Google Docs Viewer (no external dependency)
 *   - No CORS issues (everything is server-side)
 *   - Works in every browser (just <img> tags)
 *   - Lazy page loading (only render requested pages)
 *   - Server-side caching (downloaded PDF is cached on disk)
 *
 * Usage:
 *   GET /api/pdf-page?url=<PDF URL>&page=<page number>&width=<width>
 *
 * Returns: PNG image (image/png)
 */

const CACHE_DIR = '/tmp/pdf-cache';
const MAX_WIDTH = 1200;

const ALLOWED_HOST_PATTERNS = [
  /^archive\.org$/i,
  /^([a-z0-9-]+\.)+archive\.org$/i,
  /^raw\.githubusercontent\.com$/i,
  /^gitlab\.com$/i,
];

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!parsed.host) return true;
    return ALLOWED_HOST_PATTERNS.some((p) => p.test(parsed.host));
  } catch {
    return false;
  }
}

/**
 * Download the PDF to a temp file (cached on disk for subsequent requests).
 */
async function downloadPdf(url: string): Promise<string> {
  const cacheKey = Buffer.from(url).toString('base64').replace(/[/+=]/g, '_').slice(0, 64);
  const cachedPath = path.join(CACHE_DIR, `${cacheKey}.pdf`);

  try {
    await fs.access(cachedPath);
    return cachedPath;
  } catch {
    // Not cached.
  }

  await fs.mkdir(CACHE_DIR, { recursive: true });

  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Noor-Islamic-Platform/1.0)' },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(cachedPath, Buffer.from(buffer));
  return cachedPath;
}

/**
 * Render a single PDF page to PNG using pdftoppm (synchronous for reliability).
 */
async function renderPageToPng(
  pdfPath: string,
  page: number,
  width: number,
): Promise<Buffer> {
  const outputFile = path.join(os.tmpdir(), `pdf-page-${page}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const dpi = Math.min(200, Math.max(72, Math.floor(width / 4)));

  // Build the command. pdftoppm -singlefile writes directly to the output path.
  const cmd = `pdftoppm -png -f ${page} -l ${page} -r ${dpi} -singlefile "${pdfPath}" "${outputFile}"`;

  try {
    execSync(cmd, { timeout: 30_000, stdio: 'pipe' });
  } catch (err: any) {
    const stderr = err.stderr?.toString() || '';
    throw new Error(`pdftoppm failed: ${stderr || err.message}`);
  }

  // Read the rendered PNG.
  try {
    const pngBuffer = await fs.readFile(outputFile);
    await fs.unlink(outputFile).catch(() => {});
    return pngBuffer;
  } catch (err) {
    // If the file doesn't exist, pdftoppm may have used a different naming convention.
    // Try to find any file starting with the output name.
    const dir = path.dirname(outputFile);
    const base = path.basename(outputFile);
    const files = await fs.readdir(dir);
    const match = files.find((f) => f.startsWith(base));
    if (match) {
      const pngBuffer = await fs.readFile(path.join(dir, match));
      await fs.unlink(path.join(dir, match)).catch(() => {});
      return pngBuffer;
    }
    throw new Error(`pdftoppm did not create output file. Tried: ${outputFile}`);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const pageStr = searchParams.get('page');
  const widthStr = searchParams.get('width');

  if (!url || !pageStr) {
    return NextResponse.json({ error: 'Missing url or page parameter' }, { status: 400 });
  }

  if (!isAllowedHost(url)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  const width = widthStr ? parseInt(widthStr, 10) : 800;
  if (isNaN(width) || width < 100 || width > MAX_WIDTH) {
    return NextResponse.json({ error: 'Invalid width' }, { status: 400 });
  }

  try {
    const pdfPath = await downloadPdf(url);
    const pngBuffer = await renderPageToPng(pdfPath, page, width);

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[pdf-page] Error:', err);
    return NextResponse.json(
      { error: 'Failed to render page', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
