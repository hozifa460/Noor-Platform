#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Repair v2 — strict prefix matching for canonical↔old alignment.
Replaces the fuzzy ±3 two-pointer (which false-positived on boilerplate-heavy
datasets like موسوعة الفتاوى). Strategy per dataset:
  - index old records by normalized-question prefix (first 60 chars)
  - for each canonical id, look up that exact prefix; accept only if found
  - else try reversed direction (old q prefix inside canonical q)
  - else fall back to canonical trimmed text (always title-consistent)
Then rewrite shards + index from scratch (same output format as v1).
"""
import json
import os
import re
import sys
import io
import hashlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.getcwd()
SHARDS_DIR = os.path.join(ROOT, 'public', 'data', 'shards')
OLD_DIR = os.path.join(ROOT, 'public', 'data', 'fatwa_answers_old')
NEW_DIR = os.path.join(ROOT, 'public', 'data', 'fatwa_answers_new2')

CATEGORIES = ['salah', 'zakah', 'muamalat', 'aqeedah', 'family', 'contemporary']
MAX_Q = 6000
MAX_A = 20000
SHARD_TARGET_BYTES = 60 * 1024


def log(m):
    print(m, flush=True)


AR_DIAC = re.compile(r'[\u064B-\u065F\u0670\u0640]')


def norm(s):
    if not s:
        return ''
    s = AR_DIAC.sub('', s)
    s = s.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    s = s.replace('ة', 'ه').replace('ى', 'ي').replace('ؤ', 'و').replace('ئ', 'ي')
    s = s.replace('_x000D_', ' ').replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
    s = re.sub(r'^(السؤال|سؤال|س)\s*[:：.]?\s*', '', s.strip())
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def shard_hash(fid):
    return hashlib.md5(fid.encode('utf-8')).hexdigest()[:8]


def main():
    log('1) canonical entries...')
    canon = {}
    for cat in CATEGORIES:
        with open(os.path.join(SHARDS_DIR, f'{cat}.json'), encoding='utf-8') as f:
            items = json.load(f)
        for it in items:
            cid = it.get('id')
            if cid:
                canon[cid] = it
    log(f'   {len(canon):,}')

    log('2) old records + prefix index per dataset...')
    with open(os.path.join(OLD_DIR, 'index.json'), encoding='utf-8') as f:
        old_index = json.load(f)
    by_ds = {}  # ds -> {num: (q,a)}
    shard_cache = {}
    for oid, h in old_index.items():
        m = re.match(r'^(hf-.+)-(\d+)$', oid)
        if not m:
            continue
        ds, num = m.group(1), int(m.group(2))
        if h not in shard_cache:
            try:
                with open(os.path.join(OLD_DIR, f'{h}.json'), encoding='utf-8') as f:
                    recs = json.load(f)
                shard_cache[h] = {r['id']: r for r in recs}
            except Exception:
                shard_cache[h] = {}
        rec = shard_cache[h].get(oid)
        if rec:
            by_ds.setdefault(ds, {})[num] = (rec.get('q') or '', rec.get('a') or '')
    shard_cache = None
    # prefix index: ds -> prefix60 -> num (first wins)
    prefix_idx = {}
    for ds, recs in by_ds.items():
        pidx = {}
        for num, (q, a) in recs.items():
            k = norm(q)[:60]
            if len(k) >= 25 and k not in pidx:
                pidx[k] = num
        prefix_idx[ds] = pidx
    log(f'   datasets: {len(by_ds)} | prefix keys total: {sum(len(p) for p in prefix_idx.values()):,}')

    log('3) strict matching...')
    final = {}
    st_full = st_fb = 0
    per_ds_stats = {}
    for cid, c in canon.items():
        m = re.match(r'^(hf-.+)-(\d+)$', cid)
        ds, num = m.group(1), int(m.group(2))
        q_canon = norm(c.get('question')) or norm(c.get('title'))
        k60 = q_canon[:60]
        got = None
        pidx = prefix_idx.get(ds)
        if pidx:
            hit = pidx.get(k60)
            if hit is None and len(k60) >= 25:
                # reversed: canonical prefix25 inside old? too fuzzy; skip.
                hit = None
            if hit is not None:
                got = by_ds[ds][hit]
        if got is not None:
            final[cid] = (got[0][:MAX_Q], got[1][:MAX_A])
            st_full += 1
            per_ds_stats[ds] = per_ds_stats.get(ds, [0, 0])
            per_ds_stats[ds][0] += 1
        else:
            q = c.get('question') or c.get('title') or ''
            a = c.get('answer') or ''
            final[cid] = (q[:MAX_Q], a[:MAX_A])
            st_fb += 1
            per_ds_stats[ds] = per_ds_stats.get(ds, [0, 0])
            per_ds_stats[ds][1] += 1

    for ds, (f_, b_) in sorted(per_ds_stats.items(), key=lambda x: -x[1][1]):
        if b_:
            log(f'   {ds}: full={f_:,} fallback={b_:,}')
    log(f'   TOTAL full={st_full:,} fallback={st_fb:,}')

    log('4) writing shards...')
    os.makedirs(NEW_DIR, exist_ok=True)
    new_shards = {}
    new_index = {}
    for cid, (q, a) in final.items():
        h = shard_hash(cid)
        new_index[cid] = h
        new_shards.setdefault(h, []).append({'id': cid, 'q': q, 'a': a})
    for h, items in new_shards.items():
        with open(os.path.join(NEW_DIR, f'{h}.json'), 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, separators=(',', ':'))
    tmp = os.path.join(NEW_DIR, 'index.json.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(new_index, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp, os.path.join(NEW_DIR, 'index.json'))
    log(f'   shards={len(new_shards):,} index={len(new_index):,} -> {NEW_DIR}')
    log('DONE')


if __name__ == '__main__':
    main()
