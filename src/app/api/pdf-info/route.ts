import { NextResponse } from 'next/server';
import { getOrDownloadPdf, getPdfInfoAsync } from '@/lib/pdf-service';
import { validateSafeUrl } from '@/lib/security';
import { enforceRateLimitAsync } from '@/lib/rate-limiter';

/**
 * Secure PDF Info API.
 * Returns metadata (numPages, width, height) asynchronously.
 */
export async function GET(request: Request) {
  // Rate limiting (60 req/min)
  const rateLimitResult = await enforceRateLimitAsync(request, 'api-pdf-info', 60, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // SSRF & Host Validation
  const validation = await validateSafeUrl(url, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json(
      { error: 'Forbidden', message: validation.error },
      { status: 403 }
    );
  }

  try {
    const pdfPath = await getOrDownloadPdf(url);
    const info = await getPdfInfoAsync(pdfPath);

    return NextResponse.json(info, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[pdf-info] Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve PDF metadata' },
      { status: 500 }
    );
  }
}
