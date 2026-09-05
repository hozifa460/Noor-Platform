'use client';

/**
 * Compatibility re-export facade.
 * The Fatwa domain state store has migrated to Feature-Sliced Design at @/features/fatwa.
 */
export { useFatwaStore } from '@/features/fatwa';
export type { FatwaState } from '@/features/fatwa';
