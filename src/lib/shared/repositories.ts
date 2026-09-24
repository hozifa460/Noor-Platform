import type { RepositorySource } from '../types';
import { detectExplicitSection } from './classifier';

/**
 * Default repository sources on Hugging Face (and optional GitHub/GitLab).
 *
 * Source 1 (Hugging Face): hozifa1/Telewat_Daawa_And_Channels
 *                         Path: Dawah_And_Channels/index.json
 *                         (Channels, recitations, videos, shorts, live)
 *
 * Source 2 (Hugging Face): hozifa1/fatawaset
 *                         Path: fatawa
 *                         (Fatwa collections & fatawa_JSON)
 *
 * Source 3 (Hugging Face): hozifa1/islamic_books
 *                         Path: books
 *                         (Books, classical texts & articles)
 */
export const DEFAULT_REPOSITORIES: RepositorySource[] = [
  {
    id: 'hf-telewat-dawah',
    provider: 'huggingface',
    owner: 'hozifa1',
    repo: 'Telewat_Daawa_And_Channels',
    branch: 'main',
    path: 'Dawah_And_Channels',
    indexFile: 'index.json',
    // This dataset ships a real static index.json (108 files), so the Tree API
    // must never be queried as a fallback guess.
    indexMode: 'static',
    primary: true,
    enabled: true,
    supportedTypes: ['videos', 'shorts', 'live', 'radio', 'main'],
  },
  {
    id: 'hf-fatawa',
    provider: 'huggingface',
    owner: 'hozifa1',
    repo: 'fatawaset',
    branch: 'main',
    path: 'fatawa',
    // Tree-only dataset: there is no fatawa/index.json, so the static guess must
    // be skipped to avoid a guaranteed 404 on every page load.
    indexMode: 'tree',
    primary: false,
    enabled: true,
    supportedTypes: ['fatwa'],
  },
  {
    id: 'hf-islamic-books',
    provider: 'huggingface',
    owner: 'hozifa1',
    repo: 'islamic_books',
    branch: 'main',
    path: 'books',
    // Tree-only dataset (nested Shamela/OpenITI layout, no books/index.json).
    indexMode: 'tree',
    primary: false,
    enabled: true,
    supportedTypes: ['books', 'articles'],
  },
];

/** Local storage key for user-edited repository config. */
export const REPOS_STORAGE_KEY = 'isp.repositories';

const TRUSTED_REPOSITORY_OWNERS = new Set([
  'hozifa1',
  'AuthenticIlm',
  'OpenITI',
  'hozifa460',
  'hazozahz-islamway',
]);

/** Supported explicit indexing modes for a repository source. */
export const INDEX_MODES: ReadonlySet<string> = new Set(['auto', 'static', 'tree']);

/** Validates whether a repository source configuration is safe and conforms to allowlist rules. */
function isValidRepository(r: unknown): r is RepositorySource {
  if (!r || typeof r !== 'object') return false;
  const repo = r as Record<string, unknown>;
  const allowedProviders = ['huggingface', 'github', 'gitlab'];
  if (!allowedProviders.includes(String(repo.provider))) return false;

  const owner = String(repo.owner || '').trim();
  const repoName = String(repo.repo || '').trim();

  // Enforce approved owner allowlist to prevent arbitrary repository persistence poisoning
  if (!TRUSTED_REPOSITORY_OWNERS.has(owner)) return false;
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(repoName)) return false;
  if (repo.branch && !/^[a-zA-Z0-9_\-\./]+$/.test(String(repo.branch))) return false;
  if (repo.path && !/^[a-zA-Z0-9_\-\./]+$/.test(String(repo.path))) return false;
  if (repo.supportedTypes !== undefined) {
    if (!Array.isArray(repo.supportedTypes) || !repo.supportedTypes.every((t) => typeof t === 'string')) {
      return false;
    }
  }
  if (repo.indexMode !== undefined && !INDEX_MODES.has(String(repo.indexMode))) return false;
  return true;
}


const LEGACY_DEFAULT_OWNERS = new Set(['hozifa460', 'hazozahz-islamway']);

/**
 * Checks if a repository source corresponds to a known default repository.
 * Matches by current coordinates or legacy coordinates.
 * Strictly ignores ID if coordinates were modified by the user.
 */
