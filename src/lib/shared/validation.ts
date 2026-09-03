/**
 * Noor Platform — Runtime Schema & Ingestion Validator
 * Provides robust type-guards and schema assertions for untrusted external payloads.
 */

import type { MediaItem } from "../types";

/**
 * Validates that an unknown object conforms to the MediaItem schema.
 */
export function isValidMediaItem(item: unknown): item is MediaItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.title === "string" &&
    candidate.title.length > 0 &&
    typeof candidate.section === "string"
  );
}

/**
 * Safely parses and validates an array of unknown items into verified MediaItems.
 */
export function validateMediaItemList(items: unknown): MediaItem[] {
  if (!Array.isArray(items)) return [];
  const valid: MediaItem[] = [];

  for (const item of items) {
    if (isValidMediaItem(item)) {
      valid.push(item);
    }
  }

  return valid;
}

/**
 * Validates external API JSON response envelopes.
 */
export interface ApiResponseEnvelope<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
  meta?: Record<string, unknown>;
  requestId?: string;
}

export function createSuccessEnvelope<T>(data: T, meta?: Record<string, unknown>, requestId?: string): ApiResponseEnvelope<T> {
  return {
    data,
    meta,
    requestId,
  };
}

export function createErrorEnvelope(code: string, message: string, requestId?: string): ApiResponseEnvelope<never> {
  return {
    error: {
      code,
      message,
      requestId,
    },
    requestId,
  };
}
