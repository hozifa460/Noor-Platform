'use client';

import type { FatwaIndexItem } from '../domain';
import { fatwaIndexManager } from './index-manager';

export class FatwaWorkerClient {
  private worker: Worker | null = null;
  private isReady = false;
  /**
   * Pending search promises keyed by a UNIQUE request id (never by the query
   * string). Keying by query made two identical in-flight queries collide:
   * the second `set()` overwrote the first callback, so the first promise
   * could never settle, and the safety timeout cleaned up the wrong entry.
   */
  private requestSeq = 0;
  private pendingCallbacks = new Map<number, (results: FatwaIndexItem[]) => void>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      this.worker = new Worker('/workers/fatwa-search-worker.js');
      this.worker.onmessage = (e) => {
        const { type, requestId, results } = e.data;
        if (type === 'INDEX_READY') {
          this.isReady = true;
        } else if (type === 'SEARCH_RESULTS') {
          const cb = this.pendingCallbacks.get(requestId);
          if (cb) {
            this.pendingCallbacks.delete(requestId);
            cb(results);
          }
        }
      };
    } catch {
      this.worker = null;
    }
  }

  public syncIndex(items: FatwaIndexItem[]) {
    if (this.worker) {
      this.worker.postMessage({ type: 'INIT_INDEX', payload: items });
    }
  }

  public async searchAsync(
    query: string,
    category = 'all',
    scholar = 'all',
    limit = 60
  ): Promise<FatwaIndexItem[]> {
    if (!this.worker || !this.isReady) {
      return fatwaIndexManager.searchIndex(query, category, scholar, limit);
    }

    const requestId = ++this.requestSeq;

    return new Promise((resolve) => {
      this.pendingCallbacks.set(requestId, resolve);
      this.worker!.postMessage({
        type: 'SEARCH',
        requestId,
        payload: { query, category, scholar, limit },
      });

      // Safety timeout — keyed by the unique requestId so a duplicate query in
      // flight can never cancel this entry, and this entry can never cancel a
      // newer one. Guarantees the promise settles even if the worker never replies.
      setTimeout(() => {
        const cb = this.pendingCallbacks.get(requestId);
        if (cb) {
          this.pendingCallbacks.delete(requestId);
          cb(fatwaIndexManager.searchIndex(query, category, scholar, limit));
        }
      }, 500);
    });
  }
}

export const fatwaWorkerClient = new FatwaWorkerClient();
