# Security Policy — Noor Platform (منصة نور)

Noor Platform takes the security and integrity of Islamic digital heritage, its users, and its infrastructure with the utmost seriousness.

## Supported Versions

Only the latest active release on the `main` branch receives security updates.

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
2. **Active MIME Lockdown & Content-Type Enforcement**: Proxied media routes (PDF, GitLab, Shamela) enforce strict non-executable MIME types and inspect raw byte magic headers (e.g. `%PDF-`).
3. **Cryptographic Data Integrity**: Remote datasets (e.g. HadeethEnc Sharh) are verified against immutable SHA-256 checksums before ingestion.
4. **Process Concurrency Semaphores**: Native PDF parsing subprocesses (`pdftoppm`, `pdfinfo`) are bounded via global semaphores to eliminate DoS/process table exhaustion.
5. **Least Privilege CI**: GitHub Actions workflows run with explicit `permissions: contents: read` and pinned commit SHAs.
6. **Multi-layer Rate Limiting**: Distributed Upstash Redis/Vercel KV rate limiting with sliding windows and trusted proxy header verification.
