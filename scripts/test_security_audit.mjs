import { validateSafeUrl, isAllowedHostname, isPrivateIp, sanitizeFilename } from '../src/lib/security.ts';
import { rateLimiter } from '../src/lib/rate-limiter.ts';

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
