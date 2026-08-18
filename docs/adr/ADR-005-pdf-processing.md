# ADR-005: Bounded Native Process Semaphores for PDF Processing

## Status: Accepted

## Decision
Use global process semaphores to strictly constrain concurrent subprocess invocations (`pdftoppm`, `pdfinfo`) to a maximum concurrency of 4, returning HTTP 503 Retry-After on saturation to eliminate server exhaustion.
