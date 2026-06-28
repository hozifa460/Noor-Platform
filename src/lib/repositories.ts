import type { RepositorySource } from './types';

/**
 * Default real repository sources.
 *
 * Source 1 (GitHub):  hozifa460/fatawa_database — radio_database/index.json
 *                    (videos / shorts / live / main sheikh collections)
 * Source 2 (GitLab):  hazozahz-islamway/hazozahz-islamway — radio_islam/index.json
 *                    (mirror of source 1, plus a few extra sheikhs)
 * Source 3 (GitHub):  hozifa460/fatawa_database — fatawa_bibaz/index.json
 *                    (87K+ fatwas across 12 files: binbaz, islamqa, islamweb,
 *                     othaimeen, nur_ealaa_aldarb, etc.)
 *
 * All repos are merged into a single virtual database. The fatwa store
 * discovers fatwa files from source 3 (and any other repo whose files
 * classify as `fatwa`).
 */
export const DEFAULT_REPOSITORIES: RepositorySource[] = [
  {
    id: 'github-fatawa',
    provider: 'github',
    owner: 'hozifa460',
    repo: 'fatawa_database',
    branch: 'main',
    // Subdirectory inside the repo where index.json lives.
    path: 'radio_database',
    primary: true,
    enabled: true,
  },
  {
    id: 'gitlab-islamway',
    provider: 'gitlab',
    owner: 'hazozahz-islamway',
    repo: 'hazozahz-islamway',
    branch: 'main',
    // Subdirectory inside the repo where index.json lives.
    path: 'radio_islam',
    primary: false,
    enabled: true,
  },
  {
    id: 'github-fatwa-archive',
    provider: 'github',
    owner: 'hozifa460',
    repo: 'fatawa_database',
    branch: 'main',
    // Subdirectory inside the repo where the fatwa index.json lives.
    path: 'fatawa_bibaz',
    primary: false, // Not a mirror — a distinct source for fatwa content.
    enabled: true,
  },
];

/** Local storage key for user-edited repository config. */
export const REPOS_STORAGE_KEY = 'isp.repositories';

/** Load repositories from localStorage (user may edit) or fallback to defaults. */
export function loadRepositories(): RepositorySource[] {
  if (typeof window === 'undefined') return DEFAULT_REPOSITORIES;
  try {
    const raw = window.localStorage.getItem(REPOS_STORAGE_KEY);
    if (!raw) return DEFAULT_REPOSITORIES;
    const parsed = JSON.parse(raw) as RepositorySource[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_REPOSITORIES;
    return parsed;
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

/** Build the raw URL for a file in a GitHub repository (raw.githubusercontent.com). */
export function githubRawUrl(repo: RepositorySource, filePath: string): string {
  const branch = repo.branch || 'main';
  const cleanPath = filePath.replace(/^\/+/, '');
  // raw.githubusercontent.com/:owner/:repo/:branch/:path
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${cleanPath}`;
}

/**
 * Build the raw URL for a file in a GitLab repository.
 *
 * GitLab's raw endpoint doesn't send CORS headers, so the browser cannot
 * fetch it directly. We route through our /api/proxy/gitlab endpoint which
 * fetches server-side and re-serves with permissive CORS.
 */
export function gitlabRawUrl(repo: RepositorySource, filePath: string): string {
  const branch = repo.branch || 'main';
  const cleanPath = filePath.replace(/^\/+/, '');
  // Upstream URL we will fetch via the proxy.
  const upstream = `https://gitlab.com/${repo.owner}/${repo.repo}/-/raw/${branch}/${cleanPath}`;
  return `/api/proxy/gitlab?url=${encodeURIComponent(upstream)}`;
}

/**
 * Build the raw URL for the index.json in a repository.
 * The index lives at <repo.path>/<indexFile>.
 *
 * If `repo.indexFile` is set explicitly, only that filename is used.
 * Otherwise the function returns the URL for `index.json` — callers that
 * want auto-discovery of alternate index filenames (e.g. `fatawa_index.json`)
 * should use `candidateIndexUrls()` instead.
 *
 * Note: this calls githubRawUrl/gitlabRawUrl directly (NOT fileUrl) to avoid
 * double-prepending the subdirectory.
 */
export function indexUrl(repo: RepositorySource): string {
  const path = (repo.path || '').replace(/^\/+|\/+$/g, '');
  const indexFile = repo.indexFile || 'index.json';
  const indexPath = path ? `${path}/${indexFile}` : indexFile;
  return repo.provider === 'github' ? githubRawUrl(repo, indexPath) : gitlabRawUrl(repo, indexPath);
}

/**
 * Returns a list of candidate index URLs to try for a repository.
 *
 * Most repos use `<path>/index.json`, but some use a custom name like
 * `fatawa_bibaz/fatawa_index.json`. This function returns both candidates
 * (custom indexFile first if set, then `index.json`, then the
 * `<basename>_index.json` pattern) so the fetcher can try them in order.
 *
 * The fetcher tries each URL in order and uses the first one that returns
 * a valid JSON response.
 */
export function candidateIndexUrls(repo: RepositorySource): string[] {
  const path = (repo.path || '').replace(/^\/+|\/+$/g, '');
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (file: string) => {
    const indexPath = path ? `${path}/${file}` : file;
    const url = repo.provider === 'github' ? githubRawUrl(repo, indexPath) : gitlabRawUrl(repo, indexPath);
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  };
  // 1. Explicit indexFile (if set)
  if (repo.indexFile) push(repo.indexFile);
  // 2. Default: index.json
  push('index.json');
  // 3. Heuristic: <path-basename>_index.json (e.g. fatawa_bibaz → fatawa_index.json)
  if (path) {
    const basename = path.split('/').pop() || '';
    // Strip common suffixes like "_bibaz", "_database", etc.
    const stem = basename.replace(/_(bibaz|database|archive|repo)$/, '');
    if (stem) push(`${stem}_index.json`);
  }
  return urls;
}

/**
 * Build the raw URL for an arbitrary file listed in an index.json.
 *
 * File paths in index.json are relative to the repo's `path` subdirectory
 * (e.g. "menshawy/1_menshawy.json" is relative to "radio_database/").
 * This function prepends the subdirectory to construct the full path.
 */
export function fileUrl(repo: RepositorySource, filePath: string): string {
  const subPath = (repo.path || '').replace(/^\/+|\/+$/g, '');
  const cleanFile = filePath.replace(/^\/+/, '');
  const fullPath = subPath ? `${subPath}/${cleanFile}` : cleanFile;
  return repo.provider === 'github' ? githubRawUrl(repo, fullPath) : gitlabRawUrl(repo, fullPath);
}
