#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Upload fatwa shards to HuggingFace (one-shot, 2-level sharded).
==============================================================================
Uploads everything from public/data/ EXCEPT files that should stay local
(radio/clean_catalog.json, etc are already in .gitignore; we mirror the same
excludes here for the upload tree).

HuggingFace Git backend rejects any directory with >10,000 files. Our shard
files (226k fatwa_answers + 1.5k micro_shards) need 2-level fan-out:

  data/fatwa_answers/00/00/00001795.json
  data/fatwa_answers/27/c2/27c26b70.json
  data/micro_shards/   ab/cd/abcd1234.json

The app reads them via src/lib/data-base.ts → shardUrl(), which builds the
same path from md5(id)[:8] deterministically. So local dev and prod stay
in sync without an index.

What it uploads (after staging):
  - public/data/fatwa_answers/    → 226k shards, 2-level fan-out (~880/dir)
  - public/data/fatwa_browse/      → 8 files (flat; 8 < 10k)
  - public/data/shards/            → 6 files (flat)
  - public/data/micro_shards/      → 1.5k shards, 2-level fan-out (~5/dir)
  - public/data/fatwas_manifest.json  → 1 file (flat)

Total ≈ 1.1GB → mirrors to hozifa1/noor-platform-shards on HuggingFace.

Usage
-----
  1. hf auth login                     (one-time; uses your HF account)
  2. python scripts/upload_shards_to_hf.py --dry-run   # preview
  3. python scripts/upload_shards_to_hf.py             # publish
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import json as jsonlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # project root
DATA = ROOT / 'public' / 'data'
REPO_DEFAULT = 'hozifa1/noor-platform-shards'

# Mirror everything under public/data/ except the gitignored helpers
MIRROR_DIRS = ['fatwa_answers', 'fatwa_browse', 'shards', 'micro_shards']
MIRROR_FILES = ['fatwas_manifest.json']

# Directories whose shard files must be sharded 2-level (because > 10K files
# is rejected by HF's git backend). fatwa_answers is the big one;
# micro_shards is borderline (1.5K) so we shard it too for consistency.
SHARD_DIRS = {'fatwa_answers', 'micro_shards'}

EXCLUDE = {
    'public/data/radio/clean_catalog.json',
    'public/data/radio/catalog.json',
    'public/data/ebooks/catalog.json',
}

# HF dir-limit safety margin
HF_DIR_LIMIT = 10_000


def fmt_size(n: int) -> str:
    for u in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.1f}{u}'
        n /= 1024
    return f'{n:.1f}TB'


def list_remote_files(repo: str, token: str | None = None) -> set[str]:
    """List every file already uploaded (relative paths under /data).

    Uses `hf download --repo-type dataset --include 'data/*' <repo> --dry-run`
    when available, which is much faster than recursive API pagination. Falls
    back to the BFS API walk if the CLI rejects the dry-run flag. The
    single-argument get_paths_info batch endpoint is also tried first. """
    api_root = f'https://huggingface.co/api/datasets/{repo}'

    # Fast path: batched get_paths_info (1 round-trip, returns up to many)
    try:
        req = urllib.request.Request(
            api_root,
            headers={'Authorization': f'Bearer {token}'} if token else {},
        )
        meta = jsonlib.loads(urllib.request.urlopen(req, timeout=30).read())
        siblings = meta.get('siblings', [])
        return {s['rfilename'][5:] for s in siblings if s.get('rfilename', '').startswith('data/')}
    except Exception as e:
        print(f'  ! fast list failed ({e}); trying recursive API ...', file=sys.stderr)

    # Fallback: recursive BFS
    seen: set[str] = set()
    queue: list[str] = ['']
    pages = 0
    while queue and pages < 5000:
        cursor = queue.pop()
        url = f'{api_root}/tree/main/{cursor}'.rstrip('/')
        try:
            req = urllib.request.Request(
                url,
                headers={'Authorization': f'Bearer {token}'} if token else {},
            )
            data = jsonlib.loads(urllib.request.urlopen(req, timeout=30).read())
        except Exception as e:
            print(f'  ! cannot list {url}: {e}', file=sys.stderr)
            break
        for entry in data:
            p = entry.get('path', '')
            t = entry.get('type', '')
            rel = p[5:] if p.startswith('data/') else p
            if t == 'directory':
                queue.append(p)
            else:
                seen.add(rel)
        pages += 1
    return seen


def read_token() -> str | None:
    cache = Path.home() / '.cache' / 'huggingface' / 'token'
    if cache.is_file():
        try:
            return cache.read_text().strip() or None
        except OSError:
            return None
    return None


def shard_name(name: str) -> str:
    """e.g. '27c26b70.json' → '27/c2/27c26b70.json'"""
    assert len(name) >= 10 and name.endswith('.json'), f'bad shard: {name}'
    stem = name[:-5]  # strip .json
    return f'{stem[0:2]}/{stem[2:4]}/{name}'


