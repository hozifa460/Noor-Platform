import type { MediaItem, SectionKind, Sheikh } from './types';
import { classifyFile, extractSheikhId, isMainCollectionFile, prettifySheikhName } from './classifier';

/**
 * Hashes a string into a stable hex id (used for MediaItem.id).
 * (Simple FNV-1a — sufficient for client-side dedup.)
 */
export function hashId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function pickString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const filtered = v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
    return filtered.length > 0 ? filtered : undefined;
  }
  return undefined;
}

/**
 * Builds a single MediaItem from a "leaf" sub-item object (real data shape).
 * Returns null if the item has no playable media.
 */
function buildLeafItem(
  leaf: Record<string, unknown>,
  ctx: {
    sheikhId: string;
    sheikhName: string;
    section: SectionKind;
    filePath: string;
    repoId?: string;
    groupTitle?: string;
    description?: string;
  },
): MediaItem | null {
  const title = pickString(leaf.title) || 'بدون عنوان';
  const subtitle = pickString(leaf.subtitle);
  const emoji = pickString(leaf.emoji);

  // Real data uses youtube URLs in both audioUrl and videoUrl.
  // Detect youtube so we can use the YouTube embed player.
  const rawAudio = pickString(leaf.audioUrl) || pickString(leaf.audio);
  const rawVideo = pickString(leaf.videoUrl) || pickString(leaf.video) || pickString(leaf.mp4);
  const liveUrl = pickString(leaf.liveUrl) || pickString(leaf.hls) || pickString(leaf.stream);
  const pdfUrl = pickString(leaf.pdfUrl) || pickString(leaf.pdf);
  const imageUrl = pickString(leaf.imageUrl) || pickString(leaf.thumbnail) || pickString(leaf.thumbnailUrl);

  const videoSource = pickString(leaf.videoSource) || pickString(leaf.source);
  const mediaType = pickString(leaf.mediaType);

  // Promote a YouTube URL out of videoUrl/audioUrl into youtubeUrl.
  let youtubeUrl: string | undefined;
  let audioUrl = rawAudio;
  let videoUrl = rawVideo;

  const ytRegex = /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/i;
  if (rawVideo && ytRegex.test(rawVideo)) {
    youtubeUrl = rawVideo;
    videoUrl = undefined;
  }
  if (rawAudio && ytRegex.test(rawAudio) && !youtubeUrl) {
    youtubeUrl = rawAudio;
    audioUrl = undefined;
  }
  // Also detect "direct" videoSource but with archive.org mp4 → keep as videoUrl.

  const item: MediaItem = {
    id: '',
    title,
    subtitle,
    emoji,
    description: ctx.description,
    sheikhId: ctx.sheikhId,
    sheikhName: ctx.sheikhName,
    section: ctx.section,
    sourceFile: ctx.filePath,
    sourceRepoId: ctx.repoId,
    groupTitle: ctx.groupTitle,
    audioUrl,
    videoUrl,
    youtubeUrl,
    liveUrl,
    imageUrl,
    pdfUrl,
    videoSource,
    mediaType,
    duration: typeof leaf.duration === 'number' ? leaf.duration : undefined,
    publishedAt: pickString(leaf.publishedAt) || pickString(leaf.date),
    views: typeof leaf.views === 'number' ? leaf.views : undefined,
    tags: pickStringArray(leaf.tags),
    language: pickString(leaf.language) || 'ar',
  };

  // Stable id from URL + title to dedupe across mirrors.
  const dedupeKey = [
    item.audioUrl,
    item.videoUrl,
    item.youtubeUrl,
    item.liveUrl,
    item.pdfUrl,
    item.title,
    item.sheikhId,
  ]
    .filter(Boolean)
    .join('|');
  item.id = hashId(dedupeKey || `${ctx.filePath}:${Math.random()}`);

  // Fatwa items are TEXT-ONLY (question + answer, no media URLs).
  // They use the `question`/`answer` schema from the fatawa_bibaz files.
  // Don't filter them out just because they have no audio/video/PDF —
  // they're meant to be read, not played.
  if (ctx.section === 'fatwa') {
    const question = pickString(leaf.question);
    const answer = pickString(leaf.answer);
    // Use `question` as the description (long-form text) if no description set.
    if (question && !item.description) {
      item.description = question;
    }
    // If title is the default "بدون عنوان", prefer the question's first line.
    if ((!item.title || item.title === 'بدون عنوان') && question) {
      item.title = question.split('\n')[0].slice(0, 200);
    }
    // The `answer` becomes the body text shown when the user opens the fatwa.
    if (answer) {
      item.answer = answer;
    }
    return item;
  }

  // Skip items that have no playable media at all.
  if (!item.audioUrl && !item.videoUrl && !item.youtubeUrl && !item.liveUrl && !item.pdfUrl) {
    return null;
  }

  return item;
}

