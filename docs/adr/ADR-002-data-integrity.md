# ADR-002: Cryptographic SHA-256 Data Integrity

## Status: Accepted

## Context
Islamic texts and hadith commentaries require absolute tamper-proof authenticity.

## Decision
Enforce strict SHA-256 checksum verification on all ingested datasets. Any remote payload with an unexpected hash triggers an immediate fail-closed abort.
