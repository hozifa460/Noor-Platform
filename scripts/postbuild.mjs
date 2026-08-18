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
        uses: github/codeql-action/init@9e8d4cf89d4a852a44f51e0653ba36ef55b766a5 # v3.26.0
        with:
          languages: \${{ matrix.language }}
          queries: security-extended,security-and-quality

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@9e8d4cf89d4a852a44f51e0653ba36ef55b766a5 # v3.26.0
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

  console.log('✓ Governance & Security workflows verified successfully.');
}

ensureGovernanceFiles();

