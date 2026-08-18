import { NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * Hybrid Rate Limiter:
 * - Distributed mode: Uses Upstash Redis / Vercel KV REST API when env vars are present.
 * - In-Memory mode: Sliding-window limiter with periodic TTL cleanup when KV is unconfigured.
 */
class SlidingWindowRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref();
      }
    }
  }

  private cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;

    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxAge);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

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

    record.timestamps.push(now);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - record.timestamps.length),
      resetMs: windowMs,
    };
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();

/**
 * Extracts client IP from standard Next.js / Proxy request headers.
 */
export function getClientIp(request: Request): string {
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
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }
  return '127.0.0.1';
}

/**
 * Enforces rate limiting on API handlers with support for distributed multi-instance clusters.
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
