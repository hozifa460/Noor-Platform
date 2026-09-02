import { headers } from 'next/headers';

/**
 * Get the CSP nonce for the current request (set by middleware.ts).
 * Use this in inline scripts to avoid 'unsafe-inline'.
 *
 * Usage in a server component:
 * ```tsx
 * const nonce = await getNonce();
 * return <script nonce={nonce}>console.log('hi')</script>;
 * ```
 */
export async function getNonce(): Promise<string> {
  const h = await headers();
  return h.get('x-nonce') || '';
}
