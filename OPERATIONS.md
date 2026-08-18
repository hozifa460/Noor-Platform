# Production Operations & Observability Guide — Noor Platform (منصة نور)

This guide documents operational requirements, monitoring setup, incident response, branch protection policies, and cryptographic commit signing to ensure world-class enterprise reliability.

---

## 1. GitHub Repository Security & Branch Protection

To enforce the defense-in-depth pipeline on GitHub and eliminate unauthorized direct modifications:

### Required Branch Protection Settings (for `main`)
1. Navigate to **Repository Settings** `->` **Branches** `->` **Add branch protection rule**.
2. Set **Branch name pattern** to: `main`.
3. Enable the following settings:
   - :white_check_mark: **Require a pull request before merging**
     - Require approvals: At least 1 review.
     - Dismiss stale pull request approvals when new commits are pushed.
   - :white_check_mark: **Require status checks to pass before merging**
     - Require branches to be up to date before merging.
     - Required status check: `Lint, Test, Audit & Build` (CI Pipeline).
     - Required status check: `CodeQL Analysis` (Security Analysis).
   - :white_check_mark: **Require signed commits** (Enforces cryptographic provenance verification).
   - :white_check_mark: **Do not allow bypassing the above settings** (Enforce for administrators).
   - :white_check_mark: **Restrict deletions & force pushes** (Prevent accidental history rewrite).

### Cryptographic Commit Signing Setup (GPG / SSH)
Contributors and maintainers should sign their commits locally:
```bash
# Configure Git to use SSH signing (Modern & Lightweight)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git config --global tag.gpgSign true

# Or configure with GPG Key:
git config --global user.signingkey <YOUR_GPG_KEY_ID>
git config --global commit.gpgsign true
```

---

## 2. Production Observability & Monitoring Architecture

Noor Platform includes a zero-dependency structured diagnostics endpoint at `/api` that exports health, uptime, memory, and runtime metadata.

### Recommended Observability Stack
1. **Error Tracking & APM (Sentry / OpenTelemetry)**:
   - Configure `@sentry/nextjs` for real-time unhandled exception capture and performance tracing.
   - Set sample rates for API routes handling streaming media (`/api/proxy/pdf`, `/api/shamela-text`).
2. **Synthetic Uptime & Latency Probes**:
   - Health check ping to `GET /api` every 60 seconds (HTTP 200 required, latency < 250ms).
   - Upstream availability monitoring for Quran/Hadith CDN CDNs.
3. **Key Production Metrics to Alert On**:
   - **5xx Error Spike**: > 1% over 5 minutes `->` High Severity Alert.
   - **PDF Semaphore Saturation**: 503 Retry-After rate > 5% `->` Scale Node worker instances.
   - **Memory Heap Saturation**: Heap used > 85% of container RAM `->` Auto-restart / horizontal scale.
   - **Rate Limiting Anomaly**: 429 rate > 20% on a single subnet `->` Potential scrape attack / DoS attempt.

---

## 3. Incident Response Protocol

| Phase | Action | SLA |
|---|---|---|
| **P1 - Critical** (Platform Down / Integrity Flaw) | Immediate rollback to last verified release tag, notify maintainers, isolate affected endpoints. | 15 minutes |
| **P2 - High** (Upstream Provider Failure) | Switch to verified offline fallback seeds, enable caching layers. | 1 hour |
| **P3 - Medium** (Isolated Route Degradation) | Deploy hotfix via signed PR through full CI validation. | 4 hours |
