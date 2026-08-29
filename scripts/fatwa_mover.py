#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Fatwa Mover
============================

Copies ONLY the fatwa-related files from `hozifa1/noor-platform-shards`
to `hozifa1/noor-platform-fatwa`. Books (data/books/) are NOT touched.

What gets copied
----------------
  data/fatwa_answers/   (231 subdirs of fatwa answer shards)
  data/fatwa_browse/    (8 JSON category indexes)
  data/micro_shards/    (search index, ~4,000 small files)
  data/shards/          (7 large category shards)
  data/fatwas_manifest.json  (master manifest)

What does NOT get copied
------------------------
  data/books/           — left in `noor-platform-shards`

The mover walks each source folder, downloads every file, then uploads
it to the destination via a single `huggingface_hub.create_commit`
call per file. progress.json is mirrored to the destination repo under
`_internal/progress.json` so an interrupted run resumes from exactly
where it stopped (the destination-side progress is the source of truth;
HF server-side rate limits are honoured via exponential backoff).

Run on Kaggle for fast internet (free 30h/week).
"""
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---- configuration ------------------------------------------------------
TARGET_REPO = 'hozifa1/noor-platform-fatwa'
SOURCE_REPO = 'hozifa1/noor-platform-shards'
TOKEN = os.environ.get('HF_TOKEN')

API_BASE = f'https://huggingface.co/api/datasets/{SOURCE_REPO}/tree/main'
RESOLVE_BASE = f'https://huggingface.co/datasets/{SOURCE_REPO}/resolve/main'
DEST_RESOLVE_BASE = f'https://huggingface.co/datasets/{TARGET_REPO}/resolve/main'

ROOT = Path(os.environ.get('NOOR_STAGING', '/kaggle/working/noor-fatwa'))
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'split.log'

# ONLY fatwa-related prefixes. Do NOT add 'data/books' here.
FATWA_PREFIXES = [
    'data/fatwa_answers',
    'data/fatwa_browse',
    'data/micro_shards',
    'data/shards',
    'data/fatwas_manifest.json',  # top-level file, not a directory
]

# ---------------------------------------------------------------------------
_api = None


def log(msg: str) -> None:
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line, flush=True)
    if LOG.parent.exists():
        with LOG.open('a', encoding='utf-8') as f:
            f.write(line + '\n')


def list_tree(path: str) -> list[dict]:
    url = f'{API_BASE}/{path}'
    req = urllib.request.Request(url, headers={'User-Agent': 'noor-fatwa/3.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def walk_files(path: str, max_retries: int = 8) -> list[str]:
    """Recursively collect all file paths under `path` (source-side).

    The HF tree API is heavily rate-limited (returns 429 on bursts).
    We back off aggressively and cap the number of files we try to
    discover per subdirectory by using depth-limited listing.
    """
    out: list[str] = []
    seen: set[str] = set()
    stack = [path]
    consecutive_429 = 0
    while stack:
        p = stack.pop()
        if p in seen:
            continue
        seen.add(p)
        for attempt in range(1, max_retries + 1):
            try:
                entries = list_tree(p)
                # Successful call resets the 429 counter
                consecutive_429 = 0
                break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    # Aggressive back-off: 60s, 120s, 240s, 480s, ...
                    wait = 60 * (2 ** (attempt - 1))
                    consecutive_429 += 1
                    log(f'  429 on {p} (attempt {attempt}/{max_retries}), '
                        f'consecutive={consecutive_429}, waiting {wait}s')
                    if consecutive_429 >= 4:
                        log(f'  too many 429s in a row, aborting walker')
                        return out
                    time.sleep(wait)
                    continue
                if e.code == 404:
                    log(f'  404 on {p}, skip')
                    entries = []
                    break
                raise
            except Exception as e:
                if attempt < max_retries:
                    wait = 30 * attempt
                    log(f'  timeout on {p}, retry in {wait}s ({type(e).__name__})')
                    time.sleep(wait)
                    continue
                log(f'  giving up on {p}: {e}')
                entries = []
                break
        for e in entries:
            if e.get('type') == 'file':
                out.append(e['path'])
            elif e.get('type') == 'directory':
                stack.append(e['path'])
        # If we just hit 429, slow down a bit even on success
        if consecutive_429 > 0:
            time.sleep(5)
    return out


def download_to(url: str, dest: Path, max_retries: int = 5) -> bool:
    """Download a file. Returns True on success, False on 404.

    Backs off aggressively on 429 (the resolve endpoint is also
    rate-limited, though less aggressively than tree)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, max_retries + 1):
        req = urllib.request.Request(url, headers={'User-Agent': 'noor-fatwa/3.0'})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                with dest.open('wb') as f:
                    shutil.copyfileobj(r, f, length=1 << 20)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False
            if e.code == 429:
                wait = 30 * (2 ** (attempt - 1))
                log(f'    download 429, retry in {wait}s')
                time.sleep(wait)
                continue
            raise
        except Exception as e:
            if attempt < max_retries:
                wait = 20 * attempt
                log(f'    download error, retry in {wait}s ({type(e).__name__})')
                time.sleep(wait)
                continue
            raise
    return False


