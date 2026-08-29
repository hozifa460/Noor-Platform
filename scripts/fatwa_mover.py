#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Fatwa Mover
============================

Copies the fatwa subset of `hozifa1/noor-platform-shards` to the new
dedicated repo `hozifa1/noor-platform-fatwa`. The mover walks each
source folder one level at a time, downloads each file, and uploads
it to the destination via a single `huggingface_hub.create_commit`
call. Every file becomes one commit, so the mover is naturally
resume-safe: re-running it skips any path already in progress.json.

Run on Kaggle for fast internet (free 30h/week).
"""
import json
import os
import shutil
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

REPO = os.environ.get('HF_REPO', 'hozifa1/noor-platform-fatwa')
TOKEN = os.environ.get('HF_TOKEN')
SOURCE_REPO = 'hozifa1/noor-platform-shards'
SOURCE_BASE = f'https://huggingface.co/datasets/{SOURCE_REPO}/resolve/main'
API_BASE = f'https://huggingface.co/api/datasets/{SOURCE_REPO}/tree/main'

ROOT = Path(os.environ.get('NOOR_STAGING', '/kaggle/working/noor-fatwa'))
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'split.log'

PLAN = [
    ('data/fatwas_manifest.json', False),
    ('data/fatwa_browse', True),
    ('data/shards', True),
    ('data/micro_shards', True),
    ('data/fatwa_answers', True),
]

_remote_api = None


def log(msg: str) -> None:
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line, flush=True)
    if LOG.parent.exists():
        with LOG.open('a', encoding='utf-8') as f:
            f.write(line + '\n')


def list_tree(path: str) -> list[dict]:
    url = f'{API_BASE}/{path}'
    req = urllib.request.Request(url, headers={'User-Agent': 'noor-fatwa/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def walk_files(path: str) -> list[str]:
    out: list[str] = []
    stack = [path]
    while stack:
        p = stack.pop()
        try:
            entries = list_tree(p)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                log(f'  (skip) {p}: 404')
                continue
            raise
        for e in entries:
            if e.get('type') == 'file':
                out.append(e['path'])
            elif e.get('type') == 'directory':
                stack.append(e['path'])
    return out


def download_to(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'noor-fatwa/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            with dest.open('wb') as f:
                shutil.copyfileobj(r, f, length=1 << 20)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise


def upload_one(rel_path: str, local: Path) -> None:
    from huggingface_hub import CommitOperationAdd
    for attempt in range(1, 7):
        try:
            _remote_api.create_commit(
                repo_id=REPO,
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


def save_progress(p: dict) -> None:
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
    if _remote_api is not None and len(p['done']) % 10 == 0:
        try:
            from huggingface_hub import CommitOperationAdd
            _remote_api.create_commit(
                repo_id=REPO,
                repo_type='dataset',
                operations=[CommitOperationAdd(
                    path_in_repo='_internal/progress.json',
                    path_or_fileobj=str(PROGRESS),
                )],
                commit_message=f'progress: {len(p["done"])} files done',
            )
        except Exception as e:
            log(f'    progress upload warn: {e}')


def load_progress() -> dict:
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding='utf-8'))
        except Exception:
            pass
    try:
        url = f'https://huggingface.co/datasets/{REPO}/resolve/main/_internal/progress.json'
        with urllib.request.urlopen(url, timeout=15) as r:
            p = json.loads(r.read())
            PROGRESS.parent.mkdir(parents=True, exist_ok=True)
            PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
            return p
    except Exception:
        pass
    return {'done': [], 'failed': {}}


def main() -> int:
    global _remote_api
    ROOT.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    log('=' * 60)
    log(f'Target repo: {REPO}')
    log(f'Source repo: {SOURCE_REPO}')

    if not TOKEN:
        log('ERROR: HF_TOKEN not set. On Kaggle add a Secret named HF_TOKEN.')
        return 1

    from huggingface_hub import HfApi
    _remote_api = HfApi(token=TOKEN)

    progress = load_progress()
    done = set(progress['done'])
    failed = progress.get('failed', {})

    log('Enumerating source files...')
    all_files: list[str] = []
    for prefix, is_dir in PLAN:
        if not is_dir:
            all_files.append(prefix)
            continue
        log(f'  walking {prefix} ...')
        try:
            sub = walk_files(prefix)
            log(f'    found {len(sub)} files')
            all_files.extend(sub)
        except Exception as e:
            log(f'    FAILED to walk {prefix}: {e}')
    log(f'Total files to migrate: {len(all_files)}')

    todo = [f for f in all_files if f not in done]
    log(f'Already done: {len(done)} | Remaining: {len(todo)}')

    t0 = time.time()
    for i, rel in enumerate(todo, 1):
        t_start = time.time()
        try:
            local = ROOT / 'staging' / rel
            ok = download_to(f'{SOURCE_BASE}/{rel}', local)
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
            log(f'  [{i}/{len(todo)}] {rel}: ok ({dt:.1f}s)')
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
