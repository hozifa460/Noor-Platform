import { NextResponse } from 'next/server';

export async function GET() {
  const mem = process.memoryUsage ? process.memoryUsage() : null;

  return NextResponse.json(
    {
      status: 'healthy',
      platform: 'Noor Platform (منصة نور)',
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
      environment: process.env.NODE_ENV || 'production',
      observability: {
        edge: Boolean(process.env.VERCEL || process.env.CF_PAGES),
        trustedProxyEnabled: Boolean(process.env.TRUSTED_PROXY === 'true' || process.env.VERCEL === '1'),
        memory: mem
          ? {
              heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
              rssMB: Number((mem.rss / 1024 / 1024).toFixed(2)),
            }
          : null,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}