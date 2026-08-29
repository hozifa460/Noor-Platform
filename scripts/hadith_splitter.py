#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Hadith Splitter & Uploader
===========================================

Splits the 17 Hadith books (Bukhari, Muslim, ...) plus the HadeethEnc Sharh
dataset (3,500+ explanations) from `hozifa1/quran_and_sunnah` into per-book
chapters and uploads to `hozifa1/noor-platform-hadith`.

Designed to run on Kaggle (free 30h/week, fast internet) but works anywhere
with internet + Python 3.11. Resume-safe via HF-backed progress.json.

Output layout on HF (data/ subtree):
    hadith/
        books/
            bukhari/
                metadata.json          # book-level info from HF source
                toc.json                # array of chapter objects
                chapters/
                    000.json            # chunk of hadiths
                    001.json
                    ...
            muslim/
                ...
        sharh/
            hadeethenc_sharh.json        # full sharh, kept as one file
        _internal/
            progress.json                # resume checkpoint
"""
import json
import os
import shutil
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# ---- configuration (override via env) ------------------------------------
REPO = os.environ.get('HF_REPO', 'hozifa1/noor-platform-hadith')
TOKEN = os.environ.get('HF_TOKEN')  # set this via Kaggle Secrets
SOURCE_REPO = 'hozifa1/quran_and_sunnah'
# Use the tree API for listings (resolve/main returns 404 on directory paths).
LISTING_BASE = f'https://huggingface.co/api/datasets/{SOURCE_REPO}/tree/main/sunnahset'
# Use resolve/main for individual file downloads.
RESOLVE_BASE = f'https://huggingface.co/datasets/{SOURCE_REPO}/resolve/main/sunnahset'
BOOKS_DIR = f'{RESOLVE_BASE}/All_hadith_books'
BOOKS_LISTING = f'{LISTING_BASE}/All_hadith_books'
SHARH_URL = f'{RESOLVE_BASE}/HadeethEnc_Sharh/hadeethenc_sharh.json'

# Where we stage everything locally. On Kaggle this is /kaggle/working/.
ROOT = Path(os.environ.get('NOOR_STAGING', '/kaggle/working/noor-hadith'))
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'split.log'
STAGING = ROOT / 'data'

# HADITHS_PER_CHUNK controls chunk size. Each hadith is ~2KB on average,
# so 500 hadiths ≈ 1MB per chunk.
HADITHS_PER_CHUNK = 500
# Sharh is 3,500+ items. Keep as one file (~25MB).

# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line, flush=True)
    if LOG.parent.exists():
        with LOG.open('a', encoding='utf-8') as f:
            f.write(line + '\n')


def _safe_url(url: str) -> str:
    """Percent-encode the path portion so Arabic chars work. HuggingFace
    tree/list endpoints must be ASCII-safe."""
    parsed = urllib.parse.urlparse(url)
    encoded_path = urllib.parse.quote(parsed.path, safe='/')
    return urllib.parse.urlunparse(parsed._replace(path=encoded_path))


def hf_list_json(url: str):
    import urllib.error
    req = urllib.request.Request(_safe_url(url), headers={'User-Agent': 'noor-hadith/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def hf_download_raw(url: str, dest: Path) -> None:
    import urllib.error
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(_safe_url(url), headers={'User-Agent': 'noor-hadith/1.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        with dest.open('wb') as f:
            shutil.copyfileobj(r, f, length=1 << 20)


_remote_progress_api = None


def save_progress(p: dict) -> None:
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
    done_count = len(p.get('done', []))
    if done_count % 1 == 0 and _remote_progress_api is not None:
        # Every step so we always have a recent resume checkpoint.
        try:
            from huggingface_hub import CommitOperationAdd
            _remote_progress_api.create_commit(
                repo_id=REPO,
                repo_type='dataset',
                operations=[CommitOperationAdd(
                    path_in_repo='_internal/progress.json',
                    path_or_fileobj=str(PROGRESS),
                )],
                commit_message=f'progress: {done_count} steps done',
            )
        except Exception:
            pass


def load_progress() -> dict:
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding='utf-8'))
        except Exception:
            pass
    try:
        req = urllib.request.Request(
            f'https://huggingface.co/datasets/{REPO}/resolve/main/_internal/progress.json',
            headers={'User-Agent': 'noor-hadith/1.0'},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            p = json.loads(r.read())
            PROGRESS.parent.mkdir(parents=True, exist_ok=True)
            PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
            return p
    except Exception:
        pass
    return {'done': [], 'failed': {}}


def list_books() -> list[dict]:
    """Return [{fileName, label}] for the 17 Hadith books."""
    log(f'Listing books from {BOOKS_LISTING} ...')
    entries = hf_list_json(BOOKS_LISTING)
    books = []
    for e in entries:
        if e.get('type') == 'file' and e['path'].endswith('.json'):
            name = e['path'].rsplit('/', 1)[-1]
            base = name[:-5]  # strip .json
            books.append({'fileName': name, 'label': base})
    log(f'Found {len(books)} hadith books')
    return books


def split_book(book: dict) -> Path | None:
    """Download a hadith book, split into per-chapter chunks, return local
    book directory. Caller is responsible for uploading + cleanup."""
    import urllib.error
    fname = book['fileName']
    label = book['label']
    out_dir = STAGING / 'hadith' / 'books' / label
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Download the full book JSON
        raw_path = out_dir / '_raw.json'
        hf_download_raw(f'{BOOKS_DIR}/{fname}', raw_path)

        with raw_path.open('r', encoding='utf-8') as f:
            data = json.load(f)

        # 2. metadata.json — slim version of the root object
        meta = {
            'id': data.get('id'),
            'label': label,
            'fileName': fname,
            'sourceRepo': SOURCE_REPO,
        }
        if isinstance(data.get('metadata'), dict):
            m = data['metadata']
            ar = (m.get('arabic') or {})
            en = (m.get('english') or {})
            meta.update({
                'title_ar': ar.get('title'),
                'author_ar': ar.get('author'),
                'introduction_ar': ar.get('introduction'),
                'title_en': en.get('title'),
                'author_en': en.get('author'),
                'length': m.get('length') or m.get('hadith_count'),
            })
        (out_dir / 'metadata.json').write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')

        # 3. toc.json — list of chapters with their hadith count
        hadiths = data.get('hadiths') or []
        chapters_map: dict[str, dict] = {}
        for h in hadiths:
            ch = h.get('chapter') or h.get('chapterId') or 'unknown'
            if ch not in chapters_map:
                chapters_map[ch] = {
                    'id': ch,
                    'count': 0,
                    'firstHadithId': h.get('id') or h.get('idInBook'),
                }
            chapters_map[ch]['count'] += 1
        toc = sorted(chapters_map.values(), key=lambda c: str(c.get('id', '')))
        (out_dir / 'toc.json').write_text(
            json.dumps(toc, ensure_ascii=False, indent=2), encoding='utf-8')

        # 4. chapters/ — chunked hadiths, 500 per file
        chapters_dir = out_dir / 'chapters'
        chapters_dir.mkdir(exist_ok=True)
        chunk_idx = 0
        for i in range(0, len(hadiths), HADITHS_PER_CHUNK):
            slice_ = hadiths[i:i + HADITHS_PER_CHUNK]
            (chapters_dir / f'{chunk_idx:03d}.json').write_text(
                json.dumps(slice_, ensure_ascii=False), encoding='utf-8')
            chunk_idx += 1

        # 5. index.json
        index = {
            'label': label,
            'fileName': fname,
            'totalHadiths': len(hadiths),
            'chapterCount': len(chapters_map),
            'chunkCount': chunk_idx,
        }
        (out_dir / 'index.json').write_text(
            json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')

        # 6. Remove raw file (we don't want to upload the full 12MB JSON)
        raw_path.unlink(missing_ok=True)

        return out_dir
    except urllib.error.HTTPError as e:
        log(f'  ! HTTP {e.code} for {fname}')
        shutil.rmtree(out_dir, ignore_errors=True)
        return None
    except Exception:
        shutil.rmtree(out_dir, ignore_errors=True)
        raise


def upload_book(local_dir: Path, api) -> None:
    """Upload one hadith book's directory to HF as a single commit."""
    from huggingface_hub import CommitOperationAdd
    ops = []
    for p in sorted(local_dir.rglob('*')):
        if p.is_file():
            rel = str(p.relative_to(ROOT))
            ops.append(CommitOperationAdd(path_in_repo=rel, path_or_fileobj=str(p)))
    if not ops:
        return
    for attempt in range(1, 6):
        try:
            api.create_commit(
                repo_id=REPO,
                repo_type='dataset',
                operations=ops,
                commit_message=f'hadith: book {local_dir.name} ({len(ops)} files)',
            )
            return
        except Exception as e:
            if attempt == 5:
                raise
            wait = 2 ** attempt
            log(f'    retry in {wait}s ({type(e).__name__})')
            time.sleep(wait)


