'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { copyToClipboard } from '@/lib/shared';

export interface UseClipboardOptions {
  timeout?: number;
}

export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000 } = options;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string, successMessage?: string): Promise<boolean> => {
      const ok = await copyToClipboard(text, successMessage);
      if (ok && isMountedRef.current) {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setCopied(false);
          }
        }, timeout);
      }
      return ok;
    },
    [timeout]
  );

  return { copied, copy, setCopied };
}

/**
 * Hook for managing clipboard state keyed by item ID (e.g. list views where items have individual copy buttons).
 */
export function useIdClipboard<T = string | number>(options: UseClipboardOptions = {}) {
  const { timeout = 2000 } = options;
  const [copiedId, setCopiedId] = useState<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(
    async (id: T, text: string, successMessage?: string): Promise<boolean> => {
      const ok = await copyToClipboard(text, successMessage);
      if (ok && isMountedRef.current) {
        setCopiedId(id);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setCopiedId(null);
          }
        }, timeout);
      }
      return ok;
    },
    [timeout]
  );

  return { copiedId, copy, setCopiedId };
}
