# Islamic Data Sources & Cryptographic Provenance

Noor Platform strictly ingests and serves authentic Islamic knowledge verified against authoritative sources.

## 1. Verified Upstream Providers

| Domain | Provider | Verification Standard |
|---|---|---|
| **Holy Quran** | King Fahd Complex / Quran.com / MP3Quran | Verified Uthmani script & authenticated reciter audio maps |
| **Hadith Encyclopedia** | HadeethEnc / Dorar.net | Verified gradings (Albani, Bukhari, Muslim) & SHA-256 pinned datasets |
| **Classical Books** | Al-Maktaba Al-Shamela / OpenITI / Archive.org | Validated printed book alignment & SHA-256 data integrity |
| **Live Radios** | MP3Quran / Quran Radio Official Streams | 100% verified HTTP audio stream URLs with automated handshake checks |

## 2. Cryptographic Integrity Enforcement
Remote datasets ingested during build and deployment (`scripts/sync-data.mjs`) are cryptographically verified against immutable SHA-256 checksums before ingestion. Any checksum mismatch triggers an immediate fail-closed termination (`process.exit(1)`).
