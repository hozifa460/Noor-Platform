# ADR-003: Micro-Sharded Inverted Index Search

## Status: Accepted

## Context
Fast, instant search across 3500+ hadiths and tens of thousands of books without requiring heavy external Elasticsearch servers.

## Decision
Compile prefix-sharded inverted indexes with Arabic root normalizations and execute queries in client-side Web Workers.
