'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/stores/player.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { downloadForOffline } from '@/lib/shared/download';
import { downloadBookTextFile } from '@/lib/book-text';
import { isQuranBook, isPureTextBook, isOpenItiBook, isShamelaBook } from '@/lib/books/utils';
import { BookGridCard } from './cards/BookGridCard';
import { BookListCard } from './cards/BookListCard';
import type { MediaItem } from '@/lib/types';
import { useClipboard } from '@/hooks/use-clipboard';
import { toast } from 'sonner';

interface BookCardProps {
  book: MediaItem;
  viewMode?: 'grid' | 'list';
}

export function BookCard({ book, viewMode = 'grid' }: BookCardProps) {
  const openPlayer = usePlayerStore((s) => s.open);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(book.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const [downloading, setDownloading] = useState(false);
  const { copied, copy } = useClipboard();

  const isQuran = isQuranBook(book);
  const isPureText = isPureTextBook(book);
  const isOpenIti = isOpenItiBook(book);
  const isShamela = isShamelaBook(book);

  const handleRead = () => {
    openPlayer(book);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      if (isPureText || isOpenIti || isShamela) {
        const ok = await downloadBookTextFile(book.id, book.title);
        if (ok) {
          toast.success('تم تنزيل نص الكتاب على جهازك بنجاح');
        } else {
          toast.error('تعذر تنزيل الكتاب');
        }
      } else {
        await downloadForOffline(book);
        toast.success('تم بدء تنزيل الكتاب');
      }
    } catch {
      toast.error('تعذر تنزيل الكتاب');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = book.pdfUrl || (typeof window !== 'undefined' ? window.location.href : '');
    copy(shareUrl, 'تم نسخ رابط الكتاب');
  };


  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(book.id);
  };

  if (viewMode === 'list') {
    return (
      <BookListCard
        book={book}
        isQuran={isQuran}
        isPureText={isPureText}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFav}
        onRead={handleRead}
        onDownload={handleDownload}
        downloading={downloading}
        onShare={handleShare}
        copied={copied}
      />
    );
  }

  return (
    <BookGridCard
      book={book}
      isQuran={isQuran}
      isPureText={isPureText}
      isFavorite={isFavorite}
      onToggleFavorite={handleToggleFav}
      onRead={handleRead}
      onDownload={handleDownload}
      downloading={downloading}
      onShare={handleShare}
      copied={copied}
    />
  );
}
