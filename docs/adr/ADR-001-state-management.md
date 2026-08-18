# ADR-001: Modular State Management with Zustand

## Status: Accepted

## Context
A rich multi-domain application requires performant client-side state without the boilerplate of Redux or the context-re-render overhead of React Context.

## Decision
Adopt isolated, slice-based Zustand stores (`books-store`, `quran-store`, `hadith-store`, `fatwa-store`, `player-store`, `nav-store`). Static catalogs are strictly decoupled into `src/data/` to maintain minimal bundle footprints.

## Consequences
- Clean separation of UI state from static domain datasets.
- Fast, granular re-renders with zero overhead.
