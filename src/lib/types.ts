/**
 * Core type system for the Islamic streaming platform.
 * These types model the JSON schema loaded from GitHub/GitLab repositories.
 */

/** Supported section kinds derived from the file classification rules. */
export type SectionKind =
  | 'videos'
  | 'shorts'
  | 'live'
  | 'radio'
  | 'fatwa'
  | 'books'
  | 'articles'
  | 'main'; // 1_*.json → Main Sheikh collection

/** A single index entry inside an index.json file. */
export interface IndexEntry {
  /** Relative path inside the repo, e.g. "iyad_alqunibi/iyad_alqunibi.videos.json". */
  path: string;
}

/** Top-level shape of every index.json file. */
export interface IndexFile {
  files: string[];
  /** Optional display name for the source repo. */
  name?: string;
  /** Optional base URL hint (used when index file references absolute paths). */
  baseUrl?: string;
}

/** A repository source (GitHub or GitLab). */
export interface RepositorySource {
  /** Stable id used in caches and logs. */
  id: string;
  /** 'github' | 'gitlab' */
  provider: 'github' | 'gitlab';
  /** Owner (GitHub user/org or GitLab namespace). */
  owner: string;
  /** Repository name. */
  repo: string;
  /** Branch/tag/commit. Defaults to 'main'. */
  branch?: string;
  /** Subdirectory inside the repo where index.json lives. */
  path?: string;
  /**
   * Index file name within the repo path. Defaults to 'index.json'.
   * Some repos use a different name (e.g. 'fatawa_index.json' for the
   * fatwa archive repo). When unspecified, the fetcher tries:
   *   1. <path>/index.json
   *   2. <path>/<basename>_index.json (e.g. fatawa_bibaz/fatawa_index.json)
   */
  indexFile?: string;
  /** True if this is the primary source for fallback ordering. */
  primary?: boolean;
  /** True if this source is currently enabled. */
  enabled?: boolean;
}

/** Media item shared by every section. */
export interface MediaItem {
  /** Stable unique id (hash of url+title). */
  id: string;
  /** Arabic title. */
  title: string;
  /** Optional secondary title (transliteration / English). */
  subtitle?: string;
  /** Optional emoji icon (used when no imageUrl is provided). */
  emoji?: string;
  /** Description (can include Arabic + HTML-ish breaks). */
  description?: string;
  /** Sheikh id (folder name). */
  sheikhId?: string;
  /** Sheikh display name. */
  sheikhName?: string;
  /** Section this item belongs to (derived from source file). */
  section: SectionKind;
  /** Source JSON file path. */
  sourceFile?: string;
  /** Original repo id. */
  sourceRepoId?: string;
  /** Optional group/playlist title (from items[].title in nested structure). */
  groupTitle?: string;

  // Media URLs (any combination)
  audioUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  pdfUrl?: string;

  /** Source kind: youtube, direct, hls, etc. (from videoSource field) */
  videoSource?: string;
  /** Media type hint from data: both, video, audio */
  mediaType?: string;

  // Optional metadata
  duration?: number; // seconds
  publishedAt?: string; // ISO
  views?: number;
  tags?: string[];
  language?: string;

  /**
   * Live broadcast status. Computed at runtime for items in the `live` section:
   *   - `'now'`    — currently broadcasting (publishedAt within last 4 hours)
   *   - `'ended'`  — past broadcast (publishedAt older than 4 hours, or explicit ended signal)
   *   - `undefined` — not a live item, or unknown
   *
   * Used to split the live section into "مباشر الآن" (live now) vs "بثوث سابقة" (past broadcasts).
   */
  liveStatus?: 'now' | 'ended';

  /**
   * Fatwa-specific: the answer text (long-form). Only set for items in the
   * `fatwa` section. Stored separately from `description` (which holds the
   * question) so the UI can render them with different styling.
   */
  answer?: string;
}

/** A Sheikh profile dynamically built from folder grouping. */
export interface Sheikh {
  /** Folder name used as Sheikh id. */
  id: string;
  /** Display name (best-effort from files, fallback to prettified id). */
  name: string;
  /** Optional bio / description. */
  bio?: string;
  /** Optional avatar image URL. */
  avatarUrl?: string;
  /** Optional emoji icon (from real data — used as visual fallback). */
  emoji?: string;
  /** Optional gradient colors (CSS strings) — used as avatar/thumbnail fallback. */
  gradientColors?: string[];
  /** All media items grouped by section. */
  sections: Record<SectionKind, MediaItem[]>;
  /** Total item count (helper). */
  totalItems: number;
  /** True if any file is `1_*.json` (main collection marker). */
  isMainCollection?: boolean;
  /** List of source files merged into this sheikh. */
  sourceFiles: string[];
}

/** A view in the single-page navigation. */
export type ViewKind =
  | 'home'
  | 'sheikhs'
  | 'videos'
  | 'shorts'
  | 'live'
  | 'radio'
  | 'fatwa'
  | 'books'
  | 'articles'
  | 'favorites'
  | 'history'
  | 'downloads'
  | 'settings'
  | 'search'
  | 'sheikh';

/** Currently active view state. */
export interface ViewState {
  view: ViewKind;
  /** When view === 'sheikh', the active sheikh id. */
  sheikhId?: string;
  /** When view === 'search', the active query. */
  searchQuery?: string;
  /** Optional section filter applied to a view. */
  section?: SectionKind;
}

/** A media playback session used for "Continue Watching". */
export interface PlaybackSession {
  itemId: string;
  position: number; // seconds
  duration?: number; // seconds
  updatedAt: number; // epoch ms
}

/** A favorite record. */
export interface FavoriteRecord {
  itemId: string;
  addedAt: number;
}

/** A history record. */
export interface HistoryRecord {
  itemId: string;
  watchedAt: number;
  position?: number;
  duration?: number;
}

/** A downloaded item (offline). */
export interface DownloadRecord {
  itemId: string;
  url: string;
  blobKey: string; // IndexedDB key
  size: number;
  addedAt: number;
  progress: number; // 0..1
}

/** App settings. */
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';
  rtl: boolean;
  autoSync: boolean;
  syncIntervalMin: number;
  prefetch: boolean;
  dataSaver: boolean;
  defaultQuality: 'auto' | 'low' | 'high';
}
