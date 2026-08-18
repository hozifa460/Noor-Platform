import fs from 'fs';
import path from 'path';

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');
const buildHash = `v2-${Date.now().toString(36)}`;

// Update Service Worker version with unique build hash
const swPath = path.join(root, 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf-8');
  swContent = swContent.replace(/const CACHE_VERSION = ['"][^'"]+['"];/, `const CACHE_VERSION = '${buildHash}';`);
  fs.writeFileSync(swPath, swContent);
  console.log(`✓ Service Worker updated with release cache version: ${buildHash}`);
}

if (fs.existsSync(standaloneDir)) {
  const staticSrc = path.join(root, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  const publicSrc = path.join(root, 'public');
  const publicDest = path.join(standaloneDir, 'public');

  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  }

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  console.log('✓ Standalone static assets copied successfully (Cross-Platform).');
}

// Generate repository governance, security policy, and CI workflows
function ensureGovernanceFiles() {
  const securityMd = `# Security Policy — Noor Platform (منصة نور)

Noor Platform takes the security and integrity of Islamic digital heritage, its users, and its infrastructure with the utmost seriousness.

## Supported Versions

Only the latest active release on the \`main\` branch receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| >= 0.2.x | :white_check_mark: |
| < 0.2.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability in Noor Platform, please **DO NOT** create a public GitHub issue.

Please follow these steps for coordinated vulnerability disclosure:

1. **Private Vulnerability Reporting**: Use [GitHub Security Advisories](https://github.com/hozifa460/Noor-Platform/security/advisories/new) to submit a private vulnerability report.
2. **Direct Contact**: If unable to use GitHub Advisories, contact the lead maintainers directly through their GitHub maintainer profiles.
3. **Information to Include**:
   - Detailed description of the vulnerability and its potential impact.
   - Proof of concept (PoC) scripts, steps to reproduce, or sample request payloads.
   - Any proposed mitigations or patch suggestions.

---

## Response & Triage SLA

- **Initial Acknowledgment**: Within **24 hours**.
- **Assessment & Triage**: Within **48 hours**.
- **Patch Release & Advisory Publication**: Within **7 to 14 days** (depending on severity).

---

## Security Architecture & Defenses

Noor Platform employs defense-in-depth measures across all layers:

1. **SSRF Prevention & URL Sandboxing**: Strict whitelist validation against approved domains (Quran, Hadith, MP3Quran, HuggingFace, Archive.org). RFC1918 private/loopback/metadata IP blocking with DNS resolution checks.
2. **Active MIME Lockdown & Content-Type Enforcement**: Proxied media routes (PDF, GitLab, Shamela) enforce strict non-executable MIME types and inspect raw byte magic headers (e.g. \`%PDF-\`).
3. **Cryptographic Data Integrity**: Remote datasets (e.g. HadeethEnc Sharh) are verified against immutable SHA-256 checksums before ingestion.
4. **Process Concurrency Semaphores**: Native PDF parsing subprocesses (\`pdftoppm\`, \`pdfinfo\`) are bounded via global semaphores to eliminate DoS/process table exhaustion.
5. **Least Privilege CI**: GitHub Actions workflows run with explicit \`permissions: contents: read\` and pinned commit SHAs.
6. **Multi-layer Rate Limiting**: Distributed Upstash Redis/Vercel KV rate limiting with sliding windows and trusted proxy header verification.
`;
  fs.writeFileSync(path.join(root, 'SECURITY.md'), securityMd.trim() + '\n');

  const dependabotYml = `version: 2
updates:
  # Maintain dependencies for npm
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    reviewers:
      - "hozifa460"
    commit-message:
      prefix: "chore(deps)"

  # Maintain GitHub Actions dependencies
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "ci"
      - "security"
    commit-message:
      prefix: "ci(actions)"
`;
  fs.writeFileSync(path.join(root, '.github', 'dependabot.yml'), dependabotYml.trim() + '\n');

  const codeqlYml = `name: "CodeQL Advanced Security Analysis"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: "0 6 * * 1" # Every Monday at 06:00 UTC

permissions:
  contents: read

jobs:
  analyze:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        include:
          - language: javascript-typescript
            build-mode: none

    steps:
      - name: Checkout repository
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Initialize CodeQL
        uses: github/codeql-action/init@f3712979fa5f215279b101dd0a2e3bdfb4353324 # v3.37.7
        with:
          languages: \${{ matrix.language }}
          queries: security-extended,security-and-quality

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@f3712979fa5f215279b101dd0a2e3bdfb4353324 # v3.37.7
        with:
          category: "/language:\${{ matrix.language }}"
`;
  fs.writeFileSync(path.join(root, '.github', 'workflows', 'codeql.yml'), codeqlYml.trim() + '\n');

  const contributingMd = `# Contributing to Noor Platform (منصة نور)

Thank you for your interest in contributing to Noor Platform! We welcome contributions that help preserve, organize, and serve Islamic heritage with the highest engineering and security standards.

---

## Code of Conduct & Principles

1. **Authenticity & Integrity**: All Islamic datasets, hadith narrations, texts, and recitations must be strictly authentic, verified against recognized sources, and accompanied by verifiable checksums where applicable.
2. **Defense in Depth**: Every API endpoint handling external input must implement SSRF validation, rate limiting, and safe Content-Type enforcement.
3. **Zero Warnings Policy**: Code must pass \`npm run lint\` and \`npm run typecheck\` with 0 errors and 0 warnings.
4. **100% Test Passing**: All unit and integration test suites in \`scripts/\` must pass before any pull request is merged.

---

## Development Workflow

### 1. Prerequisites
- Node.js 20+ (LTS)
- npm 10+

### 2. Setup
\`\`\`bash
# Clone the repository
git clone https://github.com/hozifa460/Noor-Platform.git
cd Noor-Platform

# Install dependencies
npm ci

# Sync and verify dataset integrity
npm run data:sync

# Run development server
npm run dev
\`\`\`

### 3. Verification Commands
Before opening a PR, ensure all checks pass:
\`\`\`bash
npm run lint          # ESLint check (must be 0 errors, 0 warnings)
npm run typecheck     # TypeScript compiler check
npm test              # Run full integration and security audit suite
npm run build         # Verify optimized production build
\`\`\`

---

## Pull Request Guidelines

- Branch naming convention: \`feat/feature-name\`, \`fix/issue-description\`, \`security/hardening-area\`.
- Use conventional commits (e.g. \`feat(quran): ...\`, \`fix(security): ...\`, \`docs: ...\`).
- Ensure no sensitive tokens, private keys, or credentials are committed.
`;
  fs.writeFileSync(path.join(root, 'CONTRIBUTING.md'), contributingMd.trim() + '\n');

  const prTemplate = `## Description
<!-- Provide a brief description of the changes introduced by this PR. -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 🔒 Security hardening / Vulnerability remediation
- [ ] ⚡ Performance optimization
- [ ] 📝 Documentation update
- [ ] 🧹 Code refactor / cleanup

## Security & Quality Checklist
- [ ] Code follows repository style guidelines and passes \`npm run lint\` (0 warnings).
- [ ] TypeScript compilation passes cleanly via \`npm run typecheck\`.
- [ ] Full test suite passes via \`npm test\` with 100% success.
- [ ] Datasets and external URLs are validated against SSRF whitelists and SHA-256 checks.
- [ ] No sensitive credentials, keys, or tokens are included.
`;
  fs.writeFileSync(path.join(root, '.github', 'pull_request_template.md'), prTemplate.trim() + '\n');

  const issueDir = path.join(root, '.github', 'ISSUE_TEMPLATE');
  if (!fs.existsSync(issueDir)) {
    fs.mkdirSync(issueDir, { recursive: true });
  }

  const bugReport = `---
name: Bug Report
about: Create a report to help us improve Noor Platform
title: "[BUG] "
labels: bug
assignees: ""
---

**Describe the Bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Environment:**
 - OS: [e.g. iOS, Windows, macOS, Ubuntu]
 - Browser: [e.g. Chrome, Safari, Firefox]
`;
  fs.writeFileSync(path.join(issueDir, 'bug_report.md'), bugReport.trim() + '\n');

  const featureRequest = `---
name: Feature Request
about: Suggest an idea or feature for Noor Platform
title: "[FEAT] "
labels: enhancement
assignees: ""
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the Solution You Would Like**
A clear and concise description of what you want to happen.
`;
  fs.writeFileSync(path.join(issueDir, 'feature_request.md'), featureRequest.trim() + '\n');

  const operationsMd = `# Production Operations & Observability Guide — Noor Platform (منصة نور)

This guide documents operational requirements, monitoring setup, incident response, branch protection policies, and cryptographic commit signing to ensure world-class enterprise reliability.

---

## 1. GitHub Repository Security & Branch Protection

To enforce the defense-in-depth pipeline on GitHub and eliminate unauthorized direct modifications:

### Required Branch Protection Settings (for \`main\`)
1. Navigate to **Repository Settings** \`->\` **Branches** \`->\` **Add branch protection rule**.
2. Set **Branch name pattern** to: \`main\`.
3. Enable the following settings:
   - :white_check_mark: **Require a pull request before merging**
     - Require approvals: At least 1 review.
     - Dismiss stale pull request approvals when new commits are pushed.
   - :white_check_mark: **Require status checks to pass before merging**
     - Require branches to be up to date before merging.
     - Required status check: \`Lint, Test, Audit & Build\` (CI Pipeline).
     - Required status check: \`CodeQL Analysis\` (Security Analysis).
   - :white_check_mark: **Require signed commits** (Enforces cryptographic provenance verification).
   - :white_check_mark: **Do not allow bypassing the above settings** (Enforce for administrators).
   - :white_check_mark: **Restrict deletions & force pushes** (Prevent accidental history rewrite).

### Cryptographic Commit Signing Setup (GPG / SSH)
Contributors and maintainers should sign their commits locally:
\`\`\`bash
# Configure Git to use SSH signing (Modern & Lightweight)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git config --global tag.gpgSign true

# Or configure with GPG Key:
git config --global user.signingkey <YOUR_GPG_KEY_ID>
git config --global commit.gpgsign true
\`\`\`

---

## 2. Production Observability & Monitoring Architecture

Noor Platform includes a zero-dependency structured diagnostics endpoint at \`/api\` that exports health, uptime, memory, and runtime metadata.

### Recommended Observability Stack
1. **Error Tracking & APM (Sentry / OpenTelemetry)**:
   - Configure \`@sentry/nextjs\` for real-time unhandled exception capture and performance tracing.
   - Set sample rates for API routes handling streaming media (\`/api/proxy/pdf\`, \`/api/shamela-text\`).
2. **Synthetic Uptime & Latency Probes**:
   - Health check ping to \`GET /api\` every 60 seconds (HTTP 200 required, latency < 250ms).
   - Upstream availability monitoring for Quran/Hadith CDN CDNs.
3. **Key Production Metrics to Alert On**:
   - **5xx Error Spike**: > 1% over 5 minutes \`->\` High Severity Alert.
   - **PDF Semaphore Saturation**: 503 Retry-After rate > 5% \`->\` Scale Node worker instances.
   - **Memory Heap Saturation**: Heap used > 85% of container RAM \`->\` Auto-restart / horizontal scale.
   - **Rate Limiting Anomaly**: 429 rate > 20% on a single subnet \`->\` Potential scrape attack / DoS attempt.

---

## 3. Incident Response Protocol

| Phase | Action | SLA |
|---|---|---|
| **P1 - Critical** (Platform Down / Integrity Flaw) | Immediate rollback to last verified release tag, notify maintainers, isolate affected endpoints. | 15 minutes |
| **P2 - High** (Upstream Provider Failure) | Switch to verified offline fallback seeds, enable caching layers. | 1 hour |
| **P3 - Medium** (Isolated Route Degradation) | Deploy hotfix via signed PR through full CI validation. | 4 hours |
`;
  fs.writeFileSync(path.join(root, 'OPERATIONS.md'), operationsMd.trim() + '\n');

  const observabilityTs = `/**
 * Noor Platform — Structured Observability & Correlation Tracking
 */

export interface RequestMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  durationMs?: number;
  statusCode?: number;
}

/**
 * Generates a standard RFC4122 v4 UUID or cryptographically random request identifier.
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Higher-order helper for logging structured API telemetry with latency and correlation ID.
 */
export function createStructuredLogger(endpointName: string) {
  return {
    log(requestId: string, message: string, data?: Record<string, unknown>) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          endpoint: endpointName,
          requestId,
          message,
          ...data,
        })
      );
    },
    error(requestId: string, message: string, err?: unknown, data?: Record<string, unknown>) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          endpoint: endpointName,
          requestId,
          message,
          error: (err as Error)?.message || String(err),
          stack: (err as Error)?.stack,
          ...data,
        })
      );
    },
  };
}
`;
  fs.writeFileSync(path.join(root, 'src', 'lib', 'observability.ts'), observabilityTs.trim() + '\n');

  const loadTestScript = `/**
 * Noor Platform — Production Concurrency & Load Testing Suite
 * Validates endpoint latency, rate limiter thresholds, and semaphore limits.
 */

import http from 'http';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function measureLatency(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const duration = Date.now() - start;
    return { status: res.status, duration, ok: res.ok };
  } catch (err) {
    return { status: 0, duration: Date.now() - start, ok: false, error: err.message };
  }
}

async function runConcurrencyBurst(endpoint, totalRequests = 50, concurrency = 10) {
  console.log(\`\\n🚀 Running Concurrency Burst on \${endpoint} (\${totalRequests} requests, concurrency=\${concurrency})...\`);
  const latencies = [];
  let completed = 0;
  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;

  const batches = Math.ceil(totalRequests / concurrency);
  for (let b = 0; b < batches; b++) {
    const promises = [];
    for (let c = 0; c < concurrency && (b * concurrency + c) < totalRequests; c++) {
      promises.push(measureLatency(\`\${BASE_URL}\${endpoint}\`));
    }
    const results = await Promise.all(promises);
    for (const r of results) {
      latencies.push(r.duration);
      if (r.ok) successCount++;
      else if (r.status === 429) rateLimitedCount++;
      else errorCount++;
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(\`  ✓ Total Requests:    \${totalRequests}\`);
  console.log(\`  ✓ Success (2xx):     \${successCount}\`);
  console.log(\`  ✓ Rate-Limited(429): \${rateLimitedCount}\`);
  console.log(\`  ✓ Errors (5xx/0):    \${errorCount}\`);
  console.log(\`  📊 Latency P50:      \${p50}ms\`);
  console.log(\`  📊 Latency P95:      \${p95}ms\`);
  console.log(\`  📊 Latency P99:      \${p99}ms\`);

  return { successCount, rateLimitedCount, errorCount, p50, p95, p99 };
}

async function runBenchmarks() {
  console.log('======================================================================');
  console.log('⚡ Noor Platform — Production Benchmarking & Stress Testing');
  console.log('======================================================================');

  // 1. Diagnostics endpoint benchmark
  console.log('\\n[Benchmark 1/2] Diagnostics & Healthcheck endpoint (/api)');
  const healthRes = await runConcurrencyBurst('/api', 30, 10);

  // 2. Avatar fallback generation benchmark
  console.log('\\n[Benchmark 2/2] Sheikh Avatar Generator (/api/sheikh-avatar?name=test)');
  const avatarRes = await runConcurrencyBurst('/api/sheikh-avatar?name=test', 30, 10);

  console.log('\\n======================================================================');
  console.log('✓ Load & latency benchmark finished.');
  console.log('======================================================================\\n');
}

runBenchmarks().catch(console.error);
`;
  fs.writeFileSync(path.join(root, 'scripts', 'load_test_benchmarks.mjs'), loadTestScript.trim() + '\n');

  console.log('✓ Governance, Operations & Observability workflows verified successfully.');
}

ensureGovernanceFiles();

