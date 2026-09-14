import type { RepositorySource } from '../types';
import { classifyFile } from './classifier';

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
  return true;
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

    // Migrate old github/gitlab defaults to Hugging Face if user had old stored defaults
    const hasOldDefault = validRepos.some((r) => r.owner === 'hozifa460' || r.owner === 'hazozahz-islamway');
    if (hasOldDefault) {
      saveRepositories(DEFAULT_REPOSITORIES);
      return DEFAULT_REPOSITORIES;
    }

    return validRepos;
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
 * Returns a list of candidate index URLs to try for a repository.
 */
export function candidateIndexUrls(repo: RepositorySource): string[] {
  const path = (repo.path || '').replace(/^\/+|\/+$/g, '');
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

  // 1. Explicit indexFile (if set)
  if (repo.indexFile) push(repo.indexFile);
  // 2. Default: index.json
  push('index.json');

  // 3. Hugging Face tree API for dynamic directory indexing
  if (repo.provider === 'huggingface') {
    const branch = repo.branch || 'main';
    const treePath = path ? `${path}` : '';
    const treeUrl = `https://huggingface.co/api/datasets/${repo.owner}/${repo.repo}/tree/${branch}/${encodeURI(treePath)}?recursive=true`;
    if (!seen.has(treeUrl)) {
      seen.add(treeUrl);
      urls.push(treeUrl);
    }
  }

  // 4. Heuristic: <path-basename>_index.json
  if (path) {
    const basename = path.split('/').pop() || '';
    const stem = basename.replace(/_(bibaz|database|archive|repo)$/, '');
    if (stem) push(`${stem}_index.json`);
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

  const section = classifyFile(filePath);
  return repo.supportedTypes.includes(section);
}

/**
 * Filters an array of repository sources to only those that are suitable for the requested filePath.
 */
export function filterReposForPath(repos: RepositorySource[], filePath: string): RepositorySource[] {
  return repos.filter((r) => isRepoSuitableForPath(r, filePath));
}

