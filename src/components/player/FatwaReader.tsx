'use client';

import { FileQuestion, FileText } from 'lucide-react';
import type { MediaItem } from '@/lib/types';

interface FatwaReaderProps {
  item: MediaItem;
}

export function FatwaReader({ item }: FatwaReaderProps) {
  const question = item.description || '';
  const answer = item.answer || '';

  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      {/* Question section */}
      {question && (
        <section className="mb-6">
          <h3 className="flex items-center gap-2 text-base font-bold text-primary mb-3 border-b border-border pb-2">
            <FileQuestion className="size-4" />
            السؤال
          </h3>
          <p className="text-foreground leading-loose whitespace-pre-wrap text-sm sm:text-base">
            {question}
          </p>
        </section>
      )}

      {/* Answer section */}
      {answer ? (
        <section>
          <h3 className="flex items-center gap-2 text-base font-bold text-primary mb-3 border-b border-border pb-2">
            <FileText className="size-4" />
            الجواب
          </h3>
          <div className="text-foreground leading-loose whitespace-pre-wrap text-sm sm:text-base">
            {answer}
          </div>
        </section>
      ) : (
        <div className="py-10 text-center text-muted-foreground">
          <FileQuestion className="size-10 mx-auto mb-2 opacity-40" />
          <p>لا يوجد نص جواب متاح لهذه الفتوى</p>
        </div>
      )}

      {/* Source attribution */}
      {(item.sheikhName || item.groupTitle || item.sourceFile) && (
        <footer className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
          {item.sheikhName && (
            <p>
              <span className="font-medium">الشيخ:</span> {item.sheikhName}
            </p>
          )}
          {item.groupTitle && (
            <p>
              <span className="font-medium">المصدر:</span> {item.groupTitle}
            </p>
          )}
          {item.sourceFile && (
            <p className="opacity-60 truncate">
              <span className="font-medium">الملف:</span> {item.sourceFile}
            </p>
          )}
        </footer>
      )}
    </article>
  );
}
