#!/usr/bin/env python3
"""
Noor Platform — Answer Shards ID Re-alignment (Phase 1.1 fix)
=============================================================
PROBLEM: build_fatwa_answer_shards.py numbered records 1..N per file, while the
canonical browse/shard indexes (build_full_300k_indexer.mjs) number by RAW
position 0..N-1 and SKIP records with empty/short/duplicate titles WITHOUT
consuming an index. Result: every id pointed at the wrong record (off-by-one
or more) → titles didn't match their Q/A text.

FIX STRATEGY (no re-download — all local):
1. For each source file, re-walk records in raw order applying the EXACT legacy
   rule (normalizeTitle → length>=6 → dedupe by seenTitles) to compute the
   canonical id for every accepted record.
2. Build old_id → (new_id, q, a) mapping. Records never accepted by the legacy
   rule keep no canonical id — they are unreachable from the UI anyway.
3. Rewrite every shard file replacing ids, then rebuild index.json.
   Shards are keyed by md5(id)[:8] — new ids mean new shard keys, so we
   regenerate all shard files from the in-memory record set.
4. Delete orphaned shard files (old hashes no longer referenced).

Run:  python scripts/realign_answer_shard_ids.py
"""
import json
import os
import re
import sys
import io
import hashlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

OUT_DIR = os.path.join('public', 'data', 'fatwa_answers')

# Same file set as build_fatwa_answer_shards.py (order matters for nothing here;
# ids are per-file so cross-file order is irrelevant).
FATWA_FILES = [
    'fatawa/fatawa_01_1.json',
    'fatawa/fatawa_02_2.json',
    'fatawa/fatawa_Islamic_Q_and_A_1.json',
    'fatawa/fatawa_Islamic_Q_and_A_2.json',
    'fatawa/fatawa_binbaz.json',
    'fatawa/fatawa_islamqa1.json',
    'fatawaa_aljamie_alkabir.json',
    'fatawa/islamhouse_fatwa_ar.json',
    'fatawa/islamweb_fatwa.json',
    'fatawa/nur_ealaa_aldarb1.json',
    'fatawa/nur_ealaa_aldarb2.json',
    'fatawa/nur_ealaa_aldarb3.json',
    'fatawa/فتاوى_JSON/أبحاث_وأحكام_فقهية.json',
    'fatawa/فتاوى_JSON/فتاوى_إسلام_أونلاين.json',
    'fatawa/فتاوى_JSON/فتاوى_إسلام_سؤال_وجواب.json',
    'fatawa/فتاوى_JSON/فتاوى_إسلام_ويب.json',
    'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_أركان_الإسلام.json',
    'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_قسم_ابن_باز.json',
    'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_قسم_الفوزان.json',
    'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_قسم_المفتي.json',
    'fatawa/فتاوى_JSON/فتاوى_الإفتاء_السعودية_نور_على_الدرب.json',
    'fatawa/فتاوى_JSON/فتاوى_الشيخ_ابن_باز.json',
    'fatawa/فتاوى_JSON/فتاوى_الشيخ_صالح_الفوزان.json',
    'fatawa/فتاوى_JSON/فتاوى_الشيخ_صالح_بن_حميد.json',
    'fatawa/فتاوى_JSON/فتاوى_الشيخ_عبدالعزيز_آل_الشيخ.json',
    'fatawa/فتاوى_JSON/فتاوى_الشيخ_عبدالله_المنيع.json',
    'fatawa/فتاوى_JSON/فتاوى_الشيخ_محمد_بن_عثيمين.json',
    'fatawa/فتاوى_JSON/فتاوى_اللجنة_الدائمة_للإفتاء_السعودية.json',
    'fatawa/فتاوى_JSON/فتاوى_دار_الإفتاء_الأردنية.json',
    'fatawa/فتاوى_JSON/فتاوى_دار_الإفتاء_المصرية.json',
    'fatawa/فتاوى_JSON/موسوعة_الفتاوى_الجزء_الأول.json',
    'fatawa/فتاوى_JSON/موسوعة_الفتاوى_الجزء_الثاني.json',
]

MAX_QUESTION_CHARS = 6_000
MAX_ANSWER_CHARS = 20_000
SHARD_TARGET_BYTES = 60 * 1024


def log(m):
    print(m, flush=True)


def normalize_title(t):
    if not t or not isinstance(t, str):
        return ''
    t = re.sub(r'^س:\s*', '', t)
    t = re.sub(r'^سؤال:\s*', '', t)
    t = re.sub(r'^السؤال:\s*', '', t)
    t = re.sub(r'^فتوى رقم\s*\d+\s*:\s*', '', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def parse_records(path):
    """Yield dicts from a JSON array or JSONL file (memory-efficient for arrays)."""
    with open(path, encoding='utf-8') as f:
        head = f.read(4096).lstrip()
        f.seek(0)
    if head.startswith('['):
        # Stream-split the array on object boundaries
        decoder = json.JSONDecoder()
        buf = ''
        with open(path, encoding='utf-8') as f:
            # skip up to first '['
            chunk = f.read(1)
            while chunk and chunk != '[':
                chunk = f.read(1)
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                buf += chunk
                while True:
                    buf = buf.lstrip()
                    if not buf:
                        break
                    if buf[0] == ']':
                        buf = ''
                        break
                    if buf[0] == ',':
                        buf = buf[1:]
                        continue
                    try:
                        obj, end = decoder.raw_decode(buf)
                        if isinstance(obj, dict):
                            yield obj
                        buf = buf[end:]
                    except json.JSONDecodeError:
                        break  # need more data
    else:
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or not line.startswith('{'):
                    continue
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict):
                        yield obj
                except Exception:
                    continue


