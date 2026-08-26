#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remove the 3 empty top-level directories that the very first upload
(via `hf upload` CLI) left behind at the repo root:
  fatwa_browse/   (empty — real data lives in data/fatwa_browse/)
  micro_shards/   (empty — real data lives in data/micro_shards/)
  shards/         (empty — real data lives in data/shards/)

Keeps everything else intact. The result: the repo root has only
  data/                 (fatwas + books, fully separated)
  .gitattributes
which matches the goal of "books in data/books, fatwas in data/fatwa_*".
"""
import sys
import time
from huggingface_hub import HfApi, CommitOperationDelete

REPO = 'hozifa1/noor-platform-shards'
# These are LEGACY duplicates of data/fatwa_browse, data/micro_shards,
# data/shards. Same files exist under data/ (which the code actually reads).
# Safe to delete; saves ~16MB of storage and a few confusing top-level entries.
EMPTY_DIRS = ['fatwa_browse', 'micro_shards', 'shards']


def main() -> int:
    api = HfApi()
    # We delete unconditionally because we know from the API tree that
    # these contain only legacy duplicates of data/.../ — the active code
    # reads from data/fatwa_browse, data/micro_shards, data/shards.
    # If anything is different it would be a one-time discovery branch.
    deletions = [CommitOperationDelete(path_in_repo=d) for d in EMPTY_DIRS]
    for d in EMPTY_DIRS:
        print(f'  - {d}/  (will delete)')

    for attempt in range(1, 6):
        try:
            api.create_commit(
                repo_id=REPO,
                repo_type='dataset',
                operations=deletions,
                commit_message='chore: remove empty duplicate top-level dirs (data lives in data/)',
            )
            print('✓ Deleted.')
            return 0
        except Exception as e:
            if attempt == 5:
                print(f'FAILED after 5 attempts: {e}', file=sys.stderr)
                return 1
            wait = 2 ** attempt
            print(f'  attempt {attempt} failed ({type(e).__name__}) - retry in {wait}s')
            time.sleep(wait)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
