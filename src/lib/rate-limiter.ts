import { NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * In-memory sliding window rate limiter.
 * Automatically cleans up expired IPs periodically to avoid memory leaks.
 */
class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 2 minutes to remove stale records
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
      // Unref timer so it doesn't prevent graceful Node.js shutdown
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref();
      }
    }
  }

  private cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxAge);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check if a request is allowed for a given key.
   *
   * @param key Identifier (usually client IP or IP + endpoint)
   * @param limit Maximum number of allowed requests in the window
   * @param windowMs Window duration in milliseconds (default 60 seconds)
   */
  public check(
    key: string,
    limit: number,
    windowMs = 60_000
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetMs: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter timestamps to current window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0];
      const resetMs = Math.max(0, oldestInWindow + windowMs - now);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetMs,
      };
    }

    // Record this request
    record.timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - record.timestamps.length),
      resetMs: windowMs,
    };
  }
}

// Global singleton instance
export const rateLimiter = new SlidingWindowRateLimiter();

/**
 * Extracts client IP from standard Next.js request headers.
 */
export function getClientIp(request: Request): string {
  // Trust X-Real-IP set by trusted reverse proxy (Caddy / Nginx / Cloudflare)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first valid IP from forward chain
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }
  return '127.0.0.1';
}

/**
 * Helper to enforce rate limiting on API handlers.
 * If exceeded, returns a standardized 429 Too Many Requests response with retry headers.
 */
export function enforceRateLimit(
  request: Request,
  endpoint: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIp(request);
  const key = `${endpoint}:${ip}`;
  const result = rateLimiter.check(key, limit, windowMs);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.resetMs / 1000);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil((Date.now() + result.resetMs) / 1000)),
          },
        }
      ),
    };
  }

  return { allowed: true };
}
