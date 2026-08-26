#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify shards + fatwa_browse are on HF; upload if missing."""
import os
import sys
from pathlib import Path
from huggingface_hub import HfApi, CommitOperationAdd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'public' / 'data'
REPO = 'hozifa1/noor-platform-shards'

def main() -> int:
    api = HfApi()
    # Check what's on HF
    info = api.dataset_info(REPO, files_metadata=True)
    existing = {s.rfilename for s in info.siblings}
    print(f'HF has {len(existing):,} files')

    missing = []
    for sec in ['shards', 'fatwa_browse']:
        sec_dir = DATA / sec
        if not sec_dir.is_dir():
            continue
        for p in sec_dir.rglob('*'):
            if not p.is_file():
                continue
            rel = f'data/{sec}/{p.name}'
            if rel not in existing:
                missing.append((rel, p))

    if not missing:
        print('All shards + fatwa_browse already on HF. ✓')
        return 0

    print(f'{len(missing)} files missing, uploading in one commit ...')
    ops = [CommitOperationAdd(path_in_repo=rel, path_or_fileobj=str(p)) for rel, p in missing]
    try:
        api.create_commit(
            repo_id=REPO,
            repo_type='dataset',
            operations=ops,
            commit_message='upload: shards + fatwa_browse (verify)',
        )
        print('✓ Uploaded successfully')
    except Exception as e:
        print(f'FAILED: {type(e).__name__}: {e}', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
