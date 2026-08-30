#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — fatwa_answers_uploader for Kaggle
====================================================

The smartest possible uploader for data/fatwa_answers/ from
hozifa1/noor-platform-shards → hozifa1/noor-platform-fatwa.

Strategy
--------
1. Download data/fatwas_manifest.json from the fatwa repo (one HTTP
   GET, 142MB). The manifest contains 226,580 fatwa records.
2. For each unique id, compute md5(id)[:8] (the shard hash).
3. Skip hashes that already exist on the destination (HEAD).
4. Download every missing shard (~2KB each) from the source repo.
5. Upload in adaptive batches (50-200 files per commit) using
   create_commit. The HuggingFace rate limit is 128 commits/hour for
   free accounts, so we batch generously. Each commit has multiple
   files, dramatically reducing the per-file commit overhead.

Run on Kaggle (free, fast internet) so the download is fast.

Usage on Kaggle
--------------
    !pip install -q huggingface_hub
    !git clone --depth=1 --branch add/fatwa-mover-clean \\
        https://github.com/hozifa460/Noor-Platform.git repo
    !cp repo/scripts/fatwa_answers_uploader.py .

    from kaggle_secrets import UserSecretsClient
    import os
    os.environ['HF_TOKEN'] = UserSecretsClient().get_secret('HF_TOKEN')

    !python fatwa_answers_uploader.py 2>&1 | tee upload.log
