'use client';

import { useSyncExternalStore } from 'react';

/**
 * Stable snapshot functions for useSyncExternalStore.
 * The empty subscribe never triggers updates; we just need to read
 * "are we on the client?" once and keep it stable.
 */
const emptySubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Returns true once the component has mounted on the client.
 * Uses useSyncExternalStore to avoid the setState-in-effect lint rule.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
}