export function matchDefaultRepo(
  repo: RepositorySource,
): { defaultDef: RepositorySource; isLegacyCoord: boolean } | null {
  const owner = (repo.owner || '').trim().toLowerCase();
  const repoName = (repo.repo || '').trim().toLowerCase();
  const provider = (repo.provider || '').trim().toLowerCase();

  for (const def of DEFAULT_REPOSITORIES) {
    const defOwner = def.owner.toLowerCase();
    const defRepo = def.repo.toLowerCase();
    const defProvider = def.provider.toLowerCase();

    // 1. Current default coordinates match
    if (provider === defProvider && owner === defOwner && repoName === defRepo) {
      return { defaultDef: def, isLegacyCoord: false };
    }

    // 2. Legacy coordinates match (old default owners on github/gitlab/huggingface)
    if (LEGACY_DEFAULT_OWNERS.has(owner) && repoName === defRepo) {
      return { defaultDef: def, isLegacyCoord: true };
    }
  }

  return null;
}

/**
 * Migrates legacy saved default repository configurations that lack supportedTypes or use legacy coordinates,
 * while preserving user modifications (e.g. enabled, path, custom branch, chosen index mode) and preserving
 * custom user repositories. Does not replace the user's entire repository list.
 * Strictly distinguishes between missing supportedTypes (undefined) and an intentional empty array ([]).
 */
export function migrateSavedRepositories(repos: RepositorySource[]): {
  repos: RepositorySource[];
  migrated: boolean;
} {
  let migrated = false;

  const updatedRepos = repos.map((repo) => {
    const match = matchDefaultRepo(repo);
    if (!match) {
      // Custom repository or repository with changed coordinates: preserve untouched!
      return repo;
    }

    const { defaultDef, isLegacyCoord } = match;
    const updated = { ...repo };
    let entryChanged = false;

    // 1. If coordinates are legacy, upgrade coordinates to modern default
    if (isLegacyCoord) {
      updated.provider = defaultDef.provider;
      updated.owner = defaultDef.owner;
      updated.repo = defaultDef.repo;
      // If repository had old default id prefix or missing id, align to canonical id
      if (!updated.id || updated.id.startsWith('gh-') || updated.id.startsWith('gl-')) {
        updated.id = defaultDef.id;
      }
      entryChanged = true;
    }

    // 2. Distinguish between missing supportedTypes (undefined) and an intentional empty array ([]).
    // Only backfill default supportedTypes when supportedTypes is strictly undefined.
    if (updated.supportedTypes === undefined && defaultDef.supportedTypes) {
      updated.supportedTypes = [...defaultDef.supportedTypes];
      entryChanged = true;
    }

    // 3. Backfill the explicit indexing mode for known defaults so saved
    // configurations adopt the non-guessing behavior (no `${path}/index.json`
    // request for tree-only datasets). A user-chosen mode is always preserved.
    if (updated.indexMode === undefined && defaultDef.indexMode !== undefined) {
      updated.indexMode = defaultDef.indexMode;
      entryChanged = true;
    }

    if (entryChanged) {
      migrated = true;
    }

    return updated;
  });

  return { repos: updatedRepos, migrated };
}

/** Load repositories from localStorage (user may edit) or fallback to defaults. */
export function loadRepositories(): RepositorySource[] {
  if (typeof window === 'undefined') return DEFAULT_REPOSITORIES;
  try {
    const raw = window.localStorage.getItem(REPOS_STORAGE_KEY);
    if (!raw) return DEFAULT_REPOSITORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_REPOSITORIES;

    // Filter and keep only valid, sanitized repository entries
    const validRepos = parsed.filter(isValidRepository);
    if (validRepos.length === 0) return DEFAULT_REPOSITORIES;

    // Migrate legacy default repositories that lack supportedTypes or use legacy coordinates,
    // while preserving user customizations and custom repositories.
    const { repos: migratedRepos, migrated } = migrateSavedRepositories(validRepos);
    if (migrated) {
      saveRepositories(migratedRepos);
    }

    return migratedRepos;
  } catch {
    return DEFAULT_REPOSITORIES;
  }
}

/** Persist repositories to localStorage. */
export function saveRepositories(repos: RepositorySource[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(repos));
  } catch {
    /* ignore quota errors */
  }
}

