import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

/**
 * Universal download endpoint.
 *
 * Supports:
 *   1. Direct media URLs (mp3, mp4, etc.) — server-side proxy that streams the
 *      bytes back with `Content-Disposition: attachment` so the browser saves
 *      the file. Also bypasses CORS for archive.org / cross-origin media.
 *   2. YouTube URLs — uses yt-dlp to extract a direct downloadable URL, then
 *      streams the result back. Falls back to redirecting the user to a
 *      download helper service if yt-dlp is unavailable or blocked.
 *
 * Usage:
 *   /api/download?url=<encoded URL>&format=audio|video&filename=custom.mp3
 */

const YT_DLP_PATHS = [
  '/home/z/.local/bin/yt-dlp',
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
];

function findYtDlp(): string | null {
  for (const p of YT_DLP_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
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
    const bin = findYtDlp();
    if (!bin) {
      reject(new Error('yt-dlp not installed'));
      return;
    }
    const formatFlag = format === 'audio'
      ? 'bestaudio[ext=m4a]/bestaudio/best'
      : 'best[ext=mp4][height<=720]/best[height<=720]/best';
    const args = [
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=android,web_safari,ios,tv',
      '-f', formatFlag,
      '--get-url',
      url,
    ];
    const proc = spawn(bin, args, { timeout: 30000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      const directUrl = stdout.trim().split('\n')[0];
      if (code === 0 && directUrl && /^https?:\/\//i.test(directUrl)) {
        resolve(directUrl);
      } else {
        reject(new Error(stderr || `yt-dlp exit ${code}`));
      }
    });
  });
}

/** Streams a URL back to the client with attachment headers. */
async function streamUrl(url: string, filename: string): Promise<Response> {
  // Don't pass request.signal — it gets aborted when the client navigates away
  // or the iframe is removed, which would cut off long downloads.
  const upstream = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'audio/*,video/*,application/octet-stream,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!upstream.ok || upstream.body === null) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}`, url },
      { status: upstream.status || 502 },
    );
  }

  // Guess content type from upstream or filename.
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const contentLength = upstream.headers.get('content-length') || '';

  // Build a Content-Disposition header that handles Arabic filenames safely.
  // The ASCII fallback (`filename="..."`) must only contain ASCII chars;
  // the Unicode filename is encoded via `filename*=UTF-8''...`.
  const asciiFallback = filename
    .replace(/[^\x00-\x7F]+/g, '_') // Replace any non-ASCII with underscore
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 200) || 'media';
  const utf8Encoded = encodeURIComponent(filename.slice(0, 200));
  const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`;

  const headers = new Headers();
  headers.set('Content-Type', contentType);
  if (contentLength) headers.set('Content-Length', contentLength);
  headers.set('Content-Disposition', disposition);
  headers.set('Cache-Control', 'no-store');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(upstream.body, { status: 200, headers });
}

/** Sanitizes a title into a safe filename with the correct extension. */
function buildFilename(title: string | null, format: 'audio' | 'video', url: string): string {
  const base = (title || 'media').trim().slice(0, 120) || 'media';
  // Pick extension based on format / URL.
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
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');
  const format = (searchParams.get('format') as 'audio' | 'video') || 'video';
  const customName = searchParams.get('filename');

  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const filename = customName
    ? buildFilename(customName, format, target)
    : buildFilename(null, format, target);

  // === Case 1: YouTube URL — resolve via yt-dlp, then stream ===
  if (isYouTubeUrl(target)) {
    try {
      const directUrl = await ytdlpGetDirectUrl(target, format);
      return streamUrl(directUrl, filename);
    } catch (err) {
      // yt-dlp failed (often YouTube blocks datacenter IPs).
      // Fall back to redirecting the user to a download helper service.
      const videoId = extractYouTubeId(target);
      if (videoId) {
        const helperUrl = `https://www.y2mate.com/youtube/${videoId}`;
        return NextResponse.redirect(helperUrl, { status: 302 });
      }
      return NextResponse.json(
        { error: 'YouTube download failed and no helper available', detail: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  }

  // === Case 2: Direct media URL — stream through the proxy ===
  try {
    return await streamUrl(target, filename);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to stream media', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