def strip_html(s):
    if not s:
        return ''
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.I)
    s = re.sub(r'</p\s*>', '\n\n', s, flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    s = (s.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<')
          .replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
          .replace('_x000D_', ' ').replace('\r', ''))
    return s.strip()


def extract_fields(rec):
    def g(*names, default=''):
        for nm in names:
            v = rec.get(nm)
            if v and isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, list) and v:
                joined = ', '.join(str(x) for x in v if x)
                if joined.strip():
                    return joined.strip()
        return default

    title = g('title', 'Title', 'question')
    question = g('question', 'Question', 'description', 'body', default=title[:300])
    answer = g('answer', 'Answer', 'reply', 'fatwa', 'full_description', 'cleaned_text', 'content')
    return (
        strip_html(title)[:400],
        strip_html(question)[:MAX_QUESTION_CHARS],
        strip_html(answer)[:MAX_ANSWER_CHARS],
    )


def shard_hash_for_id(fid):
    return hashlib.md5(fid.encode('utf-8')).hexdigest()[:8]


def main():
    # ── Pass 1: build old_id → new canonical record ──────────────────────
    # The old shards numbered ACCEPTED records 1..N per file (skipping nothing).
    # The legacy rule numbers RAW positions and skips bad records. We replay the
    # legacy rule and simultaneously count accepted-order to reproduce the old id.
    id_map = {}        # old_id -> (new_id, q, a)
    total_mapped = 0
    total_unmatched = 0

    for k, rel in enumerate(FATWA_FILES, 1):
        local = os.path.join('.fatwa-src-cache', re.sub(r'[^\w.\-\u0600-\u06FF]', '_', rel))
        if not os.path.exists(local):
            log(f'[{k}/{len(FATWA_FILES)}] MISSING cache: {rel}')
            continue
        dkey = os.path.basename(rel)
        dkey = re.sub(r'\.(json|xml)$', '', dkey, flags=re.I)

        seen_titles = set()
        accepted_counter = 0   # 1..N over accepted records (old scheme)
        file_mapped = 0

        for raw_idx, rec in enumerate(parse_records(local)):
            title, q, a = extract_fields(rec)
            norm_title = normalize_title(title or q)
            if not norm_title or len(norm_title) < 6:
                continue
            if norm_title in seen_titles:
                continue
            seen_titles.add(norm_title)

            old_id = f'hf-{dkey}-{accepted_counter + 1}'  # old scheme: 1-based accepted
            accepted_counter += 1
            new_id = f'hf-{dkey}-{raw_idx}'               # legacy scheme: 0-based raw
            id_map[old_id] = (new_id, q, a)
            file_mapped += 1

        total_mapped += file_mapped
        log(f'[{k}/{len(FATWA_FILES)}] {dkey}: {file_mapped:,} canonical ids')

    log(f'\nTotal canonical mappings: {total_mapped:,}')

    # ── Pass 2: read ALL existing shard files, remap, regroup by new hash ─
    new_shards = {}     # new_hash -> list[rec]
    new_index = {}      # new_id -> new_hash
    seen_old_ids = set()
    shard_files = [f for f in os.listdir(OUT_DIR) if f.endswith('.json') and f != 'index.json']
    log(f'Reading {len(shard_files):,} existing shard files...')

    for si, fname in enumerate(shard_files):
        if si % 50000 == 0:
            log(f'  ...{si:,}/{len(shard_files):,}')
        with open(os.path.join(OUT_DIR, fname), encoding='utf-8') as f:
            try:
                recs = json.load(f)
            except Exception:
                continue
        for rec in recs:
            old_id = rec.get('id')
            seen_old_ids.add(old_id)
            mapped = id_map.get(old_id)
            if not mapped:
                total_unmatched += 1
                continue
            new_id, q, a = mapped
            # Prefer the richer text from the old record (identical content anyway)
            nq = rec.get('q') or q
            na = rec.get('a') or a
            h = shard_hash_for_id(new_id)
            new_index[new_id] = h
            new_shards.setdefault(h, []).append({'id': new_id, 'q': nq, 'a': na})

    log(f'Old ids seen in shards: {len(seen_old_ids):,} | unmapped (dropped): {total_unmatched:,}')

    # ── Pass 3: write new shard files atomically-ish ──────────────────────
    log(f'Writing {len(new_shards):,} new shard files...')
    for h, items in new_shards.items():
        with open(os.path.join(OUT_DIR, f'{h}.json'), 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, separators=(',', ':'))

    # index.json
    tmp = os.path.join(OUT_DIR, 'index.json.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(new_index, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, os.path.join(OUT_DIR, 'index.json'))
    log(f'index.json rewritten: {len(new_index):,} entries')

    # ── Pass 4: delete orphaned shard files (old hashes not reused) ───────
    valid = set(new_shards.keys())
    removed = 0
    for fname in shard_files:
        h = fname[:-5]
        if h not in valid:
            os.remove(os.path.join(OUT_DIR, fname))
            removed += 1
    log(f'Orphaned shard files removed: {removed:,}')
    log('DONE')


if __name__ == '__main__':
    main()
