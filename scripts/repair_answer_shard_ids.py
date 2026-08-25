#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Answer Shard ID Repair (fully local, no downloads)
==================================================================
BUG: build_fatwa_answer_shards.py assigned ids by RAW record position (1-based,
skipping only empty title+q), while the canonical browse index
(build_full_300k_indexer.mjs) assigns ids by raw position (0-based) but SKIPS
short/duplicate titles. Result: id N in the answer shards pointed at a
DIFFERENT record than id N in the browse index → wrong Q/A shown for a title.

REPAIR (no internet):
Both pipelines walk the same source files in the same raw order. For dataset D:
  old ids:      hf-D-1 .. hf-D-N   (raw positions 0..N-1, minus rare empty skips)
  canonical ids: hf-D-0 .. hf-D-M   (raw positions, minus short/dup-title skips)
So canonical→old is a MONOTONIC alignment. We walk both id sequences per dataset
with two pointers; at each canonical id we advance the old pointer until the old
record's normalized question prefix matches the canonical question prefix
(within a small lookahead window). Unmatched canonical ids keep their trimmed
in-shard text (q=question, a=answer800) so nothing is lost; matched ones get the
FULL old answer text.

Then: rewrite shard files grouped by md5(new_id)[:8], rebuild index.json,
delete orphaned files.
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
ANS_DIR = os.path.join(ROOT, 'public', 'data', 'fatwa_answers')
OUT_DIR = ANS_DIR  # rewrite in place
NEW_DIR = os.path.join(ROOT, 'public', 'data', 'fatwa_answers_new')

CATEGORIES = ['salah', 'zakah', 'muamalat', 'aqeedah', 'family', 'contemporary']

MAX_Q = 6000
MAX_A = 20000
SHARD_TARGET_BYTES = 60 * 1024


def log(m):
    print(m, flush=True)


AR_DIAC = re.compile(r'[\u064B-\u065F\u0670\u0640]')
PUNCT = re.compile(r'[_\-\n\r\t]+', re.I)


def norm(s):
    if not s:
        return ''
    s = AR_DIAC.sub('', s)
    s = s.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    s = s.replace('ة', 'ه').replace('ى', 'ي').replace('ؤ', 'و').replace('ئ', 'ي')
    s = PUNCT.sub(' ', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def shard_hash(fid):
    return hashlib.md5(fid.encode('utf-8')).hexdigest()[:8]


def load_canonical():
    """id -> {title, question, answer, dataset, num}"""
    canon = {}
    for cat in CATEGORIES:
        path = os.path.join(SHARDS_DIR, f'{cat}.json')
        with open(path, encoding='utf-8') as f:
            items = json.load(f)
        for it in items:
            cid = it.get('id')
            if not cid:
                continue
            m = re.match(r'^(hf-.+)-(\d+)$', cid)
            if not m:
                continue
            canon[cid] = {
                'title': it.get('title') or '',
                'question': it.get('question') or '',
                'answer': it.get('answer') or '',
                'dataset': m.group(1),
                'num': int(m.group(2)),
            }
    return canon


def load_old_records():
    """dataset -> {num: (q, a)} from existing answer shards."""
    by_dataset = {}
    idx_path = os.path.join(ANS_DIR, 'index.json')
    with open(idx_path, encoding='utf-8') as f:
        old_index = json.load(f)
    shard_cache = {}
    total = 0
    for old_id, h in old_index.items():
        m = re.match(r'^(hf-.+)-(\d+)$', old_id)
        if not m:
            continue
        dataset, num = m.group(1), int(m.group(2))
        if h not in shard_cache:
            p = os.path.join(ANS_DIR, f'{h}.json')
            try:
                with open(p, encoding='utf-8') as f:
                    recs = json.load(f)
                shard_cache[h] = {r['id']: r for r in recs}
            except Exception:
                shard_cache[h] = {}
        rec = shard_cache[h].get(old_id)
        if rec is None:
            continue
        by_dataset.setdefault(dataset, {})[num] = (rec.get('q') or '', rec.get('a') or '')
        total += 1
        if total % 60000 == 0:
            log(f'  loaded {total:,} old records...')
    log(f'  old records loaded: {total:,} across {len(by_dataset)} datasets')
    return by_dataset


def main():
    log('1) Loading canonical entries (shards/*.json)...')
    canon = load_canonical()
    log(f'   canonical ids: {len(canon):,}')

    log('2) Loading old answer records...')
    old = load_old_records()

    # Group canonical ids per dataset, sorted by num
    per_ds = {}
    for cid, c in canon.items():
        per_ds.setdefault(c['dataset'], []).append((c['num'], cid))
    for ds in per_ds:
        per_ds[ds].sort()

    log('3) Aligning canonical ↔ old per dataset (two-pointer with verification)...')
    final_records = {}   # new_id -> (q, a)
    stats = {'full': 0, 'fallback': 0, 'unmatched_old': 0}

    for ds, entries in sorted(per_ds.items()):
        old_nums = sorted(old.get(ds, {}).keys())
        oi = 0
        ds_full = 0
        ds_fb = 0
        for num, cid in entries:
            c = canon[cid]
            c_qkey = norm(c['question'])[:50] or norm(c['title'])[:50]
            # advance old pointer while old_num < num (records skipped by legacy)
            while oi < len(old_nums) and old_nums[oi] < num:
                oi += 1
            # try to verify at current position (allow small lookahead ±3)
            matched = None
            for k in range(oi, min(oi + 4, len(old_nums))):
                onum = old_nums[k]
                if onum > num + 3:
                    break
                q_old, a_old = old[ds][onum]
                o_qkey = norm(q_old)[:50]
                if c_qkey and o_qkey and (c_qkey[:30] in o_qkey or o_qkey[:30] in c_qkey
                                          or c_qkey[:25] == o_qkey[:25]):
                    matched = k
                    break
            if matched is not None:
                onum = old_nums[matched]
                q_old, a_old = old[ds][onum]
                final_records[cid] = (q_old[:MAX_Q], a_old[:MAX_A])
                oi = matched + 1
                ds_full += 1
                stats['full'] += 1
            else:
                # keep canonical trimmed text (honest, from the same raw record)
                q = c['question'] or c['title']
                a = c['answer'] or ''
                final_records[cid] = (q[:MAX_Q], a[:MAX_A])
                ds_fb += 1
                stats['fallback'] += 1
        log(f'   {ds}: full={ds_full:,} fallback={ds_fb:,}')

    # old records never claimed (dataset files present in old but not canonical)
    claimed = stats['full'] + stats['fallback']
    log(f'   canonical total: {claimed:,} | unmatched old records dropped: '
        f'{sum(len(v) for v in old.values()) - stats["full"]:,}')

    log('4) Writing new shards...')
    os.makedirs(NEW_DIR, exist_ok=True)
    new_shards = {}
    new_index = {}
    for cid, (q, a) in final_records.items():
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

    log(f'   new shards: {len(new_shards):,} files | index entries: {len(new_index):,}')
    log('DONE (new data in public/data/fatwa_answers_new — swap after verification)')


if __name__ == '__main__':
    main()
