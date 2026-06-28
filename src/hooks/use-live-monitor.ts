'use client';

import { useEffect } from 'react';
import { useLibraryStore } from '@/stores/library.store';
import type { MediaItem } from '@/lib/types';

/**
 * Window in milliseconds during which a live item is considered "currently
 * broadcasting". YouTube RSS feed only includes active live streams in the
 * `live` playlist — once a stream ends, it may stay in the file but its
 * publishedAt becomes older than this window.
 *
 * 4 hours matches typical maximum live stream length for Islamic lectures
 * (Friday khutbahs ~1h, evening dars ~2h, Taraweeh ~3h).
 */
const LIVE_NOW_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Compute the liveStatus for a MediaItem.
 *
 * Rules:
 *   - Non-live items → undefined (no status)
 *   - Live items with publishedAt within LIVE_NOW_WINDOW_MS → 'now'
 *   - Live items with publishedAt older than window → 'ended'
 *   - Live items WITHOUT publishedAt → 'ended' (pessimistic default — most
 *     "live" tab items on YouTube are actually past broadcasts; only items
 *     with a recent publishedAt should be treated as currently broadcasting)
 *
 * Exported for use in selectors and tests.
 */
export function computeLiveStatus(item: MediaItem): 'now' | 'ended' | undefined {
  if (item.section !== 'live') return undefined;
  if (!item.publishedAt) return 'ended';
  const ts = new Date(item.publishedAt).getTime();
  if (isNaN(ts)) return 'ended';
  return Date.now() - ts < LIVE_NOW_WINDOW_MS ? 'now' : 'ended';
}

/**
 * Hook that periodically refreshes `liveStatus` on all live items in the
 * library store. Runs every 60 seconds so that when a live stream ends
 * (passes the 4-hour window), it automatically moves from "مباشر الآن" to
 * "بثوث سابقة" without a page reload.
 *
 * Cheap operation: only walks the items that are in the live section
 * (typically <100 items), and only triggers a state update if at least one
 * item's status actually changed.
 */
export function useLiveMonitor() {
  const items = useLibraryStore((s) => s.items);
  const setItems = useLibraryStore((s) => s.setItems);
  const sheikhMetaByFile = useLibraryStore((s) => s.sheikhMetaByFile);

  useEffect(() => {
    const tick = () => {
      const liveItems = items.filter((i) => i.section === 'live');
      if (liveItems.length === 0) return;
      let changed = false;
      const updated = items.map((item) => {
        if (item.section !== 'live') return item;
        const newStatus = computeLiveStatus(item);
        if (item.liveStatus !== newStatus) {
          changed = true;
          return { ...item, liveStatus: newStatus };
        }
        return item;
      });
      if (changed) {
        setItems(updated, sheikhMetaByFile);
      }
    };

    // Run once on mount so status is set immediately after sync.
    tick();
    // Then every 60 seconds.
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [items, setItems, sheikhMetaByFile]);
}
