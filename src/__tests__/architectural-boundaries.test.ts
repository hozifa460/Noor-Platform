import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

describe('Architectural Boundaries Enforcement (ESLint Rules)', () => {
  const eslint = new ESLint();

  it('rejects domain layer importing from UI layer via relative path', async () => {
    const invalidDomainCode = `
      import type { AyahDetailModal } from '../ui/AyahDetailModal';
      export const testVal = 1;
    `;

    const [result] = await eslint.lintText(invalidDomainCode, {
      filePath: 'src/features/quran/domain/invalid-probe.ts',
    });

    expect(result.errorCount).toBeGreaterThan(0);
    const violation = result.messages.find((m) =>
      m.message.includes('Domain layer must remain pure')
    );
    expect(violation).toBeDefined();
  }, 15000);

  it('rejects domain layer importing from UI layer via @/features alias', async () => {
    const invalidDomainCode = `
      import { FatwaCard } from '@/features/fatwa/ui/FatwaCard';
      export const testVal = 10;
    `;

    const [result] = await eslint.lintText(invalidDomainCode, {
      filePath: 'src/features/fatwa/domain/invalid-alias-probe.ts',
    });

    expect(result.errorCount).toBeGreaterThan(0);
    const violation = result.messages.find((m) =>
      m.message.includes('Domain layer must remain pure')
    );
    expect(violation).toBeDefined();
  }, 15000);

  it('rejects cross-feature internal access via relative paths', async () => {
    const invalidCrossFeatureCode = `
      import { IslamicRadioCard } from '../../radio/components/IslamicRadioCard';
      export const testVal = 2;
    `;

    const [result] = await eslint.lintText(invalidCrossFeatureCode, {
      filePath: 'src/features/fatwa/ui/invalid-cross-feature.tsx',
    });

    expect(result.errorCount).toBeGreaterThan(0);
    const violation = result.messages.find((m) =>
      m.message.includes('Features must only access other features or domains through their approved root public facade')
    );
    expect(violation).toBeDefined();
  }, 15000);

  it('rejects deep relative cross-feature internal access', async () => {
    const invalidDeepCrossCode = `
      import { AdhkarHubView } from '../../../adhkar/components/AdhkarHubView';
      export const testVal = 3;
    `;

    const [result] = await eslint.lintText(invalidDeepCrossCode, {
      filePath: 'src/features/fatwa/ui/nested/deep-cross.tsx',
    });

    expect(result.errorCount).toBeGreaterThan(0);
    const violation = result.messages.find((m) =>
      m.message.includes('Features must only access other features or domains through their approved root public facade')
    );
    expect(violation).toBeDefined();
  }, 15000);

  it('rejects domain layer importing other feature private engines via relative path', async () => {
    const invalidDomainCode = `
      import { resolveRadioStream } from '../../radio/engines/stream-engine';
      export const testVal = 4;
    `;

    const [result] = await eslint.lintText(invalidDomainCode, {
      filePath: 'src/features/fatwa/domain/audit-probe-relative.ts',
    });

    expect(result.errorCount).toBeGreaterThan(0);
    const violation = result.messages.find((m) =>
      m.message.includes('Domain layer must only access other features through their approved root public facade') ||
      m.message.includes('Architecture violation')
    );
    expect(violation).toBeDefined();
  }, 15000);

  it('rejects domain layer importing other feature private engines via @/features alias', async () => {
    const invalidDomainCode = `
      import { resolveRadioStream } from '@/features/radio/engines/stream-engine';
      export const testVal = 5;
    `;

    const [result] = await eslint.lintText(invalidDomainCode, {
      filePath: 'src/features/fatwa/domain/audit-probe-alias.ts',
    });

    expect(result.errorCount).toBeGreaterThan(0);
    const violation = result.messages.find((m) =>
      m.message.includes('Domain layer must only access other features through their approved root public facade') ||
      m.message.includes('Architecture violation')
    );
    expect(violation).toBeDefined();
  }, 15000);

  it('permits pure domain sibling imports within the same layer', async () => {
    const validDomainCode = `
      import type { SurahMeta } from './types';
      export const testMeta: Partial<SurahMeta> = { id: 1 };
    `;

    const [result] = await eslint.lintText(validDomainCode, {
      filePath: 'src/features/quran/domain/valid-probe.ts',
    });

    expect(result.errorCount).toBe(0);
  }, 15000);

  describe('Prohibition of Retired Legacy Compatibility Facades', () => {
    it('rejects an App route importing from retired legacy stores path', async () => {
      const invalidAppCode = `
        import { useBooksStore } from '@/stores/books-store';
        export const testStore = useBooksStore;
      `;
      const [result] = await eslint.lintText(invalidAppCode, {
        filePath: 'src/app/books/test-page.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects an App route importing from retired legacy lib path', async () => {
      const invalidAppCode = `
        import { loadHadithBook } from '@/lib/hadith';
        export const testFn = loadHadithBook;
      `;
      const [result] = await eslint.lintText(invalidAppCode, {
        filePath: 'src/app/hadith/test-page.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects an App route importing from retired legacy fatwa stores path', async () => {
      const invalidAppCode = `
        import { useFatwaStore } from '@/stores/fatwa-store';
        export const testStore = useFatwaStore;
      `;
      const [result] = await eslint.lintText(invalidAppCode, {
        filePath: 'src/app/fatwa/test-page.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Component importing from retired legacy components path', async () => {
      const invalidComponentCode = `
        import { BookCard } from '@/components/books/BookCard';
        export const TestCard = BookCard;
      `;
      const [result] = await eslint.lintText(invalidComponentCode, {
        filePath: 'src/components/shared/TestCard.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Component importing from retired legacy fatwa components path', async () => {
      const invalidComponentCode = `
        import { FatwaCard } from '@/components/fatwa/FatwaCard';
        export const TestCard = FatwaCard;
      `;
      const [result] = await eslint.lintText(invalidComponentCode, {
        filePath: 'src/components/shared/TestCard.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Component importing from retired legacy hooks path', async () => {
      const invalidComponentCode = `
        import { useEBookReader } from '@/hooks/use-ebook-reader';
        export const testHook = useEBookReader;
      `;
      const [result] = await eslint.lintText(invalidComponentCode, {
        filePath: 'src/components/shared/TestReader.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Component importing from retired legacy fatwa hook path', async () => {
      const invalidComponentCode = `
        import { useFatwaAnswers } from '@/hooks/use-fatwa-answers';
        export const testHook = useFatwaAnswers;
      `;
      const [result] = await eslint.lintText(invalidComponentCode, {
        filePath: 'src/components/shared/TestHook.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Feature importing from retired legacy lib path', async () => {
      const invalidFeatureCode = `
        import { loadChapterChunk } from '@/lib/book-text/chapters';
        export const testChunk = loadChapterChunk;
      `;
      const [result] = await eslint.lintText(invalidFeatureCode, {
        filePath: 'src/features/books/ui/TestReaderView.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Feature importing from retired legacy stores path', async () => {
      const invalidFeatureCode = `
        import { useHadithStore } from '@/stores/hadith-store';
        export const testStoreUsage = useHadithStore;
      `;
      const [result] = await eslint.lintText(invalidFeatureCode, {
        filePath: 'src/features/hadith/ui/TestHadithView.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects a Feature importing from retired legacy fatwa lib path', async () => {
      const invalidFeatureCode = `
        import { getFatwaContent } from '@/lib/fatwa/answers';
        export const testFn = getFatwaContent;
      `;
      const [result] = await eslint.lintText(invalidFeatureCode, {
        filePath: 'src/features/fatwa/ui/TestView.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects importing from retired internal fatwa engines facade path', async () => {
      const invalidCode = `
        import { getFatwaContent } from '@/features/fatwa/engines/answers';
        export const testFn = getFatwaContent;
      `;
      const [result] = await eslint.lintText(invalidCode, {
        filePath: 'src/components/shared/TestProbe.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects importing from retired legacy types/fatwa facade path', async () => {
      const invalidCode = `
        import type { FatwaIndexItem } from '@/types/fatwa';
        export type TestType = FatwaIndexItem;
      `;
      const [result] = await eslint.lintText(invalidCode, {
        filePath: 'src/components/shared/TestTypesProbe.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Legacy compatibility paths') && m.message.includes('have been retired')
      );
      expect(violation).toBeDefined();
    }, 15000);
  });

  describe('Feature and Domain Boundaries Enforcement', () => {
    it('rejects App route importing internal private subpaths of features', async () => {
      const invalidAppCode = `
        import { BookGridCard } from '@/features/books/ui/cards/BookGridCard';
        export const testVal = BookGridCard;
      `;
      const [result] = await eslint.lintText(invalidAppCode, {
        filePath: 'src/app/books/test-page.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('App layer must access domain/feature functionality through approved root facades')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects Component importing internal private subpaths of features', async () => {
      const invalidCompCode = `
        import { HadithMatnTab } from '@/features/hadith/ui/detail-tabs/HadithMatnTab';
        export const testVal = HadithMatnTab;
      `;
      const [result] = await eslint.lintText(invalidCompCode, {
        filePath: 'src/components/shared/TestComponent.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Components and UI state layers must access domain/feature functionality through approved root facades')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('rejects Feature importing internal private subpaths of another feature', async () => {
      const invalidCrossCode = `
        import { searchInsideEBook } from '@/features/books/infrastructure/text/search';
        export const testVal = searchInsideEBook;
      `;
      const [result] = await eslint.lintText(invalidCrossCode, {
        filePath: 'src/features/hadith/ui/TestHadithView.tsx',
      });
      expect(result.errorCount).toBeGreaterThan(0);
      const violation = result.messages.find((m) =>
        m.message.includes('Features must only access other features or domains through their approved root public facade')
      );
      expect(violation).toBeDefined();
    }, 15000);

    it('permits canonical public feature imports across App, Components, and Features', async () => {
      const validAppCode = `
        import { BooksLibraryView } from '@/features/books';
        import { HadithHubView } from '@/features/hadith';
        import { FatwaLibraryView, useFatwaStore } from '@/features/fatwa';
        export const testApp = { BooksLibraryView, HadithHubView, FatwaLibraryView, useFatwaStore };
      `;
      const [result] = await eslint.lintText(validAppCode, {
        filePath: 'src/app/unified/page.tsx',
      });
      expect(result.errorCount).toBe(0);
    }, 15000);
  });
});


