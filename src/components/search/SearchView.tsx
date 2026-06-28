'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MediaGrid } from '@/components/media/MediaGrid';
import { SheikhCard } from '@/components/sheikh/SheikhCard';
import { useLibraryStore } from '@/stores/library.store';
import { useNavStore } from '@/stores/nav.store';
import { useState, useMemo } from 'react';

export function SearchView() {
  const query = useNavStore((s) => s.searchQuery || '');
  const openSearch = useNavStore((s) => s.openSearch);
  const goHome = useNavStore((s) => s.goHome);
  const search = useLibraryStore((s) => s.search);
  const allSheikhs = useLibraryStore((s) => s.allSheikhs);
  const [local, setLocal] = useState(query);

  const results = useMemo(() => search(query), [search, query]);
  const sheikhResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return allSheikhs().filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6);
  }, [allSheikhs, query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (local.trim()) openSearch(local.trim());
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="relative max-w-2xl mx-auto">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          autoFocus
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="ابحث عن شيخ، محاضرة، سورة، فتوى..."
          className="pr-12 pl-12 h-12 text-base"
        />
        {local && (
          <button
            type="button"
            onClick={() => setLocal('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </form>

      {query.trim() && (
        <div className="text-center text-sm text-muted-foreground">
          {results.length + sheikhResults.length} نتيجة لـ «<span className="text-foreground font-medium">{query}</span>»
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

      {query.trim() && results.length === 0 && sheikhResults.length === 0 && (
        <div className="py-20 text-center">
          <Search className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">لا توجد نتائج</p>
        </div>
      )}
    </div>
  );
}
