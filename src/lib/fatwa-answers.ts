'use client';

import { shardUrl } from './data-base';

/**
 * Fatwa Answer Shards client — v3 (direct hash lookup, zero index wait).
 *
 * Shard key = md5(fatwaId)[:8], computed locally in microseconds. So the
 * client can jump STRAIGHT to /data/fatwa_answers/{hash}.json (~2KB) without
 * ever downloading the 16MB index.json. This removes the single biggest
 * latency source when opening a fatwa.
 *
 * Fallbacks (in order, all silent):
 * 1. Direct hash shard  → 2. legacy index.json (lazy, only if #1 misses)
 *                        → 3. not found → honest placeholder in UI.
 *
 * Memory bounds: shard cache is LRU-capped; index is only loaded on demand.
 */

interface AnswerRecord {
  id: string;
  q: string;
  a: string;
}

export interface FatwaFullContent {
  question: string;
  answer: string;
  found: boolean;
}

const SHARD_MEM_MAX = 60;

const shardMemCache = new Map<string, Map<string, AnswerRecord>>();
const inflightShards = new Map<string, Promise<Map<string, AnswerRecord>>>();
const negativeCache = new Set<string>(); // ids proven absent (avoid refetch)

/** md5(id)[:8] — must match scripts/repair_answer_shard_ids_v2.py keying. */
export async function shardHashForId(id: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // WebCrypto has no MD5; use our own tiny MD5 implementation (fast, ~µs).
    return md5(id).slice(0, 8);
  }
  return md5(id).slice(0, 8);
}

/** Compact MD5 (UTF-8) — sufficient for shard keying, not for security. */
function md5(str: string): string {
  return md5bytes(utf8Encode(str));
}

function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i);
      c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function md5bytes(bytes: Uint8Array): string {
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = new Int32Array(64);
  for (let i = 0; i < 64; i++) K[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)) | 0;

  const origLen = bytes.length;
  const bitLen = origLen * 8;
  const withPadding = (((origLen + 8) >> 6) + 1) << 6;
  const msg = new Uint8Array(withPadding);
  msg.set(bytes);
  msg[origLen] = 0x80;
  // little-endian 64-bit length
  const dv = new DataView(msg.buffer);
  dv.setUint32(withPadding - 8, bitLen >>> 0, true);
  dv.setUint32(withPadding - 4, Math.floor(bitLen / 4294967296), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Int32Array(16);
  for (let off = 0; off < withPadding; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getInt32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const out = new DataView(new ArrayBuffer(16));
  out.setUint32(0, a0, true); out.setUint32(4, b0, true);
  out.setUint32(8, c0, true); out.setUint32(12, d0, true);
  let hex = '';
  for (let i = 0; i < 16; i++) hex += out.getUint8(i).toString(16).padStart(2, '0');
  return hex;
}

/** Resolves full Q/A content for a fatwa id.
 * Fast path only: direct hash shard (one ~2KB request, no index).
 * A miss returns "not found" immediately — no bulk download.
 */
async function fetchShard(hash: string): Promise<Map<string, AnswerRecord>> {
  const memo = shardMemCache.get(hash);
  if (memo) return memo;

  const inflight = inflightShards.get(hash);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const res = await fetch(shardUrl('fatwa_answers', hash));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = (await res.json()) as AnswerRecord[];
      const map = new Map<string, AnswerRecord>();
      for (const it of items) map.set(it.id, it);
      // LRU: refresh insertion order
      shardMemCache.delete(hash);
      shardMemCache.set(hash, map);
      if (shardMemCache.size > SHARD_MEM_MAX) {
        const firstKey = shardMemCache.keys().next().value;
        if (firstKey && firstKey !== hash) shardMemCache.delete(firstKey);
      }
      return map;
    } catch {
      const empty = new Map<string, AnswerRecord>();
      shardMemCache.set(hash, empty); // cache misses too (avoid hammering)
      return empty;
    } finally {
      inflightShards.delete(hash);
    }
  })();

  inflightShards.set(hash, p);
  return p;
}

function toContent(rec: AnswerRecord | undefined): FatwaFullContent {
  if (!rec) return { question: '', answer: '', found: false };
  return { question: rec.q || '', answer: rec.a || '', found: Boolean(rec.a || rec.q) };
}

/**
 * Resolves full Q/A content for a fatwa id.
 * Fast path: direct hash shard (one ~2KB request, no index).
 * Slow path: legacy index.json (only when the fast path misses).
 */
export async function getFatwaContent(id: string): Promise<FatwaFullContent> {
  if (!id) return { question: '', answer: '', found: false };
  if (negativeCache.has(id)) return { question: '', answer: '', found: false };

  // 1. Direct hash lookup
  const hash = await shardHashForId(id);
  const shard = await fetchShard(hash);
  const rec = shard.get(id);
  if (rec) return toContent(rec);

  // No legacy index fallback: the direct hash path is authoritative for the
  // shards we actually built. A miss means the fatwa has no full text here,
  // so we return "not found" immediately instead of downloading 16MB.
  negativeCache.add(id);
  return { question: '', answer: '', found: false };
}

/** Batch variant used by list views to hydrate visible cards. */
export async function getFatwaContentBatch(ids: string[]): Promise<Map<string, FatwaFullContent>> {
  const out = new Map<string, FatwaFullContent>();
  const pending = ids.filter((id) => id && !negativeCache.has(id));
  if (pending.length === 0) return out;

  // Direct-hash fetch for all pending ids in parallel
  const hashToIds = new Map<string, string[]>();
  for (const id of pending) {
    const h = await shardHashForId(id);
    const arr = hashToIds.get(h) || [];
    arr.push(id);
    hashToIds.set(h, arr);
  }

  await Promise.all(
    Array.from(hashToIds.entries()).map(async ([h, wanted]) => {
      const shard = await fetchShard(h);
      for (const id of wanted) {
        const rec = shard.get(id);
        if (rec) {
          out.set(id, toContent(rec));
        } else {
          out.set(id, { question: '', answer: '', found: false });
          negativeCache.add(id);
        }
      }
    })
  );

  return out;
  }

/**
 * Pre-warms shard fetches for ids about to be shown (called on hover /
 * after list render) so opening a card feels instant.
 */
export function prefetchFatwaContent(ids: string[]): void {
  for (const id of ids) {
    if (!id || negativeCache.has(id)) continue;
    void shardHashForId(id).then((h) => {
      if (!shardMemCache.has(h)) void fetchShard(h);
    });
  }
}

/** True when we have an answer entry for this id (direct hash lookup). */
export async function hasAnswerShardEntry(id: string): Promise<boolean> {
  const hash = await shardHashForId(id);
  const shard = await fetchShard(hash);
  return shard.has(id);
}
