'use client';

import type { FatwaIndexItem } from './index-data';
import { fatwaIndexManager } from './index-data';

class FatwaWorkerClient {
  private worker: Worker | null = null;
  private isReady = false;
  private pendingCallbacks = new Map<string, (results: FatwaIndexItem[]) => void>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      this.worker = new Worker('/workers/fatwa-search-worker.js');
      this.worker.onmessage = (e) => {
        const { type, query, results } = e.data;
        if (type === 'INDEX_READY') {
          this.isReady = true;
        } else if (type === 'SEARCH_RESULTS') {
          const cb = this.pendingCallbacks.get(query);
          if (cb) {
            cb(results);
            this.pendingCallbacks.delete(query);
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
    // If worker is not available, execute on main thread
    if (!this.worker || !this.isReady) {
      return fatwaIndexManager.searchIndex(query, category, scholar, limit);
    }

    return new Promise((resolve) => {
      this.pendingCallbacks.set(query, resolve);
      this.worker!.postMessage({
        type: 'SEARCH',
        payload: { query, category, scholar, limit },
      });

      // Safety timeout
      setTimeout(() => {
        if (this.pendingCallbacks.has(query)) {
          this.pendingCallbacks.delete(query);
          resolve(fatwaIndexManager.searchIndex(query, category, scholar, limit));
        }
      }, 500);
    });
  }
}

export const fatwaWorkerClient = new FatwaWorkerClient();