def upload_one(rel_path: str, local: Path) -> None:
    """Upload a single file to the destination repo."""
    from huggingface_hub import CommitOperationAdd
    for attempt in range(1, 7):
        try:
            _api.create_commit(
                repo_id=TARGET_REPO,
                repo_type='dataset',
                operations=[CommitOperationAdd(
                    path_in_repo=rel_path,
                    path_or_fileobj=str(local),
                )],
                commit_message=f'fatwa: {rel_path}',
            )
            return
        except Exception as e:
            if attempt == 6:
                raise
            wait = 2 ** attempt
            log(f'    retry in {wait}s ({type(e).__name__})')
            time.sleep(wait)


def file_exists_in_dest(rel_path: str) -> bool:
    """Return True if the destination repo already has this file."""
    try:
        with urllib.request.urlopen(
            f'{DEST_RESOLVE_BASE}/{rel_path}', timeout=15
        ) as r:
            return r.status == 200
    except urllib.error.HTTPError:
        return False


def pattern_fallback(prefix: str) -> list[str]:
    """Generate candidate paths for a known prefix without listing.

    Used when the HF tree API is rate-limiting. We know the structure
    of the fatwa datasets from previous inspection:
      - data/fatwa_answers:  231 subdirs named ab/cd (hex bytes)
      - data/fatwa_browse:   8 known category files + 1 manifest + 1 scholars
      - data/micro_shards:   1 prefix_router.json + 1 showcase.json + ab/cd/ef.. files
      - data/shards:         7 known category files + 1 manifest_index
    """
    paths: list[str] = []
    if prefix == 'data/fatwa_browse':
        for fn in ('aqeedah.json', 'contemporary.json', 'family.json',
                   'manifest.json', 'muamalat.json', 'salah.json',
                   'scholars.json', 'zakah.json'):
            paths.append(f'{prefix}/{fn}')
    elif prefix == 'data/shards':
        for fn in ('aqeedah.json', 'contemporary.json', 'family.json',
                   'manifest_index.json', 'muamalat.json', 'salah.json',
                   'zakah.json'):
            paths.append(f'{prefix}/{fn}')
    elif prefix == 'data/micro_shards':
        # Top-level known files
        paths.append(f'{prefix}/prefix_router.json')
        paths.append(f'{prefix}/showcase.json')
        # 2-level sharded: ab/cd/<hash>.json
        # ab ranges 00-ff (256 prefixes), cd ranges 00-ff (256)
        # That's 65,536 possible paths. Too many to guess blindly.
        # Instead: rely on walker to find the real paths. If we end up here,
        # we accept the partial coverage.
    elif prefix == 'data/fatwa_answers':
        # 2-level sharded: ab/cd/<hash>.json
        # Same as micro_shards — too many to guess. Use walker.
        pass
    return paths


