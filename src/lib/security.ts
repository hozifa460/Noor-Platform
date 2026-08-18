import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const dnsLookup = promisify(dns.lookup);

/**
 * Permitted host regex patterns for media streaming and repository proxies.
 */
export const ALLOWED_MEDIA_HOSTS: RegExp[] = [
  /^archive\.org$/i,
  /^([a-z0-9-]+\.)+archive\.org$/i,
  /^raw\.githubusercontent\.com$/i,
  /^github\.com$/i,
  /^([a-z0-9-]+\.)+github\.com$/i,
  /^gitlab\.com$/i,
  /^([a-z0-9-]+\.)+gitlab\.com$/i,
  /^youtube\.com$/i,
  /^([a-z0-9-]+\.)+youtube\.com$/i,
  /^youtu\.be$/i,
  /^googlevideo\.com$/i,
  /^([a-z0-9-]+\.)+googlevideo\.com$/i,
  /^ytimg\.com$/i,
  /^([a-z0-9-]+\.)+ytimg\.com$/i,
  /^islamway\.net$/i,
  /^([a-z0-9-]+\.)+islamway\.net$/i,
  /^binbaz\.org\.sa$/i,
  /^([a-z0-9-]+\.)+binbaz\.org\.sa$/i,
  /^islamqa\.info$/i,
  /^([a-z0-9-]+\.)+islamqa\.info$/i,
  /^islamweb\.net$/i,
  /^([a-z0-9-]+\.)+islamweb\.net$/i,
  /^huggingface\.co$/i,
  /^([a-z0-9-]+\.)+huggingface\.co$/i,
  /^hf\.co$/i,
  /^([a-z0-9-]+\.)+hf\.co$/i,
  /^islamhouse\.com$/i,
  /^([a-z0-9-]+\.)+islamhouse\.com$/i,
  /^mp3quran\.net$/i,
  /^([a-z0-9-]+\.)+mp3quran\.net$/i,
  /^everyayah\.com$/i,
  /^([a-z0-9-]+\.)+everyayah\.com$/i,
  /^quranenc\.com$/i,
  /^([a-z0-9-]+\.)+quranenc\.com$/i,
  /^quran\.com$/i,
  /^([a-z0-9-]+\.)+quran\.com$/i,
  /^qurancdn\.com$/i,
  /^([a-z0-9-]+\.)+qurancdn\.com$/i,
];

/**
 * Checks if an IPv4 address belongs to a private, loopback, or reserved subnet.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b, c, d] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata AWS/GCP/Azure)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;
  // Broadcast
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to a private, loopback, or reserved subnet.
 */
function isPrivateIPv6(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  // ::1 (Loopback)
  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
  // :: (Unspecified)
  if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;
  // fe80::/10 (Link-local)
  if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) {
    return true;
  }
  // fc00::/7 (Unique local address / private)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:192.168.1.1 or ::ffff:c0a8:0101)
  if (cleanIp.includes('::ffff:')) {
    const v4Part = cleanIp.split('::ffff:')[1];
    if (v4Part && net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
  }

  return false;
}

/**
 * Validates whether an IP address is a private / local address.
 */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // If not a valid IP, consider unsafe
}

/**
 * Checks if a hostname matches our permitted media/content domains.
 */
export function isAllowedHostname(hostname: string): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const clean = hostname.toLowerCase().trim();
  // Reject IP literals completely
  if (net.isIP(clean)) {
    return false;
  }
  return ALLOWED_MEDIA_HOSTS.some((pattern) => pattern.test(clean));
}

/**
 * Comprehensive SSRF safety check for a URL.
 * 1. Validates protocol (http / https only).
 * 2. Parses hostname and checks against whitelist or allowed patterns.
 * 3. Resolves DNS to ensure the underlying IP is NOT in a private/internal range.
 */
export async function validateSafeUrl(
  urlString: string,
  options: { enforceWhitelist?: boolean } = { enforceWhitelist: true }
): Promise<{ safe: boolean; error?: string; url?: URL; resolvedIp?: string }> {
  try {
    if (!urlString || typeof urlString !== 'string') {
      return { safe: false, error: 'Empty or invalid URL provided' };
    }

    // Reject dangerous schemes like javascript:, data:, file:, gopher:
    const trimmed = urlString.trim();
    if (/^(javascript|data|file|gopher|ftp|view-source|blob):/i.test(trimmed)) {
      return { safe: false, error: 'Forbidden URL protocol scheme' };
    }

    const parsed = new URL(trimmed);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: `Invalid protocol: ${parsed.protocol}. Only http: and https: are allowed.` };
    }

    // Must have a valid, non-empty hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { safe: false, error: 'URL is missing a valid hostname' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject direct IP addresses if whitelist is enforced
    if (net.isIP(hostname)) {
      if (options.enforceWhitelist) {
        return { safe: false, error: 'Direct IP literals are not allowed in whitelist mode' };
      }
      if (isPrivateIp(hostname)) {
        return { safe: false, error: 'Access to private or local IP addresses is prohibited (SSRF protection)' };
      }
      return { safe: true, url: parsed, resolvedIp: hostname };
    }

    // Check whitelist if enforced
    if (options.enforceWhitelist && !isAllowedHostname(hostname)) {
      return { safe: false, error: `Host "${hostname}" is not in the permitted media sources list` };
    }

    // Block common localhost aliases
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, error: 'Access to internal or local domains is prohibited' };
    }

    // Resolve DNS to verify the resolved destination IP
    try {
      const lookupResult = await dnsLookup(hostname);
      const ip = lookupResult.address;

      if (isPrivateIp(ip)) {
        return { safe: false, error: `Domain ${hostname} resolved to a private/restricted IP (${ip})` };
      }

      return { safe: true, url: parsed, resolvedIp: ip };
    } catch (dnsErr: any) {
      return { safe: false, error: `DNS resolution failed for ${hostname}: ${dnsErr.message || 'Host not found'}` };
    }
  } catch (err: any) {
    return { safe: false, error: `URL parsing error: ${err.message || 'Malformed URL'}` };
  }
}

/**
 * Sanitizes filenames to prevent header injection or directory traversal.
 */
export function sanitizeFilename(filename: string, fallback = 'media'): string {
  if (!filename || typeof filename !== 'string') return fallback;

  // Strip null bytes and control characters
  const clean = filename
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[\/\\:*?"<>|]/g, '_')
    .trim()
    .slice(0, 150);

  return clean || fallback;
}
