import { describe, it, expect } from 'vitest';
import {
  isPrivateIp,
  isAllowedHostname,
  validateSafeUrl,
  sanitizeFilename,
  ALLOWED_MEDIA_HOSTS,
} from '@/lib/shared/security';

describe('Security & SSRF Protection (shared/security.ts)', () => {
  describe('isPrivateIp', () => {
    it('blocks IPv4 loopback (127.0.0.0/8)', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.1.2.3')).toBe(true);
      expect(isPrivateIp('127.255.255.254')).toBe(true);
    });

    it('blocks IPv4 Class A private network (10.0.0.0/8)', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.1.10')).toBe(true);
    });

    it('blocks IPv4 Class B private network (172.16.0.0/12)', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.254')).toBe(true);
      // Outside 172.16.0.0/12
      expect(isPrivateIp('172.15.0.1')).toBe(false);
      expect(isPrivateIp('172.32.0.1')).toBe(false);
    });

    it('blocks IPv4 Class C private network (192.168.0.0/16)', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.1.100')).toBe(true);
    });

    it('blocks IPv4 link-local and cloud metadata addresses (169.254.0.0/16)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.1.1')).toBe(true);
    });

    it('blocks carrier-grade NAT (100.64.0.0/10)', () => {
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
      expect(isPrivateIp('100.128.0.1')).toBe(false);
    });

    it('blocks reserved test networks and 0.0.0.0', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('192.0.2.1')).toBe(true);
      expect(isPrivateIp('198.51.100.1')).toBe(true);
      expect(isPrivateIp('203.0.113.1')).toBe(true);
    });

    it('blocks multicast (224.0.0.0/4) and broadcast (255.255.255.255)', () => {
      expect(isPrivateIp('224.0.0.1')).toBe(true);
      expect(isPrivateIp('239.255.255.250')).toBe(true);
      expect(isPrivateIp('255.255.255.255')).toBe(true);
    });

    it('blocks IPv6 loopback, unspecified, and link-local', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd00::1234')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 pointing to private addresses', () => {
      expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    });

    it('blocks IPv4-mapped IPv6 in hex notation (::ffff:7f00:1, ::ffff:a9fe:a9fe, ::ffff:c0a8:0101)', () => {
      expect(isPrivateIp('::ffff:7f00:1')).toBe(true); // 127.0.0.1
      expect(isPrivateIp('::ffff:a9fe:a9fe')).toBe(true); // 169.254.169.254
      expect(isPrivateIp('::ffff:c0a8:0101')).toBe(true); // 192.168.1.1
    });

    it('blocks uncompressed IPv4-mapped and IPv4-compatible IPv6 addresses', () => {
      expect(isPrivateIp('0:0:0:0:0:ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::127.0.0.1')).toBe(true);
      expect(isPrivateIp('::10.0.0.1')).toBe(true);
    });

    it('blocks RFC 2544 / RFC 6890 benchmark test range (198.18.0.0/15)', () => {
      expect(isPrivateIp('198.18.0.1')).toBe(true);
      expect(isPrivateIp('198.19.255.254')).toBe(true);
      expect(isPrivateIp('198.20.0.1')).toBe(false);
    });

    it('allows valid public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('208.67.222.222')).toBe(false);
    });

    it('treats malformed IPs as unsafe (private)', () => {
      expect(isPrivateIp('999.999.999.999')).toBe(true);
      expect(isPrivateIp('not-an-ip')).toBe(true);
    });
  });

  describe('isAllowedHostname', () => {
    it('returns false for falsy or non-string inputs', () => {
      // @ts-expect-error testing invalid type
      expect(isAllowedHostname(null)).toBe(false);
      // @ts-expect-error testing invalid type
      expect(isAllowedHostname(undefined)).toBe(false);
      expect(isAllowedHostname('')).toBe(false);
    });

    it('rejects IP literals outright', () => {
      expect(isAllowedHostname('127.0.0.1')).toBe(false);
      expect(isAllowedHostname('8.8.8.8')).toBe(false);
      expect(isAllowedHostname('::1')).toBe(false);
      expect(isAllowedHostname('[::1]')).toBe(false);
      expect(isAllowedHostname('[fe80::1]')).toBe(false);
    });

    it('allows verified Islamic media and API domains', () => {
      expect(isAllowedHostname('archive.org')).toBe(true);
      expect(isAllowedHostname('ia800100.us.archive.org')).toBe(true);
      expect(isAllowedHostname('raw.githubusercontent.com')).toBe(true);
      expect(isAllowedHostname('github.com')).toBe(true);
      expect(isAllowedHostname('mp3quran.net')).toBe(true);
      expect(isAllowedHostname('server6.mp3quran.net')).toBe(true);
      expect(isAllowedHostname('qurancdn.com')).toBe(true);
      expect(isAllowedHostname('api.qurancdn.com')).toBe(true);
      expect(isAllowedHostname('quran.com')).toBe(true);
      expect(isAllowedHostname('huggingface.co')).toBe(true);
      expect(isAllowedHostname('islamway.net')).toBe(true);
      expect(isAllowedHostname('binbaz.org.sa')).toBe(true);
    });

    it('rejects unapproved or untrusted domains', () => {
      expect(isAllowedHostname('malicious-site.com')).toBe(false);
      expect(isAllowedHostname('archive.org.evil.com')).toBe(false);
      expect(isAllowedHostname('fake-mp3quran.net.phishing.org')).toBe(false);
    });

    it('has valid regex patterns compiled', () => {
      expect(ALLOWED_MEDIA_HOSTS.length).toBeGreaterThan(15);
      expect(ALLOWED_MEDIA_HOSTS.every((re) => re instanceof RegExp)).toBe(true);
    });
  });

  describe('validateSafeUrl', () => {
    it('rejects null, empty, or non-string URLs', async () => {
      // @ts-expect-error testing invalid input
      const r1 = await validateSafeUrl(null);
      expect(r1.safe).toBe(false);
      const r2 = await validateSafeUrl('');
      expect(r2.safe).toBe(false);
    });

    it('rejects dangerous URL schemes (javascript, file, data, gopher)', async () => {
      expect((await validateSafeUrl('javascript:alert(1)')).safe).toBe(false);
      expect((await validateSafeUrl('file:///etc/passwd')).safe).toBe(false);
      expect((await validateSafeUrl('data:text/html,<script>alert(1)</script>')).safe).toBe(false);
      expect((await validateSafeUrl('gopher://internal.lan')).safe).toBe(false);
      expect((await validateSafeUrl('ftp://ftp.example.com')).safe).toBe(false);
    });

    it('rejects direct private IPs and loopbacks', async () => {
      expect((await validateSafeUrl('http://127.0.0.1:3000/secret')).safe).toBe(false);
      expect((await validateSafeUrl('http://169.254.169.254/latest/meta-data/')).safe).toBe(false);
      expect((await validateSafeUrl('http://10.0.0.1/admin')).safe).toBe(false);
    });

    it('rejects localhost aliases and internal suffixes', async () => {
      expect((await validateSafeUrl('http://localhost:8080')).safe).toBe(false);
      expect((await validateSafeUrl('http://service.localhost/api')).safe).toBe(false);
      expect((await validateSafeUrl('http://database.internal')).safe).toBe(false);
      expect((await validateSafeUrl('http://router.local')).safe).toBe(false);
    });

    it('rejects domains not in whitelist when enforceWhitelist is true', async () => {
      const result = await validateSafeUrl('https://untrusted-domain.com/audio.mp3', {
        enforceWhitelist: true,
      });
      expect(result.safe).toBe(false);
      expect(result.error).toContain('not in the permitted media sources list');
    });

    it('allows verified media URLs on permitted hosts', async () => {
      const result = await validateSafeUrl('https://archive.org/download/item/recitation.mp3', {
        enforceWhitelist: true,
      });
      // archive.org should resolve via public DNS or be approved
      if (result.safe) {
        expect(result.url?.hostname).toBe('archive.org');
      } else {
        // In offline environments DNS lookup may fail gracefully with resolution error
        expect(result.error).toMatch(/DNS resolution failed/);
      }
    });

    it('rejects direct IPv6 bracketed IP literals in whitelist mode', async () => {
      const res = await validateSafeUrl('http://[::1]:8080');
      expect(res.safe).toBe(false);
      expect(res.error).toBe('Direct IP literals are not allowed in whitelist mode');
    });

    it('validates public and private IP literals when whitelist enforcement is disabled', async () => {
      const pubResult = await validateSafeUrl('http://8.8.8.8/file.mp3', { enforceWhitelist: false });
      expect(pubResult.safe).toBe(true);
      expect(pubResult.resolvedIp).toBe('8.8.8.8');

      const privResult = await validateSafeUrl('http://127.0.0.1:8080/admin', { enforceWhitelist: false });
      expect(privResult.safe).toBe(false);
      expect(privResult.error).toContain('Access to private or local IP addresses is prohibited');

      const hexIpv6Result = await validateSafeUrl('http://[::ffff:a9fe:a9fe]/metadata', { enforceWhitelist: false });
      expect(hexIpv6Result.safe).toBe(false);
      expect(hexIpv6Result.error).toContain('Access to private or local IP addresses is prohibited');
    });

    it('handles malformed URLs gracefully without uncaught exceptions', async () => {
      const res = await validateSafeUrl('http://[');
      expect(res.safe).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('sanitizeFilename', () => {
    it('returns default fallback for empty or non-string input', () => {
      expect(sanitizeFilename('')).toBe('media');
      // @ts-expect-error testing invalid type
      expect(sanitizeFilename(null)).toBe('media');
      expect(sanitizeFilename('', 'custom_fallback')).toBe('custom_fallback');
    });

    it('preserves clean, standard filenames', () => {
      expect(sanitizeFilename('recitation_surah_001.mp3')).toBe('recitation_surah_001.mp3');
      expect(sanitizeFilename('sahih_bukhari_vol1.pdf')).toBe('sahih_bukhari_vol1.pdf');
    });

    it('strips path traversal sequences (../ and ..\\)', () => {
      const traversal = '../../../etc/passwd';
      const clean = sanitizeFilename(traversal);
      expect(clean.includes('/')).toBe(false);
      expect(clean.includes('\\')).toBe(false);
      expect(clean).toBe('.._.._.._etc_passwd');
    });

    it('strips CRLF control characters to prevent header injection', () => {
      const injected = 'surah\r\nContent-Disposition: attachment\r\n.mp3';
      const clean = sanitizeFilename(injected);
      expect(clean.includes('\r')).toBe(false);
      expect(clean.includes('\n')).toBe(false);
      expect(clean).toBe('surahContent-Disposition: attachment.mp3'.replace(/[:]/g, '_'));
    });

    it('replaces dangerous file system characters (* ? " < > | : \\ /)', () => {
      const bad = 'file*name?"test"<bar>|xyz:abc/def\\ghi.mp3';
      const clean = sanitizeFilename(bad);
      expect(clean).not.toMatch(/[\/\\:*?"<>|]/);
    });

    it('truncates excessively long filenames to 150 characters', () => {
      const superLong = 'a'.repeat(300) + '.mp3';
      const clean = sanitizeFilename(superLong);
      expect(clean.length).toBeLessThanOrEqual(150);
    });
  });
});
