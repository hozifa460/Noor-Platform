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
});