def build_staging(staging: Path) -> tuple[int, int]:
    """Copy + shard files into a clean staging dir. Returns (count, total_bytes)."""
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
            # Hard-link to avoid duplicating 1.1GB on disk
            try:
                os.link(p, dst)
            except OSError:
                shutil.copy2(p, dst)
            count += 1
            total += p.stat().st_size
    for f in MIRROR_FILES:
        src = DATA / f
        if src.is_file():
            rel = f'data/{f}'
            dst = staging / rel
            shutil.copy2(src, dst)
            count += 1
            total += src.stat().st_size
    return count, total


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', default=REPO_DEFAULT)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--private', action='store_true')
    ap.add_argument('--message', '-m', default='upload: publish Noor fatwa shards')
    ap.add_argument('--keep-staging', action='store_true',
                    help='do not delete the staging dir (for debugging)')
    ap.add_argument('--resume', action='store_true',
                    help='skip files already uploaded to the repo (uses HF API to list)')
    ap.add_argument('--skip-existing', action='store_true',
                    help='alias of --resume')
    args = ap.parse_args()

    # Build staging. Prefer a fast local disk — %TEMP% on OneDrive-backed
    # Windows installs is pathologically slow for 228k file ops, and hard
    # linking across volumes falls back to a real copy.
    local_tmp = Path(os.environ.get('LOCALAPPDATA', '')) / 'Temp' / 'noor-shards-staging'
    if not local_tmp.parent.exists():
        local_tmp = Path(tempfile.mkdtemp(prefix='noor-shards-'))
    else:
        # Reuse a known directory to keep it on the same volume (so hard-link works)
        if local_tmp.exists():
            shutil.rmtree(local_tmp, ignore_errors=True)
        local_tmp.mkdir(parents=True, exist_ok=True)
        local_tmp = local_tmp  # keep the dir
    staging = local_tmp
    print(f'Building 2-level sharded staging tree in {staging} ...')
    count, total = build_staging(staging)
    if not count:
        print('No files to upload — check public/data/', file=sys.stderr)
        return 1

    # --resume: prune staging of files already uploaded
    do_resume = args.resume or args.skip_existing
    if do_resume:
        print(f'\n[resume] listing files already in {args.repo} ...')
        token = read_token()
        try:
            existing = list_remote_files(args.repo, token)
        except Exception as e:
            print(f'  ! resume lookup failed: {e}\n  continuing without --resume', file=sys.stderr)
            existing = set()
        if existing:
            kept = 0
            removed = 0
            for p in list(staging.rglob('*')):
                if not p.is_file():
                    continue
                rel = str(p.relative_to(staging)).replace('\\', '/')
                if rel in existing:
                    p.unlink()
                    removed += 1
                else:
                    kept += 1
            # Clean empty dirs
            for d in sorted(staging.rglob('*'), reverse=True):
                if d.is_dir() and not any(d.iterdir()):
                    d.rmdir()
            print(f'  already uploaded: {removed:,}  |  to upload: {kept:,}')
            count = kept
            if kept == 0:
                print('\nNothing left to upload — repo is already up to date.')
                if not args.keep_staging:
                    shutil.rmtree(staging, ignore_errors=True)
                return 0

    print(f'Files to upload: {count:,}')
    print(f'Total size:      {fmt_size(total)} ({total:,} bytes)')
    print(f'Target repo:     {args.repo}')
    print(f'Visibility:      {"private" if args.private else "public (default)"}')

    # Sanity: no dir may exceed HF limit
    dir_counts: dict[Path, int] = {}
    for p in staging.rglob('*'):
        if p.is_file():
            d = p.parent
            dir_counts[d] = dir_counts.get(d, 0) + 1
    worst = max(dir_counts.values()) if dir_counts else 0
    print(f'Max files per dir: {worst:,} (HF limit: {HF_DIR_LIMIT:,})')
    if worst > HF_DIR_LIMIT:
        print('ERROR: a directory still exceeds the HF limit — aborting', file=sys.stderr)
        if not args.keep_staging:
            shutil.rmtree(staging, ignore_errors=True)
        return 2

    if args.dry_run:
        print('\n--- DRY RUN — staging layout preview ---')
        # show one example from each sharded dir
        for d in sorted(SHARD_DIRS):
            sample_dir = next(staging.glob(f'data/{d}/*/*'))
            samples = sorted(sample_dir.iterdir())[:3]
            print(f'  data/{d}/{{xx}}/{{yy}}/...:')
            for s in samples:
                print(f'    {s.relative_to(staging)}')
        print(f'\nFull staging tree at: {staging}')
        if not args.keep_staging:
            shutil.rmtree(staging, ignore_errors=True)
        return 0

    # 1. Create the repo (idempotent)
    visibility_args = ['--repo-type', 'dataset', '--exist-ok']
    if args.private:
        visibility_args.append('--private')
    else:
        visibility_args.append('--public')
    print(f'\n[1/2] hf repo create {args.repo} ...')
    rc = subprocess.run(['hf', 'repo', 'create', args.repo, *visibility_args],
                        check=False).returncode
    if rc != 0:
        print(f'  ! repo create returned {rc} (probably already exists — continuing)')

    # 2. Upload
    #    `hf upload` uses --type (not --repo-type). Try the modern form first,
    #    fall back to --repo-type for older hf-cli versions.
    print(f'[2/2] uploading {count:,} files from staging (5-30 min)...')
    base = ['hf', 'upload', args.repo, str(staging / 'data'), 'data',
            '--type', 'dataset', '--commit-message', args.message]
    fallback = ['hf', 'upload', args.repo, str(staging / 'data'), 'data',
                '--repo-type', 'dataset', '--commit-message', args.message]
    print('  $', ' '.join(base))
    rc = subprocess.run(base, check=False).returncode
    if rc != 0:
        print(f'  retry with --repo-type (older hf-cli) ...')
        rc = subprocess.run(fallback, check=False).returncode
    if rc != 0:
        print(f'\nUpload failed (exit {rc}). Staging tree kept at: {staging}',
              file=sys.stderr)
        return rc
    if not args.keep_staging:
        shutil.rmtree(staging, ignore_errors=True)
    print(f'\nDone. Verify at: https://huggingface.co/datasets/{args.repo}/tree/main/data')
    print(f'Example shard URL: https://huggingface.co/datasets/{args.repo}/resolve/main/data/fatwa_answers/27/c2/27c26b70.json')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