"""
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

TARGET_REPO = 'hozifa1/noor-platform-fatwa'
SOURCE_REPO = 'hozifa1/noor-platform-shards'
TOKEN = os.environ.get('HF_TOKEN')

MANIFEST_URL = (
    f'https://huggingface.co/datasets/{TARGET_REPO}/resolve/main/'
    'data/fatwas_manifest.json'
)
SOURCE_RESOLVE = (
    f'https://huggingface.co/datasets/{SOURCE_REPO}/resolve/main'
)
DEST_RESOLVE = (
    f'https://huggingface.co/datasets/{TARGET_REPO}/resolve/main'
)

ROOT = Path('/kaggle/working/noor-fatwa-answers')
STAGING = ROOT / 'staging'
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'upload.log'

# Number of files to upload per commit. With 128 commits/hour, each
# commit can hold ~1,800 files (we have ~226k), so we batch heavily
# to finish in one hour.
BATCH_SIZE = 1500

_api = None


def log(msg: str) -> None:
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line, flush=True)
    if LOG.parent.exists():
        with LOG.open('a', encoding='utf-8') as f:
            f.write(line + '\n')


def hf_get(url: str, max_retries: int = 5, timeout: int = 30) -> bytes | None:
    """GET with 429/timeout backoff. Returns None on 404."""
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={'User-Agent': 'noor-fatwa-ans-kaggle/1.0'}
            )
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                wait = 30 * (2 ** (attempt - 1))
                log(f'  429 on GET, retry in {wait}s')
                time.sleep(wait)
                continue
            return None
        except Exception:
            if attempt < max_retries:
                time.sleep(10 * attempt)
                continue
            return None
    return None


def hf_head_exists(url: str, max_retries: int = 3) -> bool:
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url, method='HEAD',
                headers={'User-Agent': 'noor-fatwa-ans-kaggle/1.0'},
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status == 200
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False
            if e.code == 429:
                time.sleep(30 * (2 ** attempt))
                continue
            return False
        except Exception:
            if attempt < max_retries:
                time.sleep(5 * attempt)
                continue
            return False
    return False


def get_all_unique_hashes() -> list[str]:
    """Download manifest, compute md5(id)[:8] for every entry, return
    the unique hashes as a sorted list."""
    log('Downloading fatwas_manifest.json ...')
    t0 = time.time()
    data = hf_get(MANIFEST_URL, timeout=300)
    if data is None:
        log('  could not download manifest')
        return []
    log(f'  got {len(data)/1024/1024:.1f} MB in {time.time()-t0:.1f}s')
    manifest = json.loads(data)

    hashes: set[str] = set()
    for item in manifest:
        if 'id' in item:
            h = hashlib.md5(item['id'].encode()).hexdigest()[:8]
            hashes.add(h)
    out = sorted(hashes)
    log(f'  unique hashes: {len(out)}')
    return out


def upload_batch(items: list[tuple[str, bytes]]) -> bool:
    """Upload a batch of (rel_path, data) pairs in a single commit."""
    from huggingface_hub import CommitOperationAdd
    import tempfile, os as _os

    # Persist batch to temp files for create_commit's path_or_fileobj
    tmp_paths: list[Path] = []
    try:
        operations = []
        for rel, data in items:
            tmp = STAGING / rel
            tmp.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_bytes(data)
            tmp_paths.append(tmp)
            operations.append(CommitOperationAdd(
                path_in_repo=rel,
                path_or_fileobj=str(tmp),
            ))
        for attempt in range(1, 6):
            try:
                _api.create_commit(
                    repo_id=TARGET_REPO,
                    repo_type='dataset',
                    operations=operations,
                    commit_message=(
                        f'fatwa_answers: {len(items)} files '
                        f'({items[0][0]} .. {items[-1][0]})'
                    ),
                )
                return True
            except Exception as e:
                if attempt == 5:
                    log(f'  upload gave up: {type(e).__name__}: {e}')
                    return False
                wait = 2 ** attempt
                log(f'  upload error, retry in {wait}s ({type(e).__name__})')
                time.sleep(wait)
        return False
    finally:
        # cleanup staging files
        for p in tmp_paths:
            try:
                p.unlink()
            except OSError:
                pass


def save_progress(p: dict) -> None:
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')


def load_progress() -> dict:
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {'done': [], 'failed': {}}


def main() -> int:
    global _api
    if not TOKEN:
        log('ERROR: HF_TOKEN not set. Add it via Kaggle Secrets.')
        return 1

    STAGING.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)

    from huggingface_hub import HfApi
    _api = HfApi(token=TOKEN)

    # 1. Compute unique hashes from manifest
    hashes = get_all_unique_hashes()
    if not hashes:
        log('No hashes found, aborting')
        return 1
    log(f'Will process {len(hashes)} unique shards')

    # 2. Load progress
    progress = load_progress()
    done = set(progress.get('done', []))
    failed = progress.get('failed', {})
    log(f'Already done: {len(done)} | Remaining: {len(hashes) - len(done)}')

    # 3. Iterate: skip existing, download missing, accumulate, upload
    todo = [h for h in hashes if h not in done]
    log(f'Todo: {len(todo)}')

    t0 = time.time()
    batch: list[tuple[str, bytes]] = []
    for i, h in enumerate(todo, 1):
        rel = f'data/fatwa_answers/{h[0:2]}/{h[2:4]}/{h}.json'
        # HEAD skip (fast)
        if hf_head_exists(f'{DEST_RESOLVE}/{rel}'):
            done.add(h)
            progress['done'] = sorted(done)
            if i % 100 == 0:
                save_progress(progress)
            continue
        # Download from source
        data = hf_get(f'{SOURCE_RESOLVE}/{rel}', timeout=30)
        if data is None:
            failed[h] = 'download failed'
            progress['failed'] = failed
            continue
        batch.append((rel, data))
        # Flush a batch when it hits BATCH_SIZE
        if len(batch) >= BATCH_SIZE:
            t_start = time.time()
            ok = upload_batch(batch)
            dt = time.time() - t_start
            if ok:
                for _, _ in batch:
                    pass  # (we use h not rel below)
                for rel_path, _ in batch:
                    # extract hash from rel
                    h_done = Path(rel_path).stem
                    done.add(h_done)
                progress['done'] = sorted(done)
                save_progress(progress)
                log(f'  [{i}/{len(todo)}] uploaded batch of {len(batch)} ({dt:.1f}s, total done: {len(done)})')
                batch = []
            else:
                for rel_path, _ in batch:
                    h_done = Path(rel_path).stem
                    failed[h_done] = 'upload failed'
                progress['failed'] = failed
                save_progress(progress)
                log(f'  [{i}/{len(todo)}] batch upload FAILED')
                batch = []

        # Progress report
        if i % 50 == 0:
            elapsed = time.time() - t0
            avg = elapsed / i
            eta = avg * (len(todo) - i)
            log(f'  === {i}/{len(todo)} | avg {avg:.2f}s/hash | ETA {eta/60:.1f}min ===')

    # Flush trailing batch
    if batch:
        t_start = time.time()
        ok = upload_batch(batch)
        if ok:
            for rel_path, _ in batch:
                h_done = Path(rel_path).stem
                done.add(h_done)
            progress['done'] = sorted(done)
            save_progress(progress)
            log(f'  flushed final batch of {len(batch)} ({time.time()-t_start:.1f}s)')
        else:
            for rel_path, _ in batch:
                h_done = Path(rel_path).stem
                failed[h_done] = 'upload failed'
            progress['failed'] = failed
            save_progress(progress)

    log(f'Done. Total: {(time.time()-t0)/60:.1f}min | done: {len(done)} | failed: {len(failed)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
