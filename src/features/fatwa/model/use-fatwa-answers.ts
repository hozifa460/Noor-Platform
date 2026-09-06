'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFatwaContent } from '../infrastructure';
import type { FatwaContentResult } from '../domain';

export function useFatwaAnswers(expandedId: string | null) {
  const [contentMap, setContentMap] = useState<Map<string, FatwaContentResult>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchContent = useCallback(async (id: string) => {
    setLoadingId(id);
    try {
      const content = await getFatwaContent(id);
      if (content.found || content.status === 'not_found') {
        setContentMap((prev) => {
          const next = new Map(prev);
          next.set(id, content);
          return next;
        });
      }
      return content;
    } finally {
      setLoadingId((current) => (current === id ? null : current));
    }
  }, []);

  useEffect(() => {
    if (!expandedId) return;
    const existing = contentMap.get(expandedId);
    if (existing && (existing.found || existing.status === 'not_found')) return;

    let cancelled = false;
    setLoadingId(expandedId);

    getFatwaContent(expandedId)
      .then((content) => {
        if (cancelled) return;
        if (content.found || content.status === 'not_found') {
          setContentMap((prev) => {
            const next = new Map(prev);
            next.set(expandedId, content);
            return next;
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingId((cur) => (cur === expandedId ? null : cur));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [expandedId, contentMap]);

  const retry = useCallback(
    async (id: string) => {
      setContentMap((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return fetchContent(id);
    },
    [fetchContent]
  );

  const getContent = useCallback(
    (id: string): FatwaContentResult | undefined => {
      return contentMap.get(id);
    },
    [contentMap]
  );

  return { contentMap, getContent, loadingId, retry };
}

