import type { MediaItem, SectionKind, Sheikh } from '../types';
import { classifyFile, extractSheikhId, isMainCollectionFile, prettifySheikhName } from '../classifier';

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

function pickStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return v.split(/[,،]/).map((x) => x.trim()).filter(Boolean);
  }
  return [];
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
  let title = pickString(leaf.title) || 'بدون عنوان';
  const subtitle = pickString(leaf.subtitle);
  const emoji = pickString(leaf.emoji);
  let bookAuthor: string | undefined;

  // Real data uses youtube URLs in both audioUrl and videoUrl.
  // Detect youtube so we can use the YouTube embed player.
  const rawAudio = pickString(leaf.audioUrl) || pickString(leaf.audio);
  const rawVideo = pickString(leaf.videoUrl) || pickString(leaf.video) || pickString(leaf.mp4);
  const liveUrl = pickString(leaf.liveUrl) || pickString(leaf.hls) || pickString(leaf.stream);
  let pdfUrl = pickString(leaf.pdfUrl) || pickString(leaf.pdf);
  const imageUrl = pickString(leaf.imageUrl) || pickString(leaf.image) || pickString(leaf.thumbnail) || pickString(leaf.thumbnailUrl);

  // Extract PDF attachment from IslamHouse book schema
  if (!pdfUrl && Array.isArray(leaf.attachments)) {
    const pdfAtt = leaf.attachments.find(
      (a: unknown) =>
        a &&
        typeof a === 'object' &&
        ((a as { extension_type?: string }).extension_type === 'PDF' ||
          (a as { url?: string }).url?.toLowerCase().endsWith('.pdf'))
    ) as { url?: string; size?: string } | undefined;
    if (pdfAtt?.url) {
      pdfUrl = pdfAtt.url;
    }
  }

  // OpenITI classical book URI
  if (!pdfUrl && typeof leaf.uri === 'string' && leaf.uri) {
    pdfUrl = leaf.uri.startsWith('http') ? leaf.uri : `https://raw.githubusercontent.com/OpenITI/${leaf.uri}`;
  }

  // Format OpenITI classical titles and authors cleanly
  if (ctx.filePath.includes('openiti') || (typeof leaf.uri === 'string' && leaf.uri.includes('AH/'))) {
    if (title.includes('.')) {
      const parts = title.split('.');
      if (parts.length >= 2) {
        const rawAuthor = parts[0].replace(/^\d+/, '').replace(/([A-Z])/g, ' $1').trim();
        const rawBook = parts[1].replace(/([A-Z])/g, ' $1').trim();
        title = rawBook || parts[1];
        bookAuthor = rawAuthor || parts[0];
      }
    }
  }

  // Extract author from prepared_by or author field
  if (Array.isArray(leaf.prepared_by) && leaf.prepared_by.length > 0) {
    const authorObj = leaf.prepared_by.find(
      (p: unknown) => p && typeof p === 'object' && (p as { kind?: string }).kind === 'author'
    ) as { title?: string } | undefined;
    bookAuthor = authorObj?.title || (leaf.prepared_by[0] as { title?: string })?.title;
  } else if (typeof leaf.author === 'string' && leaf.author.trim()) {
    bookAuthor = leaf.author.trim();
  }

  const bookTags = [
    ...pickStringArray(leaf.tags),
    ...pickStringArray(leaf.category),
    ...pickStringArray(leaf.categories),
  ];

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

  const effectiveDescription =
    pickString(leaf.full_description) ||
    pickString(leaf.description) ||
    ctx.description;

  const item: MediaItem = {
    id: '',
    title,
    subtitle,
    emoji,
    description: effectiveDescription,
    sheikhId: ctx.sheikhId,
    sheikhName: bookAuthor || ctx.sheikhName,
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
    publishedAt: pickString(leaf.publishedAt) || pickString(leaf.date) || pickString(leaf.add_date),
    views: typeof leaf.views === 'number' ? leaf.views : undefined,
    tags: bookTags.length > 0 ? Array.from(new Set(bookTags)) : undefined,
    language: pickString(leaf.source_language) || pickString(leaf.language) || 'ar',
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
    const question = pickString(leaf.question) || pickString(leaf.cleaned_text);
    const answer = pickString(leaf.answer);
    const scholar = pickString(leaf.mufti_or_scholar) || pickString(leaf.scholar) || pickString(leaf.sheikh);
    const extraTags = [
      ...pickStringArray(leaf.categories),
      ...pickStringArray(leaf.keywords),
    ];

    if (scholar && (!item.sheikhName || item.sheikhName === prettifySheikhName(ctx.sheikhId))) {
      item.sheikhName = scholar;
    }

    if (extraTags.length > 0) {
      item.tags = Array.from(new Set([...(item.tags || []), ...extraTags]));
    }

    // Audio fatwa support
    if (leaf.audio && typeof leaf.audio === 'string' && leaf.audio.startsWith('http')) {
      item.audioUrl = leaf.audio;
    }

    // Use `question` as description if not set
    if (question && !item.description) {
      item.description = question;
    }
    // If title is default "بدون عنوان", prefer question first line
    if ((!item.title || item.title === 'بدون عنوان') && question) {
      item.title = question.split('\n')[0].slice(0, 200);
    }
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
