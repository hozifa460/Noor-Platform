# Contributing to Noor Platform (منصة نور)

Thank you for your interest in contributing to Noor Platform! We welcome contributions that help preserve, organize, and serve Islamic heritage with the highest engineering and security standards.

---

## Code of Conduct & Principles

1. **Authenticity & Integrity**: All Islamic datasets, hadith narrations, texts, and recitations must be strictly authentic, verified against recognized sources, and accompanied by verifiable checksums where applicable.
2. **Defense in Depth**: Every API endpoint handling external input must implement SSRF validation, rate limiting, and safe Content-Type enforcement.
3. **Zero Warnings Policy**: Code must pass `npm run lint` and `npm run typecheck` with 0 errors and 0 warnings.
4. **100% Test Passing**: All unit and integration test suites in `scripts/` must pass before any pull request is merged.

---

## Development Workflow

### 1. Prerequisites
- Node.js 20+ (LTS)
- npm 10+

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/hozifa460/Noor-Platform.git
cd Noor-Platform

# Install dependencies
npm ci

# Sync and verify dataset integrity
npm run data:sync

# Run development server
npm run dev
```

### 3. Verification Commands
Before opening a PR, ensure all checks pass:
```bash
npm run lint          # ESLint check (must be 0 errors, 0 warnings)
npm run typecheck     # TypeScript compiler check
npm test              # Run full integration and security audit suite
npm run build         # Verify optimized production build
```

---

## Pull Request Guidelines

- Branch naming convention: `feat/feature-name`, `fix/issue-description`, `security/hardening-area`.
- Use conventional commits (e.g. `feat(quran): ...`, `fix(security): ...`, `docs: ...`).
- Ensure no sensitive tokens, private keys, or credentials are committed.
