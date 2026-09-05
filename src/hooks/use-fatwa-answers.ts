'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFatwaContent } from '@/lib/fatwa';
import type { FatwaContentResult } from '@/types/fatwa';

export function useFatwaAnswers(expandedId: string | null) {
  const [contentMap, setContentMap] = useState<Map<string, FatwaContentResult>>(new Map());

  useEffect(() => {
    if (!expandedId || contentMap.has(expandedId)) return;
    let cancelled = false;

    getFatwaContent(expandedId).then((content) => {
      if (cancelled) return;
      setContentMap((prev) => {
        const next = new Map(prev);
        next.set(expandedId, content);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [expandedId, contentMap]);

  const getContent = useCallback(
    (id: string): FatwaContentResult | undefined => {
      return contentMap.get(id);
    },
    [contentMap]
  );

  return { contentMap, getContent };
}
