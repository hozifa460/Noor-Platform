/**
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
