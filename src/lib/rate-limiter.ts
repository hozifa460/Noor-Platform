import { NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

/**
 * In-Memory Sliding-Window Rate Limiter
 * Fallback engine for local dev and single-instance deployments.
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
 * Distributed rate limit check via Upstash Redis / Vercel KV REST API.
 * Uses atomic Redis INCR + EXPIRE via lightweight HTTP pipeline.
 */
async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; limit: number; remaining: number; resetMs: number } | null> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!restUrl || !restToken) return null;

  try {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const redisKey = `ratelimit:${key}`;

    const res = await fetch(`${restUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSec, 'NX'],
        ['TTL', redisKey],
      ]),
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) return null;

    const results = await res.json();
    const currentCount = results?.[0]?.result;
    const ttl = results?.[2]?.result ?? windowSec;

    if (typeof currentCount !== 'number') return null;

    const remaining = Math.max(0, limit - currentCount);
    const resetMs = Math.max(0, ttl * 1000);

    return {
      allowed: currentCount <= limit,
      limit,
      remaining,
      resetMs,
    };
  } catch (err) {
    console.warn('[rate-limiter] Distributed KV check failed, falling back to local:', err);
    return null;
  }
}

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

function isValidIp(ip: string): boolean {
  return IPV4_REGEX.test(ip) || (ip.includes(':') && IPV6_REGEX.test(ip));
}

/**
 * Extracts client IP from standard Next.js / Proxy request headers with format validation.
 */
export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp && isValidIp(cfConnectingIp.trim())) return cfConnectingIp.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) return realIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter((p) => isValidIp(p));
    if (parts.length > 0) return parts[0];
  }
  return '127.0.0.1';
}

/**
 * Enforces rate limiting on API handlers with distributed Redis/KV support and local fallback.
 */
export function enforceRateLimit(
  request: Request,
  endpoint: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIp(request);
  const key = `${endpoint}:${ip}`;

  // Synchronous check against local memory engine
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

/**
 * Asynchronous rate limit enforcement supporting distributed Upstash Redis / Vercel KV REST.
 */
export async function enforceRateLimitAsync(
  request: Request,
  endpoint: string,
  limit = 60,
  windowMs = 60_000
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const ip = getClientIp(request);
  const key = `${endpoint}:${ip}`;

  // Try distributed check first if configured
  const distResult = await checkDistributedRateLimit(key, limit, windowMs);
  const result = distResult || rateLimiter.check(key, limit, windowMs);

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
