#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Build a 2-level sharded + indexed view of the books catalogs.

Splits shamela_arabic_catalog.json (8,589 books) and openiti_arabic_catalog.json
(11,481 books) into:

  data/books/catalogs/<source>/_index.json          (lightweight title index)
  data/books/catalogs/<source>/<p1>/<p2>/<prefix>.json  (full book details, by 3-char Arabic prefix)

The 3-char prefix is computed from the normalized (diacritics+alef variants
stripped) Arabic title. The first char is split into a top dir, chars 2-3 into
a subdir so HF's 10K-files-per-directory limit is never hit. With the 3-char
prefix, the largest bucket is ~559 books (well under 10K).

Output is written to ./staging/books/.  Pass --upload to push the staging tree
to HuggingFace in 10K-file commits.
"""
import argparse
import json
import re
import shutil
import time
from pathlib import Path
from collections import Counter
from typing import Iterable

from huggingface_hub import HfApi, CommitOperationAdd

ROOT = Path(__file__).resolve().parent.parent
SRC_SHAMELA = ROOT / 'public' / 'data' / 'ebooks' / 'shamela_arabic_catalog.json'
SRC_OPENITI = ROOT / 'public' / 'data' / 'ebooks' / 'openiti_arabic_catalog.json'
STAGING = Path('staging/books')
REPO = 'hozifa1/noor-platform-shards'
COMMIT_BATCH = 500

# Strip diacritics and normalise alef/yaa/taa marbuta for prefix consistency
_ARABIC_DIACRITICS = re.compile(r'[\u064B-\u0652\u0670\u0640]')
_ALEF_VARIANTS = re.compile(r'[إأآا]')
_YAA_VARIANTS = re.compile(r'[يى]')
_TAA_MARBUTA = re.compile(r'ة')
_NON_ARABIC = re.compile(r'[^\u0600-\u06FF]')


def norm_title(s: str) -> str:
    s = _ARABIC_DIACRITICS.sub('', s or '')
    s = _ALEF_VARIANTS.sub('ا', s)
    s = _YAA_VARIANTS.sub('ي', s)
    s = _TAA_MARBUTA.sub('ه', s)
    return s


def prefix3(title: str) -> str:
    s = _NON_ARABIC.sub('', norm_title(title))[:3]
    if len(s) < 3:
        s = (s + '___')[:3]
    return s


def build_index_entry(book: dict) -> dict:
    """Lightweight entry kept in the in-memory _index.json."""
    return {
        'id': book.get('id'),
        'title': book.get('title'),
        'sheikhName': book.get('sheikhName'),
        'category': book.get('category') or book.get('islamicArt') or '',
        'prefix': prefix3(book.get('title', '')),
    }


def shard_books(books: list[dict], staging: Path, source: str) -> tuple[int, int]:
    """Split books into per-prefix shard files. Returns (shard_count, index_total_size_bytes)."""
    bucket: dict[str, list[dict]] = {}
    for b in books:
        p = prefix3(b.get('title', ''))
        bucket.setdefault(p, []).append(b)

    src_dir = staging / 'data' / 'books' / 'catalogs' / source
    (src_dir / '_by_prefix').mkdir(parents=True, exist_ok=True)

    # Lightweight index split by first letter of the normalised title.
    # Each file holds books whose title's first Arabic letter is the same,
    # so _index_a.json is at most ~3MB even for the giant ال bucket.
    index_letters: dict[str, list[dict]] = {}
    for b in books:
        n = norm_title(b.get('title', ''))
        first = n[0] if n else '_'
        index_letters.setdefault(first, []).append(build_index_entry(b))

    index_total = 0
    for letter, entries in index_letters.items():
        # Sanitize: file names must avoid special chars. Non-Arabic /
        # letterless titles go to _index__.json. Anything outside the Arabic
        # range (punctuation, digits, brackets) goes to _index__.json as well
        # to keep file names portable.
        if letter == '_' or not ('\u0600' <= letter <= '\u06FF'):
            suffix = '__'
        else:
            suffix = letter
        idx_path = src_dir / f'_index_{suffix}.json'
        idx_path.write_text(json.dumps(entries, ensure_ascii=False), encoding='utf-8')
        index_total += idx_path.stat().st_size
    print(f'  [{source}] _index_<letter>.json -> {len(index_letters)} files, '
          f'{index_total:,} bytes total ({len(books):,} books)')

    # Per-prefix shard files: <p1>/<p2>/<p3>.json
    for p, items in bucket.items():
        p1, p2, p3 = p[0], p[1], p[2]
        shard_dir = src_dir / '_by_prefix' / p1 / p2
        shard_dir.mkdir(parents=True, exist_ok=True)
        shard_path = shard_dir / f'{p3}.json'
        shard_path.write_text(json.dumps(items, ensure_ascii=False), encoding='utf-8')

    # Stats
    counts = sorted((len(v) for v in bucket.values()), reverse=True)
    print(f'  [{source}] {len(bucket):,} shard files; '
          f'max={counts[0]}, avg={sum(counts)//len(counts)}, '
          f'p99={counts[len(counts)//100]}')
    return len(bucket), index_total


def upload(staging: Path) -> int:
    api = HfApi()
    files = sorted(p for p in staging.rglob('*') if p.is_file())
    print(f'\nUploading {len(files):,} files in batches of {COMMIT_BATCH:,} ...')

    by_dir: dict[str, list[Path]] = {}
    for p in files:
        rel = str(p.relative_to(staging)).replace('\\', '/')
        parts = rel.split('/')
        # top = data/books/catalogs/<source>/_by_prefix/<p1>/<p2>
        if len(parts) >= 6 and parts[0] == 'data' and parts[3] == '_by_prefix':
            top = '/'.join(parts[:5])
        else:
            top = '/'.join(parts[:3])
        by_dir.setdefault(top, []).append(p)

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
                        print(f'    FAILED after 5 attempts: {e}', file=__import__('sys').stderr)
                        return 3
                    wait = 2 ** attempt
                    print(f'    attempt {attempt} failed ({type(e).__name__}) - retry in {wait}s')
                    time.sleep(wait)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--upload', action='store_true',
                    help='after building, push the staging tree to HuggingFace')
    ap.add_argument('--keep-staging', action='store_true')
    args = ap.parse_args()

    if STAGING.exists():
        shutil.rmtree(STAGING, ignore_errors=True)
    STAGING.mkdir(parents=True, exist_ok=True)

    total_shards = 0
    for name, src in [('shamela', SRC_SHAMELA), ('openiti', SRC_OPENITI)]:
        if not src.is_file():
            print(f'! {src} not found, skip')
            continue
        print(f'\nBuilding {name} shards from {src.name} ...')
        books = json.loads(src.read_text(encoding='utf-8'))
        n_shards, _ = shard_books(books, STAGING, name)
        total_shards += n_shards

    if args.upload:
        return upload(STAGING)

    print(f'\nStaged at: {STAGING.resolve()}')
    print(f'  total shard files: {total_shards:,}')
    print(f'  pass --upload to push to HF')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