def split_and_upload_sharh(api) -> bool:
    """Download the full 25MB sharh and upload to hadith/sharh/."""
    import urllib.error
    sharh_dir = STAGING / 'hadith' / 'sharh'
    sharh_dir.mkdir(parents=True, exist_ok=True)
    dest = sharh_dir / 'hadeethenc_sharh.json'
    try:
        log('  Downloading HadeethEnc sharh ...')
        hf_download_raw(SHARH_URL, dest)
        # Re-format as a leaner array
        log('  Re-formatting sharh ...')
        with dest.open('r', encoding='utf-8') as f:
            raw = json.load(f)
        # The source format may be a dict, list, or {"data": [...]}; normalize
        if isinstance(raw, dict) and 'data' in raw:
            items = raw['data']
        elif isinstance(raw, list):
            items = raw
        else:
            items = [raw]
        dest.write_text(json.dumps(items, ensure_ascii=False), encoding='utf-8')
        log(f'  Uploading {len(items)} sharh items ...')
        upload_book(sharh_dir, api)
        return True
    except urllib.error.HTTPError as e:
        log(f'  ! Sharh HTTP {e.code}')
        return False
    finally:
        shutil.rmtree(sharh_dir, ignore_errors=True)


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    log('=' * 60)
    log(f'Target repo: {REPO}')
    log(f'Source repo: {SOURCE_REPO}')

    if not TOKEN:
        log('ERROR: HF_TOKEN not set. On Kaggle add a Secret named HF_TOKEN.')
        return 1

    from huggingface_hub import HfApi
    api = HfApi(token=TOKEN)
    global _remote_progress_api
    _remote_progress_api = api

    progress = load_progress()
    done = set(progress.get('done', []))
    failed = progress.get('failed', {})

    # Step 1: 17 hadith books
    books = list_books()
    todo_books = [b for b in books if f'book:{b["label"]}' not in done]
    log(f'Books: {len(books)} | Already done: {len(done)} | Remaining: {len(todo_books)}')

    t0 = time.time()
    for i, b in enumerate(todo_books, 1):
        label = b['label']
        try:
            local = split_book(b)
            if local is None:
                log(f'  [{i}/{len(todo_books)}] {label}: skipped')
                done.add(f'book:{label}')
                progress['done'] = sorted(done)
                save_progress(progress)
                continue
            upload_book(local, api)
            shutil.rmtree(local, ignore_errors=True)
            dt = time.time() - t0
            done.add(f'book:{label}')
            failed.pop(f'book:{label}', None)
            progress['done'] = sorted(done)
            progress['failed'] = failed
            save_progress(progress)
            log(f'  [{i}/{len(todo_books)}] {label}: ok (elapsed {dt:.1f}s)')
        except KeyboardInterrupt:
            log('Interrupted — restart to resume.')
            return 2
        except Exception as e:
            log(f'  [{i}/{len(todo_books)}] {label}: FAILED ({type(e).__name__}: {e})')
            failed[f'book:{label}'] = repr(e)[:200]
            progress['failed'] = failed
            save_progress(progress)

    # Step 2: HadeethEnc Sharh
    if 'sharh' not in done:
        try:
            if split_and_upload_sharh(api):
                done.add('sharh')
                progress['done'] = sorted(done)
                save_progress(progress)
                log('  sharh: ok')
        except KeyboardInterrupt:
            log('Interrupted — restart to resume.')
            return 2
        except Exception as e:
            log(f'  sharh: FAILED ({type(e).__name__}: {e})')
            failed['sharh'] = repr(e)[:200]
            progress['failed'] = failed
            save_progress(progress)

    log(f'Done. Total time: {(time.time()-t0)/60:.1f}m')
    return 0


if __name__ == '__main__':
    sys.exit(main())
