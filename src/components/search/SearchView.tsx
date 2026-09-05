'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MediaGrid } from '@/components/media/MediaGrid';
import { SheikhCard } from '@/components/sheikh/SheikhCard';
import { useLibraryStore } from '@/stores/library-store';
import { useNavStore } from '@/stores/nav-store';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { arabicSearchMatch } from '@/lib/arabic/normalizer';

export function SearchView() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams?.get('q') || '';
  const storeQuery = useNavStore((s) => s.searchQuery || '');
  const activeQuery = urlQuery || storeQuery;

  const openSearch = useNavStore((s) => s.openSearch);
  const goHome = useNavStore((s) => s.goHome);
  const items = useLibraryStore((s) => s.items);
  const sheikhs = useLibraryStore((s) => s.sheikhsArray);

  const [inputVal, setInputVal] = useState(activeQuery);

  const results = useMemo(() => {
    if (!activeQuery.trim()) return [];
    const q = activeQuery.trim();
    return items.filter((item) => {
      if (item.title && arabicSearchMatch(item.title, q)) return true;
      if (item.sheikhName && arabicSearchMatch(item.sheikhName, q)) return true;
      if (item.description && arabicSearchMatch(item.description, q)) return true;
      if (item.tags?.some((t) => arabicSearchMatch(t, q))) return true;
      return false;
    });
  }, [items, activeQuery]);

  const sheikhResults = useMemo(() => {
    if (!activeQuery.trim()) return [];
    const q = activeQuery.trim();
    return sheikhs
      .filter((s) => arabicSearchMatch(s.name, q) || (s.bio && arabicSearchMatch(s.bio, q)))
      .slice(0, 6);
  }, [sheikhs, activeQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    openSearch(clean);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="relative max-w-2xl mx-auto">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="ابحث عن شيخ، محاضرة، سورة، فتوى..."
          className="pr-12 pl-12 h-12 text-base"
        />
        {inputVal && (
          <button
            type="button"
            onClick={() => {
              setInputVal('');
              openSearch('');
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </form>

      {activeQuery.trim() && (
        <div className="text-center text-sm text-muted-foreground">
          {results.length + sheikhResults.length} نتيجة لـ «<span className="text-foreground font-medium">{activeQuery}</span>»
          <Button variant="ghost" size="sm" onClick={goHome} className="mr-3">إلغاء</Button>
        </div>
      )}

      {sheikhResults.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">المشايخ</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sheikhResults.map((s) => <SheikhCard key={s.id} sheikh={s} />)}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">المحتوى</h2>
          <MediaGrid items={results} />
        </section>
      )}

      {activeQuery.trim() && results.length === 0 && sheikhResults.length === 0 && (
        <div className="py-20 text-center">
          <Search className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">لا توجد نتائج مطابقة لبحثك</p>
        </div>
      )}
    </div>
  );
}
