#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — v3 targeted uploader.
Uploads ONLY the sections that are missing on HF (micro_shards, shards,
fatwa_browse). Skips fatwa_answers entirely (already uploaded by v1).

Usage:
  python scripts/upload_missing_sections.py
"""
import os
import shutil
import sys
import time
from pathlib import Path

from huggingface_hub import HfApi, CommitOperationAdd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
REPO = 'hozifa1/noor-platform-shards'
STAGING = Path(os.environ.get('LOCALAPPDATA', '')) / 'Temp' / 'noor-missing'
COMMIT_BATCH = 50  # 50 per commit — micro_shards files are ~1MB each, so 50MB/commit stays under HF's limit
MISSING_SECTIONS = ['micro_shards', 'shards', 'fatwa_browse']


def build_section(src_dir: Path, staging: Path, shard: bool = False) -> int:
    count = 0
    for p in src_dir.rglob('*'):
        if not p.is_file():
            continue
        rel = str(p.relative_to(DATA)).replace('\\', '/')
        if shard and len(p.name) == 13 and p.name.endswith('.json'):
            # 2-level fan-out: data/micro_shards/ab/cd/abcd1234.json
            stem = p.name[:-5]
            dst = staging / f'data/micro_shards/{stem[0:2]}/{stem[2:4]}/{p.name}'
        else:
            dst = staging / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dst)
        count += 1
    return count


def main() -> int:
    api = HfApi()
    if STAGING.exists():
        shutil.rmtree(STAGING, ignore_errors=True)
    STAGING.mkdir(parents=True, exist_ok=True)

    total = 0
    for sec in MISSING_SECTIONS:
        src = DATA / sec
        if not src.is_dir():
            print(f'! {sec} not found locally, skip')
            continue
        shard = (sec == 'micro_shards')
        n = build_section(src, STAGING, shard=shard)
        print(f'  staged {sec}: {n:,} files')
        total += n

    if total == 0:
        print('Nothing to upload.')
        return 0

    files = [p for p in STAGING.rglob('*') if p.is_file()]
    print(f'\nUploading {len(files):,} files in batches of {COMMIT_BATCH:,} ...')

    from collections import defaultdict
    by_dir: dict[str, list[Path]] = defaultdict(list)
    for p in files:
        rel = str(p.relative_to(STAGING)).replace('\\', '/')
        parts = rel.split('/')
        top = '/'.join(parts[:2]) if len(parts) >= 2 and parts[0] == 'data' else parts[0]
        by_dir[top].append(p)

    total_batches = sum((len(v) + COMMIT_BATCH - 1) // COMMIT_BATCH for v in by_dir.values())
    batch_idx = 0
    for top in sorted(by_dir.keys()):
        chunk_files = by_dir[top]
        for start in range(0, len(chunk_files), COMMIT_BATCH):
            batch_idx += 1
            chunk = chunk_files[start:start + COMMIT_BATCH]
            ops = [
                CommitOperationAdd(
                    path_in_repo=str(p.relative_to(STAGING)).replace('\\', '/'),
                    path_or_fileobj=str(p),
                )
                for p in chunk
            ]
            print(f'  [{top}] batch {batch_idx}/{total_batches}: {len(chunk):,} files ...', flush=True)
            t0 = time.time()
            for attempt in range(1, 6):
                try:
                    api.create_commit(
                        repo_id=REPO,
                        repo_type='dataset',
                        operations=ops,
                        commit_message=f'upload: {top} (batch {batch_idx}/{total_batches})',
                    )
                    print(f'    done in {time.time()-t0:.0f}s')
                    break
                except Exception as e:
                    if attempt == 5:
                        print(f'    FAILED: {type(e).__name__}: {e}', file=sys.stderr)
                        break
                    wait = 2 ** attempt
                    print(f'    attempt {attempt} failed ({type(e).__name__}) - retry in {wait}s')
                    time.sleep(wait)

    shutil.rmtree(STAGING, ignore_errors=True)
    print(f'\n✓ Done. Missing sections uploaded.')
    print(f'  Verify: https://huggingface.co/datasets/{REPO}/tree/main/data')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
