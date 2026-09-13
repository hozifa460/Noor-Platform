'use client';

import { useState, useCallback } from 'react';
import { searchInsideEBook } from '../infrastructure';
import type { InBookSearchResult } from '../domain';
import { toast } from 'sonner';

export function useBookSearch(bookId: string, onJumpChapter: (chapterIndex: number) => void) {
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<InBookSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [highlightTerm, setHighlightTerm] = useState<string>('');

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q);
      if (!q.trim() || q.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      const hits = await searchInsideEBook(bookId, q);
      setSearchResults(hits);
      setSearching(false);
    },
    [bookId]
  );

  const handleJumpToSearch = (result: InBookSearchResult) => {
    onJumpChapter(result.chapterIndex);
    setHighlightTerm(searchQuery.trim());
    setSearchModalOpen(false);
    toast.success(`الانتقال إلى ${result.chapterTitle} (صفحة ${result.pageNumber})`);
  };

  return {
    searchModalOpen,
    setSearchModalOpen,
    searchQuery,
    searchResults,
    searching,
    highlightTerm,
    handleSearch,
    handleJumpToSearch,
  };
}