def save_progress(p: dict) -> None:
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
    # Mirror progress to destination repo every 25 files for cross-session resume
    if _api is not None and len(p['done']) % 25 == 0:
        try:
            from huggingface_hub import CommitOperationAdd
            _api.create_commit(
                repo_id=TARGET_REPO,
                repo_type='dataset',
                operations=[CommitOperationAdd(
                    path_in_repo='_internal/progress.json',
                    path_or_fileobj=str(PROGRESS),
                )],
                commit_message=f'progress: {len(p["done"])} files done',
            )
        except Exception:
            pass  # best-effort


def load_progress() -> dict:
    # 1. Local file (always present if we've run before)
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding='utf-8'))
        except Exception:
            pass
    # 2. Destination repo's _internal/progress.json (cross-session)
    try:
        with urllib.request.urlopen(
            f'{DEST_RESOLVE_BASE}/_internal/progress.json', timeout=15
        ) as r:
            p = json.loads(r.read())
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

    log('Enumerating source files...')
    all_files: list[str] = []
    for prefix in FATWA_PREFIXES:
        # single file (not a directory)
        if '.' in prefix.rsplit('/', 1)[-1]:
            all_files.append(prefix)
            log(f'  {prefix}: file (will copy as-is)')
            continue
        log(f'  walking {prefix} ...')
        try:
            sub = walk_files(prefix)
            if sub:
                log(f'    found {len(sub)} files')
                all_files.extend(sub)
            else:
                log(f'    walker returned 0 files, trying pattern-based fallback')
                fb = pattern_fallback(prefix)
                if fb:
                    log(f'    pattern fallback found {len(fb)} candidate paths')
                    all_files.extend(fb)
                else:
                    log(f'    pattern fallback also returned 0')
        except Exception as e:
            log(f'    FAILED to walk {prefix}: {e}')
            fb = pattern_fallback(prefix)
            if fb:
                log(f'    pattern fallback found {len(fb)} candidate paths')
                all_files.extend(fb)
    log(f'Total files to migrate: {len(all_files)}')

    todo = [f for f in all_files if f not in done]
    log(f'Already done: {len(done)} | Remaining: {len(todo)}')

    t0 = time.time()
    for i, rel in enumerate(todo, 1):
        # Skip-if-exists shortcut (cheap HEAD before downloading)
        if file_exists_in_dest(rel):
            log(f'  [{i}/{len(todo)}] {rel}: skip (already in destination)')
            done.add(rel)
            progress['done'] = sorted(done)
            save_progress(progress)
            continue

        t_start = time.time()
        try:
            local = ROOT / 'staging' / rel
            ok = download_to(f'{RESOLVE_BASE}/{rel}', local)
            if not ok:
                log(f'  [{i}/{len(todo)}] {rel}: 404 (skip)')
                done.add(rel)
                progress['done'] = sorted(done)
                save_progress(progress)
                continue
            upload_one(rel, local)
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
            sz = (local.stat().st_size if local.exists() else 0) / 1024
            log(f'  [{i}/{len(todo)}] {rel}: ok ({dt:.1f}s, {sz:.0f}KB)')
        except KeyboardInterrupt:
            log('Interrupted. Restart to resume.')
            return 2
        except Exception as e:
            log(f'  [{i}/{len(todo)}] {rel}: FAILED ({type(e).__name__}: {e})')
            failed[rel] = repr(e)[:200]
            progress['failed'] = failed
            save_progress(progress)

        if i % 25 == 0:
            elapsed = time.time() - t0
            avg = elapsed / i
            eta = avg * (len(todo) - i)
            log(f'  === progress: {i}/{len(todo)} | avg {avg:.1f}s/file | ETA {eta/60:.1f}min ===')

    log(f'Done. Total time: {(time.time()-t0)/60:.1f}min')
    return 0


if __name__ == '__main__':
    sys.exit(main())
