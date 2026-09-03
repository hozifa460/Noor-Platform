'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseDebouncedSearchOptions {
  /**
   * The external/parent query value (e.g. from a Zustand store).
   */
  value: string;
  /**
   * Callback invoked when the debounced search value changes or when submitted/cleared.
   */
  onSearchChange: (value: string) => void;
  /**
   * Debounce delay in milliseconds. Defaults to 250ms.
   */
  delay?: number;
  /**
   * Optional side-effect callback triggered immediately when input changes, submitted, or cleared (e.g. resetting page or visible count).
   */
  onResetPagination?: () => void;
}

export function useDebouncedSearch({
  value,
  onSearchChange,
  delay = 250,
  onResetPagination,
}: UseDebouncedSearchOptions) {
  const [localSearch, setLocalSearch] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const onSearchChangeRef = useRef(onSearchChange);
  const onResetPaginationRef = useRef(onResetPagination);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
    onResetPaginationRef.current = onResetPagination;
  }, [onSearchChange, onResetPagination]);

  // Synchronize local input whenever external store/parent value changes
  useEffect(() => {
    setLocalSearch(value);
  }, [value]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (val: string) => {
      setLocalSearch(val);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearchChangeRef.current(val);
        onResetPaginationRef.current?.();
      }, delay);
    },
    [delay]
  );

  const handleSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearchChangeRef.current(localSearch);
      onResetPaginationRef.current?.();
    },
    [localSearch]
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearch('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearchChangeRef.current('');
    onResetPaginationRef.current?.();
  }, []);

  return {
    localSearch,
    setLocalSearch,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
  };
}
