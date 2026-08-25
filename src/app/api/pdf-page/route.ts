import { NextResponse } from 'next/server';
import { getOrDownloadPdf, renderPdfPageAsync } from '@/lib/pdf-service';
import { validateSafeUrl } from '@/lib/security';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';

/**
 * Secure PDF Page Renderer API.
 * Converts a single PDF page to PNG asynchronously.
 */
const MAX_WIDTH = 1600;

export async function GET(request: Request) {
  // Rate limiting (60 pages per minute per IP)
  const rateLimitResult = await enforceRateLimitAsync(request, 'api-pdf-page', 60, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const pageStr = searchParams.get('page');
  const widthStr = searchParams.get('width');

  if (!url || !pageStr) {
    return NextResponse.json({ error: 'Missing url or page parameter' }, { status: 400 });
  }

  // SSRF & Host Validation
  const validation = await validateSafeUrl(url, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json(
      { error: 'Forbidden', message: validation.error },
      { status: 403 }
    );
  }

  const page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1 || page > 5000) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  const width = widthStr ? parseInt(widthStr, 10) : 800;
  if (isNaN(width) || width < 100 || width > MAX_WIDTH) {
    return NextResponse.json({ error: 'Invalid width' }, { status: 400 });
  }

  try {
    const pdfPath = await getOrDownloadPdf(url);
    const pngBuffer = await renderPdfPageAsync(pdfPath, page, width);

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || '';
    if (errMsg.includes('concurrency limit exceeded')) {
      return NextResponse.json(
        { error: 'Server busy: PDF processing limit reached, please retry' },
        {
          status: 503,
          headers: { 'Retry-After': '3' },
        }
      );
    }
    if (errMsg.includes('PDF_SYSTEM_DEPENDENCY_MISSING')) {
      return NextResponse.json(
        { error: 'PDF service unavailable: server is missing required system dependencies (poppler-utils)' },
        { status: 503, headers: { 'Retry-After': '3600' } }
      );
    }
    console.error('[pdf-page] Error:', err);
    return NextResponse.json(
      { error: 'Failed to render PDF page' },
      { status: 500 }
    );
  }
}
