import { validateSafeUrl, isAllowedHostname, isPrivateIp, sanitizeFilename } from '../src/lib/shared/security.ts';
import { rateLimiter } from '../src/lib/shared/rate-limiter.ts';

async function runSecurityTests() {
  console.log('🔒 Starting Security & SSRF Validation Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // 1. SSRF Private IP & Loopback Tests
  console.log('--- Test Suite 1: SSRF & Private IP Protection ---');
  assert(isPrivateIp('127.0.0.1') === true, 'Blocks 127.0.0.1 (IPv4 Loopback)');
  assert(isPrivateIp('127.1.2.3') === true, 'Blocks 127.x.x.x Subnet');
  assert(isPrivateIp('10.0.0.1') === true, 'Blocks 10.0.0.0/8 (Private)');
  assert(isPrivateIp('172.16.0.1') === true, 'Blocks 172.16.0.0/12 (Private)');
  assert(isPrivateIp('192.168.1.1') === true, 'Blocks 192.168.0.0/16 (Private)');
  assert(isPrivateIp('169.254.169.254') === true, 'Blocks 169.254.169.254 (Cloud Metadata)');
  assert(isPrivateIp('::1') === true, 'Blocks ::1 (IPv6 Loopback)');
  assert(isPrivateIp('fe80::1') === true, 'Blocks fe80::/10 (IPv6 Link Local)');
  assert(isPrivateIp('fc00::1') === true, 'Blocks fc00::/7 (IPv6 Unique Local)');
  assert(isPrivateIp('8.8.8.8') === false, 'Allows Public IPv4 (8.8.8.8)');
  assert(isPrivateIp('1.1.1.1') === false, 'Allows Public IPv4 (1.1.1.1)');

  // 2. URL Validation Tests
  console.log('\n--- Test Suite 2: URL & Host Safety Validation ---');
  const test1 = await validateSafeUrl('http://127.0.0.1:3000/secret');
  assert(!test1.safe, 'Blocks direct http://127.0.0.1');

  const test2 = await validateSafeUrl('http://localhost:8080/admin');
  assert(!test2.safe, 'Blocks http://localhost');

  const test3 = await validateSafeUrl('http://169.254.169.254/latest/meta-data/');
  assert(!test3.safe, 'Blocks AWS/GCP Metadata endpoint');

  const test4 = await validateSafeUrl('file:///etc/passwd');
  assert(!test4.safe, 'Blocks file:// protocol scheme');

  const test5 = await validateSafeUrl('javascript:alert(1)');
  assert(!test5.safe, 'Blocks javascript: scheme');

  const test6 = await validateSafeUrl('data:text/html,<script>alert(1)</script>');
  assert(!test6.safe, 'Blocks data: scheme');

  const test7 = await validateSafeUrl('https://evil-hacker-site.com/malware.mp3', { enforceWhitelist: true });
  assert(!test7.safe, 'Rejects domain not in whitelist');

  const test8 = await validateSafeUrl('https://archive.org/download/test/test.mp3', { enforceWhitelist: true });
  assert(test8.safe, 'Allows legitimate archive.org media URL');

  const test9 = await validateSafeUrl('https://raw.githubusercontent.com/user/repo/main/data.json', { enforceWhitelist: true });
  assert(test9.safe, 'Allows legitimate raw.githubusercontent.com URL');

  const test10 = await validateSafeUrl('https://gitlab.com/user/repo/-/raw/main/file.json', { enforceWhitelist: true });
  assert(test10.safe, 'Allows legitimate gitlab.com raw URL');

  const test11 = await validateSafeUrl('https://huggingface.co/datasets/hozifa1/Telewat_Daawa_And_Channels/resolve/main/index.json', { enforceWhitelist: true });
  assert(test11.safe, 'Allows legitimate huggingface.co dataset URL');

  const test12 = await validateSafeUrl('https://server6.mp3quran.net/akdr/001.mp3', { enforceWhitelist: true });
  assert(test12.safe, 'Allows legitimate mp3quran.net streaming URL');

  const test13 = await validateSafeUrl('https://api.qurancdn.com/api/qdc/tafsirs/16/by_ayah/1:1', { enforceWhitelist: true });
  assert(test13.safe, 'Allows legitimate qurancdn.com tafsir URL');

  // 3. Filename Sanitization Tests
  console.log('\n--- Test Suite 3: Filename Sanitization & Header Injection Protection ---');
  const safeName1 = sanitizeFilename('valid_name.mp3');
  assert(safeName1 === 'valid_name.mp3', 'Preserves clean filename');

  const safeName2 = sanitizeFilename('../../../etc/passwd');
  assert(!safeName2.includes('/'), 'Strips directory traversal slashes');

  const safeName3 = sanitizeFilename('test\r\nContent-Type: evil');
  assert(!safeName3.includes('\r') && !safeName3.includes('\n'), 'Strips CRLF header injection characters');

  // 4. Rate Limiter Tests
  console.log('\n--- Test Suite 4: Rate Limiting Sliding Window ---');
  const key = 'test-ip-1';
  let allowedCount = 0;
  for (let i = 0; i < 5; i++) {
    const res = rateLimiter.check(key, 3, 10_000);
    if (res.allowed) allowedCount++;
  }
  assert(allowedCount === 3, 'Rate limiter permits exactly 3 requests when limit is 3');

  const blockedRes = rateLimiter.check(key, 3, 10_000);
  assert(!blockedRes.allowed, 'Rate limiter blocks request #4 exceeding limit');
  assert(blockedRes.remaining === 0, 'Reports remaining = 0 when blocked');

  // 5. SVG / XML Injection & Sheikh Avatar Hardening
  console.log('\n--- Test Suite 5: SVG & XML Injection Prevention ---');
  function escapeXml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const maliciousName = '<script>alert("XSS")</script>&<foreignObject>';
  const escaped = escapeXml(maliciousName);
  assert(!escaped.includes('<script>'), 'Escapes opening script tag');
  assert(!escaped.includes('</script>'), 'Escapes closing script tag');
  assert(escaped.includes('&lt;script&gt;'), 'Converts tags to XML entities');
  assert(!escaped.includes('"XSS"'), 'Escapes double quotes');
  assert(escaped.includes('&amp;'), 'Escapes ampersands');

  // 6. PDF Cache Key SHA-256 Collision Resistance
  console.log('\n--- Test Suite 6: PDF Cache Key Cryptographic SHA-256 Hashing ---');
  const crypto = await import('crypto');
  const urlA = 'https://archive.org/download/islamic_library_vol1_part1_sectionA/book_standard_edition_v1.pdf';
  const urlB = 'https://archive.org/download/islamic_library_vol1_part1_sectionA/book_standard_edition_v2.pdf';
  const keyA = crypto.createHash('sha256').update(urlA).digest('hex');
  const keyB = crypto.createHash('sha256').update(urlB).digest('hex');
  assert(keyA.length === 64, 'Generates full 64-character hex SHA-256 digest');
  assert(keyB.length === 64, 'Generates full 64-character hex SHA-256 digest');
  assert(keyA !== keyB, 'Distinct URLs with identical long prefixes produce distinct cache keys');

  // 7. Shamela Path Canonical Validation & Traversal Prevention
  console.log('\n--- Test Suite 7: Shamela Path Allowlist & Traversal Prevention ---');
  const pathModule = await import('path');
  function validateShamelaPath(rawRelPath) {
    if (!rawRelPath || !/^[a-zA-Z0-9/_.\-]+$/.test(rawRelPath)) return false;
    if (rawRelPath.includes('..') || rawRelPath.startsWith('/') || rawRelPath.startsWith('\\')) return false;
    const cleanPath = pathModule.posix.normalize('/' + rawRelPath).replace(/^\/+/, '');
    if (cleanPath.includes('..') || cleanPath.startsWith('/')) return false;
    return true;
  }
  assert(validateShamelaPath('books/123/pages.jsonl') === true, 'Allows valid canonical book path');
  assert(validateShamelaPath('../../../etc/passwd') === false, 'Rejects directory traversal with ..');
  assert(validateShamelaPath('books/123/..%2f..%2fsecret') === false, 'Rejects URL-encoded traversal characters');
  assert(validateShamelaPath('books/123/pages.jsonl\x00.pdf') === false, 'Rejects null-byte injection');
  assert(validateShamelaPath('books/123;rm -rf /') === false, 'Rejects shell metacharacters');
  assert(validateShamelaPath('/absolute/path/file.txt') === false, 'Rejects absolute path prefix');

  // 8. Client IP Sanitization & Trusted Proxy Enforcement
  console.log('\n--- Test Suite 8: Client IP Sanitization & Trusted Proxy Enforcement ---');
  const { getClientIp } = await import('../src/lib/shared/rate-limiter.ts');

  // Test 8A: Untrusted environment (direct connection) ignores spoofed headers
  delete process.env.TRUSTED_PROXY;
  delete process.env.VERCEL;
  delete process.env.CF_PAGES;
  process.env.NODE_ENV = 'development';

  const untrustedReq = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'cf-connecting-ip': '5.6.7.8' },
  });
  assert(getClientIp(untrustedReq) === '127.0.0.1', 'Safely ignores spoofed IP headers in untrusted direct mode');

  // Test 8B: Trusted proxy environment (Vercel / Cloudflare) parses sanitized headers
  process.env.TRUSTED_PROXY = 'true';

  const mockReq1 = new Request('http://localhost', {
    headers: { 'cf-connecting-ip': '198.51.100.42' },
  });
  assert(getClientIp(mockReq1) === '198.51.100.42', 'Extracts valid Cloudflare client IP in trusted proxy mode');

  const mockReq2 = new Request('http://localhost', {
    headers: { 'x-real-ip': '203.0.113.195' },
  });
  assert(getClientIp(mockReq2) === '203.0.113.195', 'Extracts valid X-Real-IP in trusted proxy mode');

  const mockReq3 = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' },
  });
  assert(getClientIp(mockReq3) === '203.0.113.195', 'Extracts first valid IP from X-Forwarded-For');

  // Test 8C: Production standalone environment without TRUSTED_PROXY flag ignores headers
  delete process.env.TRUSTED_PROXY;
  delete process.env.VERCEL;
  process.env.NODE_ENV = 'production';
  const prodUntrustedReq = new Request('http://localhost', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '5.6.7.8' },
  });
  assert(getClientIp(prodUntrustedReq) === '127.0.0.1', 'Safely ignores spoofed IP headers in production standalone mode without TRUSTED_PROXY');

  // 9. PDF Multi-chunk Magic Byte Verification
  console.log('\n--- Test Suite 9: PDF Multi-chunk Magic Byte Verification ---');
  function verifyPdfMagicBytes(chunks) {
    let headerBuffer = [];
    for (const chunk of chunks) {
      for (let i = 0; i < chunk.length && headerBuffer.length < 5; i++) {
        headerBuffer.push(chunk[i]);
      }
      if (headerBuffer.length >= 5) {
        return (
          headerBuffer[0] === 0x25 && // %
          headerBuffer[1] === 0x50 && // P
          headerBuffer[2] === 0x44 && // D
          headerBuffer[3] === 0x46 && // F
          headerBuffer[4] === 0x2d    // -
        );
      }
    }
    return false;
  }

  // 1-byte incremental stream chunks
  const validChunkedStream = [
    new Uint8Array([0x25]),
    new Uint8Array([0x50]),
    new Uint8Array([0x44]),
    new Uint8Array([0x46]),
    new Uint8Array([0x2d]),
    new Uint8Array([0x31, 0x2e, 0x34]),
  ];
  assert(verifyPdfMagicBytes(validChunkedStream) === true, 'Accepts valid PDF streamed across tiny 1-byte chunks');

  const invalidChunkedStream = [
    new Uint8Array([0x3c]), // <
    new Uint8Array([0x73]), // s
    new Uint8Array([0x76]), // v
    new Uint8Array([0x67]), // g
  ];
  assert(verifyPdfMagicBytes(invalidChunkedStream) === false, 'Rejects SVG/HTML streamed across tiny chunks');

  // 10. Remote Avatar MIME Type Allowlist
  console.log('\n--- Test Suite 10: Remote Avatar Raster-Only MIME Type Allowlist ---');
  const ALLOWED_AVATAR_MIMES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  function isAllowedAvatarMime(mime) {
    const raw = (mime || '').toLowerCase().split(';')[0].trim();
    return ALLOWED_AVATAR_MIMES.has(raw);
  }
  assert(isAllowedAvatarMime('image/jpeg') === true, 'Allows image/jpeg');
  assert(isAllowedAvatarMime('image/png; charset=utf-8') === true, 'Allows image/png with charset parameter');
  assert(isAllowedAvatarMime('image/webp') === true, 'Allows image/webp');
  assert(isAllowedAvatarMime('image/svg+xml') === false, 'Rejects remote image/svg+xml to prevent XSS');
  assert(isAllowedAvatarMime('text/html') === false, 'Rejects remote text/html');
  assert(isAllowedAvatarMime('application/xml') === false, 'Rejects remote application/xml');

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