/**
 * Normalizes an arbitrary object parsed from a content JSON file into a list
 * of MediaItem records.
 *
 * Supports multiple shapes:
 *
 *  1. Real data (nested):
 *     {
 *       id, title, emoji, description, gradientColors, imageUrl,
 *       items: [ { title, subtitle, emoji, imageUrl, audioUrl, subItems: [ leaf ] } ]
 *     }
 *
 *  2. Flat list:  { items: [...] } or bare array
 *
 *  3. Single object: { title, url, ... }
 *
 * The function also extracts sheikh-level metadata (title, emoji,
 * gradientColors, description, imageUrl) for use in Sheikh profiles.
 */
export interface NormalizeResult {
  items: MediaItem[];
  sheikhMeta: {
    title?: string;
    description?: string;
    emoji?: string;
    gradientColors?: string[];
    imageUrl?: string;
  };
}

export function normalizeContentFile(
  raw: unknown,
  filePath: string,
  repoId?: string,
): NormalizeResult {
  const section = classifyFile(filePath);
  const sheikhId = extractSheikhId(filePath);

  const sheikhMeta: NormalizeResult['sheikhMeta'] = {};

  // If raw is a single object, capture sheikh-level metadata first.
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    sheikhMeta.title = pickString(obj.title);
    sheikhMeta.description = pickString(obj.description) || pickString(obj.bio);
    sheikhMeta.emoji = pickString(obj.emoji);
    sheikhMeta.imageUrl = pickString(obj.imageUrl) || pickString(obj.avatarUrl);
    if (Array.isArray(obj.gradientColors)) {
      sheikhMeta.gradientColors = (obj.gradientColors as unknown[])
        .map((c) => (typeof c === 'string' ? c : ''))
        .filter(Boolean);
      if (sheikhMeta.gradientColors.length === 0) delete sheikhMeta.gradientColors;
    }
  }

  // Find candidate item arrays.
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.videos)) items = obj.videos;
    else if (Array.isArray(obj.shorts)) items = obj.shorts;
    else if (Array.isArray(obj.live)) items = obj.live;
    else if (Array.isArray(obj.entries)) items = obj.entries;
    else if (Array.isArray(obj.data)) items = obj.data;
    else {
      // Single object treated as one item (rare).
      items = [obj];
    }
  }

  const sheikhName = sheikhMeta.title || prettifySheikhName(sheikhId);
  const results: MediaItem[] = [];

  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;

    // Detect nested "subItems" — the real data shape.
    const hasSubItems = Array.isArray(e.subItems) && e.subItems.length > 0;

    if (hasSubItems) {
      const groupTitle = pickString(e.title) || pickString(e.name);
      const groupDescription = pickString(e.description);
      const groupEmoji = pickString(e.emoji);
      for (const sub of e.subItems as unknown[]) {
        if (!sub || typeof sub !== 'object') continue;
        const leaf = sub as Record<string, unknown>;
        const item = buildLeafItem(leaf, {
          sheikhId,
          sheikhName,
          section,
          filePath,
          repoId,
          groupTitle,
          description: groupDescription,
        });
        if (item) {
          // Inherit group emoji if leaf has none.
          if (!item.emoji && groupEmoji) item.emoji = groupEmoji;
          results.push(item);
        }
      }
    } else {
      // Flat leaf item.
      const item = buildLeafItem(e, {
        sheikhId,
        sheikhName,
        section,
        filePath,
        repoId,
      });
      if (item) results.push(item);
    }
  }

  return { items: results, sheikhMeta };
}

