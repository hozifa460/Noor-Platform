import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { validateSafeUrl, sanitizeFilename } from '@/lib/security';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * Universal Secure Media Download Endpoint.
 *
 * Security Enhancements:
 *   1. Strict SSRF protection & Private IP validation.
 *   2. Domain whitelist enforcement (archive.org, youtube, git repositories).
 *   3. Rate limiting per client IP.
 *   4. Cross-platform yt-dlp path resolution (Windows, Linux, macOS).
 *   5. Elimination of third-party adware redirects (y2mate).
 *   6. Sanitized filename and Content-Disposition headers.
 *   7. Stream size and timeout guards against Denial of Service.
 */

const KNOWN_YT_DLP_PATHS = [
  'yt-dlp',
  'yt-dlp.exe',
  '/home/z/.local/bin/yt-dlp',
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  'C:\\yt-dlp\\yt-dlp.exe',
  'C:\\Program Files\\yt-dlp\\yt-dlp.exe',
];

function findYtDlp(): string | null {
  for (const p of KNOWN_YT_DLP_PATHS) {
    if (!path.isAbsolute(p)) {
      // In PATH or relative name
      return p;
    }
    if (existsSync(p)) {
      return p;
    }
  }
  return 'yt-dlp';
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/i.test(url);
}

function extractYouTubeId(url: string): string | null {
  try {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    if (url.includes('youtube.com/watch')) {
      const u = new URL(url);
      const v = u.searchParams.get('v');
      return v && v.length === 11 ? v : null;
    }
    if (url.includes('youtube.com/embed/') || url.includes('youtube.com/shorts/')) {
      const id = url.split(/\/(?:embed|shorts)\//)[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Promisified yt-dlp invocation that returns the direct media URL on stdout. */
function ytdlpGetDirectUrl(url: string, format: 'audio' | 'video'): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = findYtDlp() || 'yt-dlp';
    const formatFlag =
      format === 'audio'
        ? 'bestaudio[ext=m4a]/bestaudio/best'
        : 'best[ext=mp4][height<=720]/best[height<=720]/best';

    const args = [
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
      '--extractor-args',
      'youtube:player_client=android,web_safari,ios,tv',
      '-f',
      formatFlag,
      '--get-url',
      url,
    ];

    const proc = spawn(bin, args, { timeout: 25_000 });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => {
      reject(new Error(`yt-dlp execution error: ${err.message}`));
    });

    proc.on('close', (code) => {
      const directUrl = stdout.trim().split('\n')[0];
      if (code === 0 && directUrl && /^https?:\/\//i.test(directUrl)) {
        resolve(directUrl);
      } else {
        reject(new Error(stderr || `yt-dlp exited with code ${code}`));
      }
    });
  });
}

/** Maximum allowed stream size: 250 MB */
const MAX_STREAM_BYTES = 250 * 1024 * 1024;
const STREAM_TIMEOUT_MS = 60_000;

/** Streams a validated URL back to the client with attachment headers. */
async function streamUrl(url: string, filename: string): Promise<Response> {
  // Validate the URL before fetching to protect against SSRF
  const validation = await validateSafeUrl(url, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json(
      { error: 'Forbidden', message: validation.error || 'Access to this host is not permitted' },
      { status: 403 }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/1.0; +https://github.com/hozifa460/Noor-Platform)',
        'Accept': 'audio/*,video/*,application/pdf,application/octet-stream,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!upstream.ok || upstream.body === null) {
      return NextResponse.json(
        { error: `Upstream error HTTP ${upstream.status}`, url },
        { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502 }
      );
    }

    // Check Content-Length if provided by upstream
    const contentLengthHeader = upstream.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(contentLength) && contentLength > MAX_STREAM_BYTES) {
        return NextResponse.json(
          { error: 'File Too Large', message: `File size exceeds the maximum allowed limit (${MAX_STREAM_BYTES / (1024 * 1024)}MB)` },
          { status: 413 }
        );
      }
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const cleanName = sanitizeFilename(filename, 'media_file');

    // Safe Content-Disposition RFC 6266 / RFC 5987
    const asciiFallback = cleanName.replace(/[^\x20-\x7E]/g, '_').slice(0, 120) || 'media';
    const utf8Encoded = encodeURIComponent(cleanName.slice(0, 150));
    const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLengthHeader) headers.set('Content-Length', contentLengthHeader);
    headers.set('Content-Disposition', disposition);
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(upstream.body, { status: 200, headers });
  } finally {
    clearTimeout(timer);
  }
}

/** Sanitizes a title into a safe filename with the correct extension. */
function buildFilename(title: string | null, format: 'audio' | 'video', url: string): string {
  const base = sanitizeFilename(title || 'media', 'media');
  let ext = format === 'audio' ? 'mp3' : 'mp4';
  const urlLower = url.toLowerCase();
  if (/\.(mp3)(\?|$)/i.test(urlLower)) ext = 'mp3';
  else if (/\.(m4a)(\?|$)/i.test(urlLower)) ext = 'm4a';
  else if (/\.(mp4)(\?|$)/i.test(urlLower)) ext = 'mp4';
  else if (/\.(webm)(\?|$)/i.test(urlLower)) ext = 'webm';
  else if (/\.(ogg)(\?|$)/i.test(urlLower)) ext = 'ogg';
  else if (/\.(wav)(\?|$)/i.test(urlLower)) ext = 'wav';
  else if (/\.(aac)(\?|$)/i.test(urlLower)) ext = 'aac';
  else if (/\.(pdf)(\?|$)/i.test(urlLower)) ext = 'pdf';
  return `${base}.${ext}`;
}

export async function GET(request: Request) {
  // 1. Rate Limiting (20 downloads per minute per IP)
  const rateLimitResult = enforceRateLimit(request, 'api-download', 20, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const format = (searchParams.get('format') as 'audio' | 'video') || 'video';
  const customName = searchParams.get('filename');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // 2. Primary SSRF and URL validation
  const validation = await validateSafeUrl(target, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json(
      {
        error: 'Forbidden URL',
        message: validation.error || 'The requested URL is not allowed',
      },
      { status: 403 }
    );
  }

  const filename = customName
    ? buildFilename(customName, format, target)
    : buildFilename(null, format, target);

  // === Case 1: YouTube URL ===
  if (isYouTubeUrl(target)) {
    try {
      const directUrl = await ytdlpGetDirectUrl(target, format);
      return await streamUrl(directUrl, filename);
    } catch (err: any) {
      const videoId = extractYouTubeId(target);
      // Clean, safe response without third-party adware redirect
      return NextResponse.json(
        {
          error: 'YouTube Download Unavailable',
          message: 'Could not extract direct stream URL for this YouTube video.',
          videoId: videoId || undefined,
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 502 }
      );
    }
  }

  // === Case 2: Direct media URL (archive.org, GitHub raw, etc.) ===
  try {
    return await streamUrl(target, filename);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Streaming Failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