/** Build the raw URL for a file in a Hugging Face Dataset repository. */
export function huggingfaceRawUrl(repo: RepositorySource, filePath: string): string {
  const branch = repo.branch || 'main';
  const cleanPath = filePath.replace(/^\/+/, '');
  // Encode URI components while preserving slashes
  const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/datasets/${repo.owner}/${repo.repo}/raw/${branch}/${encodedPath}`;
}

/** Build the raw URL for a file in a GitHub repository (raw.githubusercontent.com). */
export function githubRawUrl(repo: RepositorySource, filePath: string): string {
  const branch = repo.branch || 'main';
  const cleanPath = filePath.replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${cleanPath}`;
}

/** Build the raw URL for a file in a GitLab repository. */
export function gitlabRawUrl(repo: RepositorySource, filePath: string): string {
  const branch = repo.branch || 'main';
  const cleanPath = filePath.replace(/^\/+/, '');
  const upstream = `https://gitlab.com/${repo.owner}/${repo.repo}/-/raw/${branch}/${cleanPath}`;
  return upstream;
}

/**
 * Build the raw URL for the index.json in a repository.
 */
export function indexUrl(repo: RepositorySource): string {
  const path = (repo.path || '').replace(/^\/+|\/+$/g, '');
  const indexFile = repo.indexFile || 'index.json';
  const indexPath = path ? `${path}/${indexFile}` : indexFile;

  if (repo.provider === 'huggingface') {
    return huggingfaceRawUrl(repo, indexPath);
  }
  return repo.provider === 'github' ? githubRawUrl(repo, indexPath) : gitlabRawUrl(repo, indexPath);
}

/**
 * Hugging Face Tree API page size. 1,000 is the maximum number of entries the
 * API returns per response; larger directories are paginated with a cursor
 * advertised through the `Link: <...>; rel="next"` response header.
 */
export const HF_TREE_PAGE_LIMIT = 1000;

/** Build the Hugging Face Dataset Tree API URL for a repository directory. */
export function huggingfaceTreeUrl(
  repo: RepositorySource,
  treePath?: string,
  options: { recursive?: boolean } = {},
): string {
  const branch = repo.branch || 'main';
  const cleanPath = (treePath === undefined ? repo.path || '' : treePath).replace(/^\/+|\/+$/g, '');
  const params = new URLSearchParams({
    recursive: String(Boolean(options.recursive)),
    limit: String(HF_TREE_PAGE_LIMIT),
  });
  return `https://huggingface.co/api/datasets/${repo.owner}/${repo.repo}/tree/${branch}/${encodeURI(cleanPath)}?${params.toString()}`;
}

/** True when a URL targets the Hugging Face Dataset Tree (directory listing) API. */
export function isHuggingFaceTreeUrl(url: string): boolean {
  return /^https:\/\/huggingface\.co\/api\/datasets\/[^/]+\/[^/]+\/tree\//i.test(String(url));
}

/**
 * Extracts the `rel="next"` target from an HTTP `Link` header.
 *
 * Hugging Face paginates large directory listings with a cursor and exposes the
 * follow-up URL through this header. Only same-origin (huggingface.co) targets
 * are accepted so a hostile header can never redirect the client elsewhere.
 */
