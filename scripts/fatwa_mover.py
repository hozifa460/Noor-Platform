#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Fatwa Mover (v4: tree-free)
============================================

Copies fatwa data from `hozifa1/noor-platform-shards` to
`hozifa1/noor-platform-fatwa`. Uses NO tree API at all — just direct
file paths and per-file HEAD/GET against the resolve endpoint.

Strategy
--------
1. For each known fatwa file path, attempt HEAD on the source repo.
   If it returns 200, the file exists. We don't enumerate directories.
2. For 2-level sharded paths (data/micro_shards/ab/cd/hash.json and
   data/fatwa_answers/ab/cd/hash.json), we use the prefix_router.json
   we know is at the top of micro_shards to find every hash that
   actually exists.
3. Skip files already in destination (HEAD against dest).
4. For each new file: GET from source, create_commit on dest.

Resume-safe: progress.json mirrored to dest under _internal/.
"""
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

TARGET_REPO = 'hozifa1/noor-platform-fatwa'
SOURCE_REPO = 'hozifa1/noor-platform-shards'
TOKEN = os.environ.get('HF_TOKEN')

SOURCE_RESOLVE = f'https://huggingface.co/datasets/{SOURCE_REPO}/resolve/main'
DEST_RESOLVE = f'https://huggingface.co/datasets/{TARGET_REPO}/resolve/main'

ROOT = Path(os.environ.get('NOOR_STAGING', '/kaggle/working/noor-fatwa'))
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'split.log'

# Top-level known fatwa files (no sharding).
TOP_LEVEL_FILES = [
    'data/fatwas_manifest.json',
    'data/fatwa_browse/aqeedah.json',
    'data/fatwa_browse/contemporary.json',
    'data/fatwa_browse/family.json',
    'data/fatwa_browse/manifest.json',
    'data/fatwa_browse/muamalat.json',
    'data/fatwa_browse/salah.json',
    'data/fatwa_browse/scholars.json',
    'data/fatwa_browse/zakah.json',
    'data/shards/aqeedah.json',
    'data/shards/contemporary.json',
    'data/shards/family.json',
    'data/shards/manifest_index.json',
    'data/shards/muamalat.json',
    'data/shards/salah.json',
    'data/shards/zakah.json',
    'data/micro_shards/prefix_router.json',
    'data/micro_shards/showcase.json',
]

_api = None


def log(msg: str) -> None:
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line, flush=True)
    if LOG.parent.exists():
        with LOG.open('a', encoding='utf-8') as f:
            f.write(line + '\n')


def hf_get(url: str, max_retries: int = 5, timeout: int = 60) -> bytes | None:
    """GET with 429/timeout backoff. Returns None on 404."""
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url, headers={'User-Agent': 'noor-fatwa/4.0'}
            )
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                wait = 30 * (2 ** (attempt - 1))
                log(f'  429 on {url[:80]}..., retry in {wait}s')
                time.sleep(wait)
                continue
            log(f'  HTTP {e.code} on {url[:80]}...: {e}')
            return None
        except Exception as e:
            if attempt < max_retries:
                wait = 15 * attempt
                log(f'  error on {url[:80]}..., retry in {wait}s ({type(e).__name__})')
                time.sleep(wait)
                continue
            log(f'  giving up on {url[:80]}...: {e}')
            return None
    return None


def hf_head(url: str, max_retries: int = 5) -> bool:
    """HEAD against resolve URL. True if file exists, False otherwise."""
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url, method='HEAD', headers={'User-Agent': 'noor-fatwa/4.0'}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status == 200
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False
            if e.code == 429:
                wait = 30 * (2 ** (attempt - 1))
                log(f'  HEAD 429, retry in {wait}s')
                time.sleep(wait)
                continue
            return False
        except Exception:
            if attempt < max_retries:
                time.sleep(15 * attempt)
                continue
            return False
    return False


def get_prefix_router_hashes() -> list[str]:
    """Read data/micro_shards/prefix_router.json and return every hash.

    The router looks like:
        { "ab": ["hash1", "hash2", ...], "cd": [...], ... }

    We use this to enumerate every 2-level path that exists, without
    using the tree API.
    """
    log('  reading micro_shards/prefix_router.json to enumerate hashes...')
    data = hf_get(f'{SOURCE_RESOLVE}/data/micro_shards/prefix_router.json',
                  timeout=120)
    if data is None:
        log('  could not read prefix_router.json')
        return []
    try:
        router = json.loads(data)
    except Exception as e:
        log(f'  failed to parse prefix_router.json: {e}')
        return []

    paths: list[str] = []
    for ab, hashes in router.items():
        if not isinstance(hashes, list):
            continue
        for h in hashes:
            # h is the full 8-char hash; the directory is ab/cd (first 2/next 2)
            if not isinstance(h, str) or len(h) < 4:
                continue
            cd = h[2:4]
            paths.append(f'data/micro_shards/{ab}/{cd}/{h}.json')
    log(f'  prefix_router yields {len(paths)} micro_shard files')
    return paths


def upload_one(rel_path: str, local_path: Path) -> bool:
    from huggingface_hub import CommitOperationAdd
    for attempt in range(1, 7):
        try:
            _api.create_commit(
                repo_id=TARGET_REPO,
                repo_type='dataset',
                operations=[CommitOperationAdd(
                    path_in_repo=rel_path,
                    path_or_fileobj=str(local_path),
                )],
                commit_message=f'fatwa: {rel_path}',
            )
            return True
        except Exception as e:
            if attempt == 6:
                log(f'  upload gave up on {rel_path}: {type(e).__name__}: {e}')
                return False
            wait = 2 ** attempt
            log(f'  upload 429/error on {rel_path}, retry in {wait}s')
            time.sleep(wait)
    return False


def save_progress(p: dict) -> None:
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')


def load_progress() -> dict:
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding='utf-8'))
        except Exception:
            pass
    try:
        data = hf_get(f'{DEST_RESOLVE}/_internal/progress.json', timeout=30)
        if data is not None:
            p = json.loads(data)
            PROGRESS.parent.mkdir(parents=True, exist_ok=True)
            PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
            return p
    except Exception:
        pass
    return {'done': [], 'failed': {}}


def main() -> int:
    global _api
    ROOT.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    log('=' * 60)
    log(f'Source: {SOURCE_REPO}')
    log(f'Target: {TARGET_REPO}')

    if not TOKEN:
        log('ERROR: HF_TOKEN not set. On Kaggle add a Secret named HF_TOKEN.')
        return 1

    from huggingface_hub import HfApi
    _api = HfApi(token=TOKEN)

    progress = load_progress()
    done = set(progress['done'])
    failed = progress.get('failed', {})

    # 1. Build the candidate file list: top-level files + micro_shards from router
    log('Building candidate file list...')
    candidates: list[str] = list(TOP_LEVEL_FILES)

    # 2. Fetch prefix_router.json to enumerate every micro_shards file
    #    This is ONE network call (no tree API).
    router_paths = get_prefix_router_hashes()
    candidates.extend(router_paths)
    log(f'Total candidate files: {len(candidates)}')

    # 3. For each candidate, check if it exists on source (HEAD) and
    #    is missing on destination. We don't try to enumerate directories.

    todo = []
    for rel in candidates:
        if rel in done:
            continue
        # HEAD against source
        if not hf_head(f'{SOURCE_RESOLVE}/{rel}'):
            log(f'  skip {rel}: not in source')
            continue
        # HEAD against destination
        if hf_head(f'{DEST_RESOLVE}/{rel}'):
            log(f'  skip {rel}: already in dest')
            done.add(rel)
            progress['done'] = sorted(done)
            save_progress(progress)
            continue
        todo.append(rel)
    log(f'To migrate: {len(todo)}')

    t0 = time.time()
    for i, rel in enumerate(todo, 1):
        t_start = time.time()
        try:
            local = ROOT / 'staging' / rel
            local.parent.mkdir(parents=True, exist_ok=True)
            data = hf_get(f'{SOURCE_RESOLVE}/{rel}', timeout=300)
            if data is None:
                log(f'  [{i}/{len(todo)}] {rel}: download failed')
                failed[rel] = 'download failed'
                progress['failed'] = failed
                save_progress(progress)
                continue
            local.write_bytes(data)
            ok = upload_one(rel, local)
            if ok:
                dt = time.time() - t_start
                done.add(rel)
                failed.pop(rel, None)
                progress['done'] = sorted(done)
                progress['failed'] = failed
                save_progress(progress)
                try:
                    local.unlink()
                except OSError:
                    pass
                log(f'  [{i}/{len(todo)}] {rel}: ok ({dt:.1f}s, {len(data)/1024:.0f}KB)')
            else:
                failed[rel] = 'upload failed'
                progress['failed'] = failed
                save_progress(progress)
        except KeyboardInterrupt:
            log('Interrupted. Restart to resume.')
            return 2
        except Exception as e:
            log(f'  [{i}/{len(todo)}] {rel}: FAILED ({type(e).__name__}: {e})')
            failed[rel] = repr(e)[:200]
            progress['failed'] = failed
            save_progress(progress)

        if i % 10 == 0:
            elapsed = time.time() - t0
            avg = elapsed / i
            eta = avg * (len(todo) - i)
            log(f'  === progress: {i}/{len(todo)} | avg {avg:.1f}s/file | ETA {eta/60:.1f}min ===')

    log(f'Done. Total time: {(time.time()-t0)/60:.1f}min')
    return 0


if __name__ == '__main__':
    sys.exit(main())
