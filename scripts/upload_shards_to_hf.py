#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Upload fatwa shards to HuggingFace (one-shot batch).
=====================================================================
Uploads everything from public/data/ EXCEPT files that should stay local
(radio/clean_catalog.json, etc are already in .gitignore; we mirror the same
excludes here for the upload tree).

What it uploads:
  - public/data/fatwa_answers/    (~1.1GB, 226k shards)
  - public/data/fatwa_browse/      (~33MB,  8 files)
  - public/data/shards/            (~143MB, 6 files — browse index)
  - public/data/micro_shards/      (~283MB, 1566 files — search engine)
  - public/data/fatwas_manifest.json  (~150MB)

Total ≈ 1.7GB → mirrors to hozifa1/noor-platform-shards on HuggingFace.

Usage
-----
  1. hf auth login            (one-time; uses your hozifa1 account)
  2. python scripts/upload_shards_to_hf.py --repo hozifa1/noor-platform-shards
     (adds --private if you want it gated)
  3. (optional) --dry-run    to see what would be uploaded without doing it
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # project root
DATA = ROOT / 'public' / 'data'
REPO_DEFAULT = 'hozifa1/noor-platform-shards'

# Subdirs to mirror (everything under public/data/ EXCEPT gitignored helpers)
MIRROR_DIRS = ['fatwa_answers', 'fatwa_browse', 'shards', 'micro_shards']
MIRROR_FILES = ['fatwas_manifest.json']  # root-level files

# Files the repo already has in .gitignore — must not be uploaded either
EXCLUDE = {
    'public/data/radio/clean_catalog.json',
    'public/data/radio/catalog.json',
    'public/data/ebooks/catalog.json',
}


def fmt_size(n: int) -> str:
    for u in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.1f}{u}'
        n /= 1024
    return f'{n:.1f}TB'


def walk_upload_targets() -> list[Path]:
    """Return every file we plan to upload, applying EXCLUDE."""
    targets: list[Path] = []
    for d in MIRROR_DIRS:
        for p in (DATA / d).rglob('*'):
            if p.is_file() and str(p.relative_to(ROOT)).replace('\\', '/') not in EXCLUDE:
                targets.append(p)
    for f in MIRROR_FILES:
        p = DATA / f
        if p.is_file():
            targets.append(p)
    return targets


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default=REPO_DEFAULT,
                    help=f'target HF repo (default: {REPO_DEFAULT})')
    ap.add_argument('--dry-run', action='store_true',
                    help='list files + total size, do not upload')
    ap.add_argument('--private', action='store_true',
                    help='create the repo as private (rare; usually public)')
    ap.add_argument('--message', '-m', default='upload: publish Noor fatwa shards',
                    help='commit message for the upload commit')
    args = ap.parse_args()

    targets = walk_upload_targets()
    if not targets:
        print('No files to upload — check public/data/', file=sys.stderr)
        return 1
    total = sum(p.stat().st_size for p in targets)
    print(f'Files to upload: {len(targets):,}')
    print(f'Total size:      {fmt_size(total)} ({total:,} bytes)')
    print(f'Target repo:     {args.repo}')
    print(f'Visibility:      {"private" if args.private else "public (default)"}')
    print()

    if args.dry_run:
        print('--- DRY RUN — first 10 + last 5 ---')
        for p in targets[:10]:
            print(f'  {p.stat().st_size:>12,d}  {p.relative_to(ROOT)}')
        if len(targets) > 15:
            print(f'  ... ({len(targets) - 15} more) ...')
        for p in targets[-5:]:
            print(f'  {p.stat().st_size:>12,d}  {p.relative_to(ROOT)}')
        return 0

    # 1. Create the repo (idempotent — no-op if it already exists)
    visibility_args = ['--repo-type', 'dataset', '--exist-ok']
    if args.private:
        visibility_args.append('--private')
    else:
        visibility_args.append('--public')
    print(f'[1/2] hf repo create {args.repo} ...')
    rc = subprocess.run(['hf', 'repo', 'create', args.repo, *visibility_args],
                        check=False).returncode
    if rc != 0:
        print(f'  ! repo create returned {rc} (probably already exists — continuing)')

    # 2. Upload recursively from public/data/
    #    hf upload FOLDER uses include/exclude globs; we mirror via --include on each subdir.
    print(f'[2/2] uploading {len(targets):,} files (this may take several minutes)...')
    cmd = [
        'hf', 'upload', args.repo, str(DATA), 'data',
        '--repo-type', 'dataset',
        '--commit-message', args.message,
        '--include', 'fatwa_answers/*',
        '--include', 'fatwa_browse/*',
        '--include', 'shards/*',
        '--include', 'micro_shards/*',
        '--include', 'fatwas_manifest.json',
    ]
    print('  $', ' '.join(cmd))
    rc = subprocess.run(cmd, check=False).returncode
    if rc != 0:
        print(f'\nUpload failed (exit {rc}). Re-run the command above to retry.', file=sys.stderr)
        return rc
    print(f'\nDone. Verify at: https://huggingface.co/datasets/{args.repo}/tree/main')
    print(f'First shard URL: https://huggingface.co/datasets/{args.repo}/resolve/main/data/fatwa_answers/27c26b70.json')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