export function parseNextLink(linkHeader: string | null | undefined): string | null {
  if (!linkHeader) return null;

  for (const part of String(linkHeader).split(/,(?=\s*<)/)) {
    const relMatch = /rel\s*=\s*"?([^";\s]+)"?/i.exec(part);
    if (!relMatch || relMatch[1].toLowerCase() !== 'next') continue;

    const urlMatch = /<([^>]+)>/.exec(part);
    if (!urlMatch) continue;

    try {
      const next = new URL(urlMatch[1]);
      if (!/^([a-z0-9-]+\.)*huggingface\.co$/i.test(next.hostname)) continue;
      return next.toString();
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Returns a list of candidate index URLs to try for a repository.
 *
 * The list depends on `repo.indexMode`:
 * - `'auto'` (default): static index candidates first, then the Tree API.
 * - `'static'`: static index candidates only (no Tree API request).
 * - `'tree'`: Tree API only (no `${path}/index.json` request, which is what
 *   caused guaranteed 404s for tree-only Hugging Face datasets).
 */
export function candidateIndexUrls(repo: RepositorySource): string[] {
  const path = (repo.path || '').replace(/^\/+|\/+$/g, '');
  const mode = repo.indexMode || 'auto';
  const urls: string[] = [];
  const seen = new Set<string>();

  const push = (file: string) => {
    const indexPath = path ? `${path}/${file}` : file;
    const url =
      repo.provider === 'huggingface'
        ? huggingfaceRawUrl(repo, indexPath)
        : repo.provider === 'github'
          ? githubRawUrl(repo, indexPath)
          : gitlabRawUrl(repo, indexPath);

    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  };

  // 1. Static index candidates (skipped entirely in tree-only mode so that
  //    repositories without a static index.json never receive a 404 request).
  if (mode !== 'tree') {
    // Explicit indexFile (if set)
    if (repo.indexFile) push(repo.indexFile);
    // Default: index.json
    push('index.json');

    // Heuristic: <path-basename>_index.json
    if (path) {
      const basename = path.split('/').pop() || '';
      const stem = basename.replace(/_(bibaz|database|archive|repo)$/, '');
      if (stem) push(`${stem}_index.json`);
    }
  }

  // 2. Hugging Face Tree API for dynamic directory indexing (skipped in static mode).
  if (repo.provider === 'huggingface' && mode !== 'static') {
    const treeUrl = huggingfaceTreeUrl(repo, path, { recursive: true });
    if (!seen.has(treeUrl)) {
      seen.add(treeUrl);
      urls.push(treeUrl);
    }
  }

  return urls;
}

/**
 * Build the raw URL for an arbitrary file listed in an index.json.
 */
export function fileUrl(repo: RepositorySource, filePath: string): string {
  const subPath = (repo.path || '').replace(/^\/+|\/+$/g, '');
  let cleanFile = filePath.replace(/^\/+/, '');

  // Avoid duplicate subPath prefixing
  if (subPath && (cleanFile === subPath || cleanFile.startsWith(`${subPath}/`))) {
    cleanFile = cleanFile.slice(subPath.length).replace(/^\/+/, '');
  }

  const fullPath = subPath ? (cleanFile ? `${subPath}/${cleanFile}` : subPath) : cleanFile;

  if (repo.provider === 'huggingface') {
    return huggingfaceRawUrl(repo, fullPath);
  }
  return repo.provider === 'github' ? githubRawUrl(repo, fullPath) : gitlabRawUrl(repo, fullPath);
}

/**
 * Determines whether a repository source is suitable for fetching a given filePath.
 *
 * Routing Rules:
 * 1. Disabled repositories are never suitable.
 * 2. Unconstrained repositories (supportedTypes is undefined or empty, e.g. user-added custom sources)
 *    accept all file paths, preserving user-customized repositories and routes.
 * 3. Repositories with explicit supportedTypes:
 *    - The file path is classified via classifyFile(filePath).
 *    - If repo.supportedTypes includes the classified section kind, it is suitable.
 *    - If repo.path is explicitly configured and aligns with the path prefix, it is also suitable.
 *    - Otherwise, returns false to avoid wasteful, failing requests.
 */
export function isRepoSuitableForPath(repo: RepositorySource, filePath: string): boolean {
  if (repo.enabled === false) return false;

  // Repositories without explicit supportedTypes (e.g. user-added custom repositories)
  // are unconstrained and allow any path.
  if (!repo.supportedTypes || repo.supportedTypes.length === 0) {
    return true;
  }

  const cleanFile = filePath.replace(/^\/+/, '');
  const repoPath = (repo.path || '').replace(/^\/+|\/+$/g, '');

  // If repo has an explicit path prefix matching filePath, treat as suitable
  if (repoPath && (cleanFile === repoPath || cleanFile.startsWith(`${repoPath}/`))) {
    return true;
  }

  // Detect explicit section domain classification
  const explicit = detectExplicitSection(filePath);

  // If the path is unclassified (no explicit domain markers), provide safe routing:
  // do NOT use the UI presentation fallback 'videos' as conclusive evidence to exclude sources.
  if (!explicit) {
    return true;
  }

  return repo.supportedTypes.includes(explicit);
}

/**
 * Filters an array of repository sources to only those that are suitable for the requested filePath.
 */
export function filterReposForPath(repos: RepositorySource[], filePath: string): RepositorySource[] {
  return repos.filter((r) => isRepoSuitableForPath(r, filePath));
}

