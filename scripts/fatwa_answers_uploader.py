#!/usr/bin/env python3
"""
Noor Platform — Fatwa Answers Uploader
======================================
Uploads data/fatwa_answers/ from noor-platform-shards to
noor-platform-fatwa. Each file is downloaded via HTTP GET, then
uploaded as a single commit. Resumable via _internal/progress.json
on the destination repo.
"""
import json, os, sys, time, urllib.error, urllib.request
from pathlib import Path

TARGET = 'hozifa1/noor-platform-fatwa'
SOURCE = 'hozifa1/noor-platform-shards'
TOKEN = os.environ.get('HF_TOKEN')
SRC_RESOLVE = f'https://huggingface.co/datasets/{SOURCE}/resolve/main'
DEST_RESOLVE = f'https://huggingface.co/datasets/{TARGET}/resolve/main'

ROOT = Path('/kaggle/working/noor-fatwa-answers')
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'split.log'

def log(m):
    line = f'[{time.strftime("%H:%M:%S")}] {m}'
    print(line, flush=True)
    with LOG.open('a', encoding='utf-8') as f:
        f.write(line + '\n')

def hf_get(url, max_retries=5, timeout=60):
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'noor-fatwa-ans/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if e.code == 429:
                wait = 30 * (2 ** (attempt-1))
                log(f'  429, retry in {wait}s')
                time.sleep(wait)
                continue
            return None
        except Exception:
            if attempt < max_retries:
                time.sleep(15*attempt); continue
            return None
    return None

def hf_head(url):
    try:
        req = urllib.request.Request(url, method='HEAD',
                                    headers={'User-Agent': 'noor-fatwa-ans/1.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200
    except Exception:
        return False

def get_subdirs():
    """Use the tree API to list data/fatwa_answers/XX subdirs. We
    only need 256 list calls (one per XX), not 256^2."""
    subdirs = []
    for ab in '0123456789abcdef':
        url = f'https://huggingface.co/api/datasets/{SOURCE}/tree/main/data/fatwa_answers/{ab}'
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'noor-fatwa-ans/1.0'})
                with urllib.request.urlopen(req, timeout=60) as r:
                    children = json.loads(r.read())
                for c in children:
                    if c.get('type') == 'directory':
                        subdirs.append(c['path'])
                    elif c.get('type') == 'file':
                        subdirs.append(c['path'])
                break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait = 60 * (2**attempt)
                    log(f'  429 on {ab}, waiting {wait}s')
                    time.sleep(wait); continue
                break
            except Exception:
                if attempt < 4:
                    time.sleep(15*attempt); continue
                break
    return subdirs

def upload_one(rel, data):
    from huggingface_hub import CommitOperationAdd
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(data); tmp = f.name
    try:
        for attempt in range(1, 7):
            try:
                _api.create_commit(repo_id=TARGET, repo_type='dataset',
                    operations=[CommitOperationAdd(
                        path_in_repo=rel, path_or_fileobj=tmp)],
                    commit_message=f'fatwa: {rel}')
                return True
            except Exception:
                if attempt == 6: return False
                time.sleep(2**attempt)
    finally:
        try: os.unlink(tmp)
        except: pass
    return False

def main():
    global _api
    ROOT.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    if not TOKEN:
        log('ERROR: HF_TOKEN not set'); return 1
    from huggingface_hub import HfApi
    _api = HfApi(token=TOKEN)

    progress = {'done': [], 'failed': {}}
    if PROGRESS.exists():
        try: progress = json.loads(PROGRESS.read_text())
        except: pass
    done = set(progress.get('done', []))

    log('listing data/fatwa_answers subdirs...')
    files = get_subdirs()
    log(f'  found {len(files)} files in subdirs')

    todo = [f for f in files if f not in done]
    log(f'  remaining: {len(todo)}')

    t0 = time.time()
    for i, rel in enumerate(todo, 1):
        try:
            if hf_head(f'{DEST_RESOLVE}/{rel}'):
                done.add(rel)
                progress['done'] = sorted(done)
                PROGRESS.write_text(json.dumps(progress))
                continue
            data = hf_get(f'{SRC_RESOLVE}/{rel}', timeout=300)
            if data is None:
                log(f'  [{i}/{len(todo)}] {rel}: download failed')
                continue
            if upload_one(rel, data):
                done.add(rel)
                progress['done'] = sorted(done)
                PROGRESS.write_text(json.dumps(progress))
                log(f'  [{i}/{len(todo)}] {rel}: ok ({len(data)} bytes)')
            else:
                log(f'  [{i}/{len(todo)}] {rel}: upload failed')
        except KeyboardInterrupt:
            log('Interrupted. Restart to resume.')
            return 2
        except Exception as e:
            log(f'  [{i}/{len(todo)}] {rel}: FAILED ({e})')

    log(f'Done. Total: {(time.time()-t0)/60:.1f}min')
    return 0

if __name__ == '__main__':
    _api = None
    sys.exit(main())
