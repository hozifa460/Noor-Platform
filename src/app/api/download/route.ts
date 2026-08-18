import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { validateSafeUrl, sanitizeFilename } from '@/lib/security';
import { enforceRateLimit } from '@/lib/rate-limiter';

/**
 * Noor Platform — Secure Media Download API Route
 *
 * Security Enhancements:
 * 1. Strict multi-hop redirect validation (SSRF protection).
 * 2. Hard byte-counting TransformStream limit (250MB).
 * 3. Verified TLS certificates (no --no-check-certificates).
 * 4. Sanitized user-facing error messages without internal stack leakage.
 */

function findYtDlp(): string {
  return process.env.YTDLP_PATH || (process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtu.be'
    );
  } catch {
    return false;
  }
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split(/[?#]/)[0] || null;
    }
    if (host.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v && v.length === 11) return v;
      const id = url.split(/\/(?:embed|shorts)\//)[1]?.split(/[?&]/)[0];
      return id && id.length === 11 ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Promisified yt-dlp invocation with TLS verification. */
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
      reject(new Error(`Execution error: ${err.message}`));
    });

    proc.on('close', (code) => {
      const directUrl = stdout.trim().split('\n')[0];
      if (code === 0 && directUrl && /^https?:\/\//i.test(directUrl)) {
        resolve(directUrl);
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });
  });
}

const MAX_STREAM_BYTES = 250 * 1024 * 1024; // 250 MB
const MAX_REDIRECTS = 5;
const STREAM_TIMEOUT_MS = 60_000;

/** Fetches upstream media with per-hop SSRF validation and returns Response with byte-limiting stream. */
async function streamUrl(initialUrl: string, filename: string): Promise<Response> {
  let currentUrl = initialUrl;
  let upstream: Response | null = null;
  const visited = new Set<string>();

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (visited.has(currentUrl)) {
      return NextResponse.json({ error: 'Redirect loop detected' }, { status: 508 });
    }
    visited.add(currentUrl);

    // Validate URL on EACH hop
    const validation = await validateSafeUrl(currentUrl, { enforceWhitelist: true });
    if (!validation.safe) {
      return NextResponse.json(
        { error: 'Forbidden host', message: validation.error || 'Access to this host is prohibited' },
        { status: 403 }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

    try {
      upstream = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Noor-Platform/2.0)',
          'Accept': 'audio/*,video/*,application/pdf,application/octet-stream,*/*;q=0.8',
        },
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Handle 3xx redirects safely
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (!location) {
        return NextResponse.json(
          { error: `Redirect ${upstream.status} missing Location header` },
          { status: 502 }
        );
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    break;
  }

  if (!upstream || !upstream.ok || upstream.body === null) {
    return NextResponse.json(
      { error: 'Upstream media unavailable' },
      { status: upstream ? (upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502) : 502 }
    );
  }

  // Check Content-Length if present
  const clHeader = upstream.headers.get('content-length');
  if (clHeader) {
    const cl = parseInt(clHeader, 10);
    if (!isNaN(cl) && cl > MAX_STREAM_BYTES) {
      return NextResponse.json(
        { error: 'File Too Large', message: `File size exceeds the maximum allowed limit (${MAX_STREAM_BYTES / (1024 * 1024)}MB)` },
        { status: 413 }
      );
    }
  }

  // Enforce runtime byte limit through TransformStream
  let bytesRead = 0;
  const byteLimiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesRead += chunk.byteLength;
      if (bytesRead > MAX_STREAM_BYTES) {
        controller.error(new Error(`Stream exceeded maximum byte limit of ${MAX_STREAM_BYTES} bytes`));
        return;
      }
      controller.enqueue(chunk);
    },
  });

  const limitedBody = upstream.body.pipeThrough(byteLimiter);
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const cleanName = sanitizeFilename(filename, 'media_file');

  const asciiFallback = cleanName.replace(/[^\x20-\x7E]/g, '_').slice(0, 120) || 'media';
  const utf8Encoded = encodeURIComponent(cleanName.slice(0, 150));
  const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  if (clHeader) headers.set('Content-Length', clHeader);
  headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(limitedBody, { status: 200, headers });
}

function buildFilename(customName: string | null, format: string, targetUrl: string): string {
  if (customName) {
    const ext = format === 'audio' ? '.mp3' : '.mp4';
    return customName.endsWith(ext) ? customName : `${customName}${ext}`;
  }
  try {
    const pathname = new URL(targetUrl).pathname;
    const base = path.basename(pathname);
    if (base && base.length > 3) return base;
  } catch {
    /* fallback */
  }
  return format === 'audio' ? 'noor_audio.mp3' : 'noor_video.mp4';
}

export async function GET(req: NextRequest) {
  const rateLimitResult = enforceRateLimit(req, 'api-download', 20, 60_000);
  if (!rateLimitResult.allowed && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  const { searchParams } = req.nextUrl;
  const target = searchParams.get('url');
  const format = (searchParams.get('format') === 'audio' ? 'audio' : 'video') as 'audio' | 'video';
  const customName = searchParams.get('name');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const validation = await validateSafeUrl(target, { enforceWhitelist: true });
  if (!validation.safe) {
    return NextResponse.json(
      { error: 'Forbidden URL', message: validation.error || 'The requested URL is not allowed' },
      { status: 403 }
    );
  }

  const filename = buildFilename(customName, format, target);

  if (isYouTubeUrl(target)) {
    try {
      const directUrl = await ytdlpGetDirectUrl(target, format);
      return await streamUrl(directUrl, filename);
    } catch (err) {
      console.error('[Download API Error]', err);
      const videoId = extractYouTubeId(target);
      return NextResponse.json(
        {
          error: 'YouTube Download Unavailable',
          message: 'Could not extract direct stream URL for this video.',
          videoId: videoId || undefined,
        },
        { status: 502 }
      );
    }
  }

  try {
    return await streamUrl(target, filename);
  } catch (err) {
    console.error('[Download API Error]', err);
    return NextResponse.json(
      { error: 'Streaming Failed', message: 'An error occurred while streaming media content' },
      { status: 502 }
    );
  }
}
