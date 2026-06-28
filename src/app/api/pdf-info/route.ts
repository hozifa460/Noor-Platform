import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * PDF Info API.
 *
 * Returns metadata about a PDF: page count, page dimensions.
 * Uses `pdfinfo` (poppler-utils) to extract this info server-side.
 *
 * Usage:
 *   GET /api/pdf-info?url=<PDF URL>
 *
 * Returns: { numPages: number, width: number, height: number }
 */

const CACHE_DIR = '/tmp/pdf-cache';

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

async function getPdfInfo(pdfPath: string): Promise<{ numPages: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pdfinfo', [pdfPath], { timeout: 15_000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pdfinfo failed (code ${code}): ${stderr}`));
        return;
      }
      // Parse output. Lines look like:
      //   Pages:          1316
      //   Page size:      595 x 842 pts (A4)
      const pagesMatch = stdout.match(/Pages:\s+(\d+)/);
      const sizeMatch = stdout.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
      if (!pagesMatch) {
        reject(new Error('Could not parse page count from pdfinfo output'));
        return;
      }
      resolve({
        numPages: parseInt(pagesMatch[1], 10),
        width: sizeMatch ? parseFloat(sizeMatch[1]) : 595,
        height: sizeMatch ? parseFloat(sizeMatch[2]) : 842,
      });
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn pdfinfo: ${err.message}`));
    });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  if (!isAllowedHost(url)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const pdfPath = await downloadPdf(url);
    const info = await getPdfInfo(pdfPath);

    return NextResponse.json(info, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[pdf-info] Error:', err);
    return NextResponse.json(
      { error: 'Failed to get PDF info', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