/**
 * Builds a map of SheikhId -> Sheikh by grouping items by their sheikhId.
 * Merges all sections automatically and tracks sheikh-level metadata.
 */
export function buildSheikhs(
  items: MediaItem[],
  sheikhMetaByFile?: Map<string, NormalizeResult['sheikhMeta']>,
): Map<string, Sheikh> {
  const map = new Map<string, Sheikh>();

  for (const item of items) {
    const id = item.sheikhId || 'unknown';
    let sheikh = map.get(id);
    if (!sheikh) {
      sheikh = {
        id,
        name: item.sheikhName || prettifySheikhName(id),
        sections: {
          videos: [],
          shorts: [],
          live: [],
          radio: [],
          fatwa: [],
          books: [],
          articles: [],
          main: [],
        },
        totalItems: 0,
        sourceFiles: [],
        isMainCollection: false,
      };
      map.set(id, sheikh);
    }

    // Apply sheikh-level metadata from any source file in this group.
    // PRIORITY: files with auto-synced suffixes (.videos/.live/.shorts/.radio)
    // take precedence over main collection files (1_*.json, *_1.json, *.json)
    // because the auto-synced files are updated hourly from YouTube and
    // always have the freshest channel name.
    if (sheikhMetaByFile && item.sourceFile) {
      const meta = sheikhMetaByFile.get(item.sourceFile);
      if (meta) {
        const isAutoSynced = /\.(videos|live|shorts|radio|fatwa|books|articles)\.json$/i.test(item.sourceFile);
        const isMainFile = !isAutoSynced && (
          /^1_.+\.json$/i.test(item.sourceFile) ||
          /_1\.json$/i.test(item.sourceFile) ||
          /^[^/]+\/[^/]+\.json$/i.test(item.sourceFile)
        );

        // Name: auto-synced files always win. Main files only set the name
        // if no auto-synced file has set one yet.
        if (meta.title) {
          if (isAutoSynced) {
            sheikh.name = meta.title;
          } else if (!sheikh.name || sheikh.name === prettifySheikhName(id)) {
            sheikh.name = meta.title;
          }
        }

        // Description/emoji/image/gradient: auto-synced files win, otherwise
        // first-seen wins (existing behavior).
        if (meta.description && (!sheikh.bio || isAutoSynced)) sheikh.bio = meta.description;
        if (meta.emoji && (!sheikh.emoji || isAutoSynced)) sheikh.emoji = meta.emoji;
        if (meta.imageUrl && (!sheikh.avatarUrl || isAutoSynced)) sheikh.avatarUrl = meta.imageUrl;
        if (meta.gradientColors && (!sheikh.gradientColors || isAutoSynced)) sheikh.gradientColors = meta.gradientColors;

        // Mark as main collection if any source file is a main collection file.
        if (isMainFile) sheikh.isMainCollection = true;
      }
    }

    const section = item.section as SectionKind;
    if (Array.isArray(sheikh.sections[section])) {
      sheikh.sections[section].push(item);
    } else {
      sheikh.sections.videos.push(item);
    }
    sheikh.totalItems += 1;
    if (item.sourceFile && !sheikh.sourceFiles.includes(item.sourceFile)) {
      sheikh.sourceFiles.push(item.sourceFile);
      if (isMainCollectionFile(item.sourceFile)) sheikh.isMainCollection = true;
    }
  }

  return map;
}

/**
 * Deduplicates a list of media items by id, preserving the first occurrence.
 */
export function dedupeItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}
