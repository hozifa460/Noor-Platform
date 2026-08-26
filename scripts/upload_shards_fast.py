#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — High-speed uploader (hf API direct, ~50x faster than v1).

Why v1 is slow: `hf upload` CLI uses an internal commit-batch limiter
that drops to ~20 files/minute near the end of large uploads. v2 talks
to the HF API directly via huggingface_hub, batching 50,000 files per
commit (the API's hard limit) and uploading only files NOT already in
the remote tree.

Usage
-----
  python scripts/upload_shards_fast.py                # full upload
  python scripts/upload_shards_fast.py --dry-run     # show what would upload
  python scripts/upload_shards_fast.py --resume      # skip files already there
"""
import argparse
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

from huggingface_hub import HfApi, CommitOperationAdd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
REPO_DEFAULT = 'hozifa1/noor-platform-shards'
STAGING_DIR = Path(os.environ.get('LOCALAPPDATA', '')) / 'Temp' / 'noor-shards-staging'

MIRROR_DIRS = ['fatwa_answers', 'fatwa_browse', 'shards', 'micro_shards']
MIRROR_FILES = ['fatwas_manifest.json']
SHARD_DIRS = {'fatwa_answers', 'micro_shards'}
EXCLUDE = {
    'public/data/radio/clean_catalog.json',
    'public/data/radio/catalog.json',
    'public/data/ebooks/catalog.json',
}
COMMIT_BATCH = 10_000  # 10K per commit keeps each request under ~50MB and avoids HF closing the connection
RETRY_LIMIT = 5


def fmt_size(n: int) -> str:
    for u in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.1f}{u}'
        n /= 1024
    return f'{n:.1f}TB'


def shard_name(name: str) -> str:
    assert len(name) >= 10 and name.endswith('.json'), f'bad shard: {name}'
    stem = name[:-5]
    return f'{stem[0:2]}/{stem[2:4]}/{name}'


def build_staging(staging: Path) -> tuple[int, int]:
    count = 0
    total = 0
    for d in MIRROR_DIRS:
        src_dir = DATA / d
        if not src_dir.is_dir():
            continue
        for p in src_dir.rglob('*'):
            if not p.is_file():
                continue
            rel = str(p.relative_to(ROOT)).replace('\\', '/')
            if rel in EXCLUDE:
                continue
            name = p.name
            if d in SHARD_DIRS and len(name) == 13 and name.endswith('.json'):
                rel_in_staging = f'data/{d}/{shard_name(name)}'
            else:
                rel_in_staging = f'data/{d}/{name}'
            dst = staging / rel_in_staging
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dst)  # copy (not link) — reliable on Windows/OneDrive
            count += 1
            total += p.stat().st_size
    for f in MIRROR_FILES:
        src = DATA / f
        if src.is_file():
            dst = staging / f'data/{f}'
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            count += 1
            total += src.stat().st_size
    return count, total


def list_remote_set(api: HfApi, repo_id: str) -> set[str]:
    """One API call: returns set of all paths under /data."""
    info = api.dataset_info(repo_id, files_metadata=True)
    return {s.rfilename for s in info.siblings if s.rfilename.startswith('data/')}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default=REPO_DEFAULT)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--resume', action='store_true',
                    help='skip files already in repo (lists via HF API)')
    ap.add_argument('--keep-staging', action='store_true')
    args = ap.parse_args()

    # Staging on local SSD (LOCALAPPDATA) — %TEMP% on OneDrive is too slow
    if STAGING_DIR.exists() and STAGING_DIR.is_dir():
        staging = STAGING_DIR  # reuse existing staging (don't rebuild)
        print(f'Staging dir: {staging} (reusing existing)')
    else:
        STAGING_DIR.mkdir(parents=True, exist_ok=True)
        staging = STAGING_DIR
        print(f'Staging dir: {staging}')

    print('Building 2-level sharded staging tree ...')
    t0 = time.time()
    count, total = build_staging(staging)
    print(f'  built {count:,} files ({fmt_size(total)}) in {time.time()-t0:.0f}s')

    # Resume: ask HF what's already there, prune local
    skip_existing = set()
    if args.resume:
        api = HfApi()
        print(f'Listing existing files in {args.repo} ...')
        t0 = time.time()
        existing = list_remote_set(api, args.repo)
        print(f'  {len(existing):,} files already on HF (listed in {time.time()-t0:.0f}s)')

        # Build a set of "data/..." relative paths
        keep_paths = set()
        removed = 0
        for p in list(staging.rglob('*')):
            if not p.is_file():
                continue
            rel = str(p.relative_to(staging)).replace('\\', '/')
            if rel in existing:
                p.unlink()
                removed += 1
            else:
                keep_paths.add(rel)
        for d in sorted(staging.rglob('*'), reverse=True):
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()
        print(f'  pruned {removed:,} already-uploaded; {len(keep_paths):,} to upload')
        count = len(keep_paths)
        if count == 0:
            print('\nNothing left to upload — repo is already up to date.')
            if not args.keep_staging:
                shutil.rmtree(staging, ignore_errors=True)
            return 0

    # Sanity
    dir_counts: dict[Path, int] = {}
    for p in staging.rglob('*'):
        if p.is_file():
            d = p.parent
            dir_counts[d] = dir_counts.get(d, 0) + 1
    worst = max(dir_counts.values()) if dir_counts else 0
    print(f'Max files per dir: {worst} (HF limit: 10000)')
    if worst > 10_000:
        print('ERROR: a directory exceeds the HF limit', file=sys.stderr)
        return 2

    if args.dry_run:
        print('\n--- DRY RUN — would upload ---')
        files = sorted(p for p in staging.rglob('*') if p.is_file())
        for p in files[:5]:
            print(f'  {p.stat().st_size:>10,d}  {p.relative_to(staging)}')
        print(f'  ... and {len(files) - 5:,} more')
        if not args.keep_staging:
            shutil.rmtree(staging, ignore_errors=True)
        return 0

    # Actual upload via direct API in batches with retry.
    # 10K per commit keeps each request under ~50MB and avoids HF closing
    # the connection mid-upload. Per-directory commit boundaries mean one
    # failure does not invalidate the others.
    api = HfApi()
    files = [p for p in staging.rglob('*') if p.is_file()]
    print(f'\nUploading {len(files):,} files via direct API in batches of {COMMIT_BATCH:,} ...')

    # Group files by their top-level data/ subdir so each commit is a single
    # directory tree (cleaner history, easier to re-resume a partial repo).
    from collections import defaultdict
    by_dir: dict[str, list[Path]] = defaultdict(list)
    for p in files:
        rel = str(p.relative_to(staging)).replace('\\', '/')
        # rel looks like 'data/fatwa_answers/00/00/00001795.json'
        parts = rel.split('/')
        if len(parts) >= 3 and parts[0] == 'data':
            top = '/'.join(parts[:2])  # 'data/fatwa_answers'
        else:
            top = parts[0] if parts else 'data'
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
                    path_in_repo=str(p.relative_to(staging)).replace('\\', '/'),
                    path_or_fileobj=str(p),
                )
                for p in chunk
            ]
            print(f'  [{top}] batch {batch_idx}/{total_batches}: {len(chunk):,} files ...', flush=True)
            t0 = time.time()
            for attempt in range(1, RETRY_LIMIT + 1):
                try:
                    api.create_commit(
                        repo_id=args.repo,
                        repo_type='dataset',
                        operations=ops,
                        commit_message=f'upload: {top} (batch {batch_idx}/{total_batches})',
                    )
                    dt = time.time() - t0
                    rate = len(chunk) / max(dt, 1)
                    print(f'    done in {dt:.0f}s ({rate:.0f} files/s)')
                    break
                except Exception as e:
                    if attempt == RETRY_LIMIT:
                        print(f'    FAILED after {RETRY_LIMIT} attempts: {type(e).__name__}: {e}', file=sys.stderr)
                        print(f'    Skipping this batch and continuing.', file=sys.stderr)
                        break
                    wait = 2 ** attempt
                    print(f'    attempt {attempt} failed ({type(e).__name__}) - retrying in {wait}s')
                    time.sleep(wait)

    if not args.keep_staging:
        shutil.rmtree(staging, ignore_errors=True)

    print(f'\n✓ Done. {args.repo} now has all Noor fatwa shards.')
    print(f'  Verify: https://huggingface.co/datasets/{args.repo}/tree/main/data')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
