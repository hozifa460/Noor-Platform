/**
 * Viewer Settings — persists user preferences in localStorage.
 *
 * Stores ONLY lightweight settings (no binary data, no large blobs):
 *   - Last opened book (slug)
 *   - Preferred view mode (single/continuous/spread)
 *   - Preferred reading mode (light/dark/sepia)
 *   - Zoom level
 *   - Sidebar open/closed state
 *   - High contrast mode
 *   - Large interface mode
 *
 * Heavy data (bookmarks, notes, highlights, cached pages) goes to IndexedDB.
 */

const SETTINGS_KEY = 'noor-pdf-settings';

export interface ViewerSettings {
  lastBookSlug?: string;
  viewMode: 'single' | 'continuous' | 'spread';
  readingMode: 'light' | 'dark' | 'sepia';
  zoom: number;
  sidebarOpen: boolean;
  highContrast: boolean;
  largeInterface: boolean;
  focusMode: boolean; // auto-hide controls while reading
}

const DEFAULT_SETTINGS: ViewerSettings = {
  viewMode: 'continuous',
  readingMode: 'light',
  zoom: 1.2,
  sidebarOpen: false,
  highContrast: false,
  largeInterface: false,
  focusMode: false,
};

/**
 * Load settings from localStorage. Returns defaults if not set.
 */
export function loadSettings(): ViewerSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to localStorage. Merges with existing settings.
 */
export function saveSettings(settings: Partial<ViewerSettings>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadSettings();
    const next = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

/**
 * Save the last opened book slug so the user can resume.
 */
export function saveLastBook(slug: string): void {
  saveSettings({ lastBookSlug: slug });
}

/**
 * Per-book settings (zoom + reading mode + view mode per book).
 * Stored as a map in localStorage.
 */
const PER_BOOK_KEY = 'noor-pdf-per-book';

interface PerBookSettings {
  [bookSlug: string]: {
    zoom?: number;
    viewMode?: ViewerSettings['viewMode'];
    readingMode?: ViewerSettings['readingMode'];
    lastPage?: number;
  };
}

export function loadPerBookSettings(slug: string): Partial<ViewerSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PER_BOOK_KEY);
    if (!raw) return {};
    const all: PerBookSettings = JSON.parse(raw);
    return all[slug] || {};
  } catch {
    return {};
  }
}

export function savePerBookSettings(
  slug: string,
  settings: Partial<ViewerSettings> & { lastPage?: number },
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PER_BOOK_KEY);
    const all: PerBookSettings = raw ? JSON.parse(raw) : {};
    all[slug] = { ...all[slug], ...settings };
    localStorage.setItem(PER_BOOK_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
