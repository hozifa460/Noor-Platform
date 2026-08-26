#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Noor Platform — Shamela 4 Splitter & Uploader
==============================================

Splits every Shamela 4 book (8,589 books) on HuggingFace into chapter chunks
and uploads them to hozifa1/noor-platform-shards. Designed to run on Kaggle
(free 30h/week, fast internet) but works anywhere with internet + Python 3.11.

Layout per book (writes to ./staging/data/books/shamela/<shamelaId>/):
    book_metadata.json
    toc.json
    chapters/
        000.json        # first 20 pages
        001.json        # next 20
        ...
    pages_full.jsonl   # all pages, kept for any consumer that needs the whole book

Resume safety
-------------
A `progress.json` file is written under ./staging/. On every restart the
script skips already-uploaded books and resumes from the last successful
upload batch. Safe to interrupt with Ctrl+C or kill the kernel.

Usage on Kaggle
---------------
1. New notebook → enable "Internet on"
2. Add a HuggingFace token via Secrets (name: HF_TOKEN, value: <your token>)
3. Add the username/organisation via Secrets (name: HF_USERNAME, value: hozifa1)
4. Run all cells.
5. After ~1-2h all 8,589 books will be on HF.
"""
import json
import os
import shutil
import sys
import time
from pathlib import Path

# ---- configuration (override via env) -----------------------------------
REPO = os.environ.get('HF_REPO', 'hozifa1/noor-platform-shards')
TOKEN = os.environ.get('HF_TOKEN')  # set this via Kaggle Secrets
SOURCE = 'AuthenticIlm/Shamela4_Full_DB'
SOURCE_URL = f'https://huggingface.co/datasets/{SOURCE}/resolve/main'

# Where we stage everything locally. On Kaggle this is /kaggle/working/.
# progress.json lives at STAGING/progress.json so it survives the per-book
# rmtree below and continues to be the resume checkpoint.
ROOT = Path(os.environ.get('NOOR_STAGING', '/kaggle/working/noor-shamela'))
STAGING = ROOT
PROGRESS = ROOT / 'progress.json'
LOG = ROOT / 'split.log'

# Kaggle datasets hf_hub_download reads from a cache. Clean it first so we
# always stream fresh from HF.
HF_CACHE = Path(os.environ.get('HF_HOME', '/kaggle/working/hf-cache'))
HF_CACHE.mkdir(parents=True, exist_ok=True)

# PAGES_PER_CHAPTER controls chunk size (matches book-text-engine.ts).
PAGES_PER_CHAPTER = 20
# How many chunked books to keep in memory while uploading.
BATCH = 50

# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line, flush=True)
    if LOG.parent.exists():
        with LOG.open('a', encoding='utf-8') as f:
            f.write(line + '\n')


def load_progress() -> dict:
    """Load progress.json. Local first, then HF as a fallback (in case the
    Kaggle session was wiped but the run did upload progress to HF)."""
    if PROGRESS.exists():
        try:
            return json.loads(PROGRESS.read_text(encoding='utf-8'))
        except Exception:
            pass
    # Try HF as a fallback
    try:
        import urllib.request
        req = urllib.request.Request(
            f'https://huggingface.co/datasets/{REPO}/resolve/main/_internal/progress.json',
            headers={'User-Agent': 'noor-splitter/1.0'},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            p = json.loads(r.read())
            # Cache locally so subsequent reads don't need a round-trip
            PROGRESS.parent.mkdir(parents=True, exist_ok=True)
            PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
            return p
    except Exception:
        pass
    return {'done': [], 'failed': {}}


def save_progress(p: dict) -> None:
    """Persist progress locally AND to HF so it survives Kaggle session loss.
    Local write is fast; the HF upload is best-effort and only fires every
    10 books to avoid rate-limiting."""
    PROGRESS.write_text(json.dumps(p, ensure_ascii=False), encoding='utf-8')
    # Cheaper than a full progress parse: just check a counter we append
    done_count = len(p.get('done', []))
    if done_count % 10 == 0 and _remote_progress_api is not None:
        try:
            from huggingface_hub import CommitOperationAdd
            _remote_progress_api.create_commit(
                repo_id=REPO,
                repo_type='dataset',
                operations=[CommitOperationAdd(
                    path_in_repo='_internal/progress.json',
                    path_or_fileobj=str(PROGRESS),
                )],
                commit_message=f'progress: {done_count} books done',
            )
        except Exception:
            # best-effort; local copy is the source of truth
            pass


# Set by main() so save_progress can do its best-effort HF upload.
_remote_progress_api = None


def hf_list_json(url: str) -> list:
    """GET a JSON array from HF dataset tree endpoint."""
    import urllib.request
    req = urllib.request.Request(url, headers={'User-Agent': 'noor-splitter/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def hf_download_raw(url: str, dest: Path) -> None:
    """Stream a file from HF into dest (no LFS, just a normal raw file)."""
    import urllib.request
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'noor-splitter/1.0'})
    with urllib.request.urlopen(req, timeout=300) as r:
        with dest.open('wb') as f:
            shutil.copyfileobj(r, f, length=1 << 20)  # 1MB chunks


def list_books() -> list[dict]:
    """Walk AuthenticIlm/Shamela4_Full_DB and return every book directory
    as (section, book_dir, shamelaId, bookPath).

    Shamela book ids are embedded in the folder name: e.g. 1__الفواكه...
    → shamelaId=1. We use a small regex instead of fetching 8.5k manifests.
    """
    import re
    log(f'Listing Shamela 4 sections from {SOURCE} ...')
    sections = hf_list_json(f'https://huggingface.co/api/datasets/{SOURCE}/tree/main')
    log(f'  found {len(sections)} top-level sections')
    out: list[dict] = []
    for i, sec in enumerate(sections, 1):
        sec_path = sec['path']
        sec_name = sec_path.split('__', 1)[-1]  # after the numeric prefix
        log(f'  [{i}/{len(sections)}] scanning {sec_path} ...')
        try:
            books = hf_list_json(f'https://huggingface.co/api/datasets/{SOURCE}/tree/main/{sec_path}')
        except Exception as e:
            log(f'    ! could not list {sec_path}: {e}')
            continue
        for b in books:
            bpath = b['path']
            m = re.match(r'(\d+)__', bpath.split('/')[-1])
            if not m:
                continue
            out.append({
                'shamelaId': int(m.group(1)),
                'section': sec_name,
                'bookPath': bpath,  # e.g. 01__العقيدة/1__الفواكه-...
            })
    log(f'Total books: {len(out)}')
    return out


def split_and_upload_book(book: dict, api) -> str:
    """Download a book, split it into chapter chunks, upload to HF, and
    delete the local copy. Returns one of: 'ok', 'skipped', 'failed'."""
    import urllib.error, glob
    bid = book['shamelaId']
    bpath = book['bookPath']
    out_dir = STAGING / 'data' / 'books' / 'shamela' / f'{bid:05d}'
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. book_metadata.json — small, copy as-is
        try:
            hf_download_raw(
                f'{SOURCE_URL}/{bpath}/book_metadata.json',
                out_dir / 'book_metadata.json',
            )
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 'skipped'  # book has no metadata
            raise

        # 2. toc.jsonl → toc.json (array)
        toc_path = out_dir / 'toc.json'
        try:
            hf_download_raw(f'{SOURCE_URL}/{bpath}/toc.jsonl', toc_path.with_suffix('.jsonl'))
        except urllib.error.HTTPError:
            pass
        if toc_path.with_suffix('.jsonl').exists():
            lines = toc_path.with_suffix('.jsonl').read_text(encoding='utf-8').splitlines()
            toc = [json.loads(ln) for ln in lines if ln.strip()]
            toc_path.write_text(json.dumps(toc, ensure_ascii=False), encoding='utf-8')
            toc_path.with_suffix('.jsonl').unlink(missing_ok=True)

        # 3. pages.jsonl → split into N chapters
        pages_full = out_dir / 'pages_full.jsonl'
        try:
            hf_download_raw(f'{SOURCE_URL}/{bpath}/pages.jsonl', pages_full)
        except urllib.error.HTTPError:
            return 'skipped'

        chapters_dir = out_dir / 'chapters'
        chapters_dir.mkdir(exist_ok=True)
        chunks_meta: list[dict] = []
        chunk_idx = 0
        buf: list[dict] = []
        with pages_full.open('r', encoding='utf-8') as f:
            for ln in f:
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    page = json.loads(ln)
                except Exception:
                    continue
                buf.append(page)
                if len(buf) >= PAGES_PER_CHAPTER:
                    _write_chapter(chapters_dir, chunk_idx, buf, chunks_meta)
                    chunk_idx += 1
                    buf = []
        if buf:
            _write_chapter(chapters_dir, chunk_idx, buf, chunks_meta)
            chunk_idx += 1

        # 4. index.json (one-line entry for the new /library list)
        chapters = sorted(chapters_dir.glob('*.json'))
        index = {
            'shamelaId': bid,
            'bookPath': bpath,
            'section': book['section'],
            'chapterCount': len(chapters),
            'totalPages': chunks_meta[-1]['endPage'] if chunks_meta else 0,
        }
        (out_dir / 'index.json').write_text(json.dumps(index, ensure_ascii=False), encoding='utf-8')

        # 5. Upload immediately
        upload_book(out_dir, api)

        # 6. Free disk — delete the book directory entirely
        shutil.rmtree(out_dir, ignore_errors=True)

        return 'ok'
    except Exception:
        # On any failure, clean up local files to avoid filling Kaggle disk
        shutil.rmtree(out_dir, ignore_errors=True)
        raise


def _write_chapter(chapters_dir: Path, idx: int, pages: list[dict], meta: list[dict]) -> None:
    """Write one chapter chunk and append a meta entry."""
    chunk_path = chapters_dir / f'{idx:03d}.json'
    chunk_path.write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
    meta.append({
        'chunk': idx,
        'startPage': pages[0].get('page_num') or pages[0].get('page_id') or 1,
        'endPage': pages[-1].get('page_num') or pages[-1].get('page_id') or len(pages),
        'count': len(pages),
    })


def upload_book(local_dir: Path, api) -> None:
    """Upload one book's directory to HF as a single commit. All files are
    small (max ~50MB even for a 1000-page book) so a single create_commit
    call is fine."""
    from huggingface_hub import CommitOperationAdd
    ops = []
    for p in sorted(local_dir.rglob('*')):
        if p.is_file():
            rel = str(p.relative_to(STAGING))
            ops.append(CommitOperationAdd(path_in_repo=rel, path_or_fileobj=str(p)))
    if not ops:
        return
    for attempt in range(1, 6):
        try:
            api.create_commit(
                repo_id=REPO,
                repo_type='dataset',
                operations=ops,
                commit_message=f'books: shamela/{local_dir.name} ({len(ops)} files)',
            )
            return
        except Exception as e:
            if attempt == 5:
                raise
            wait = 2 ** attempt
            log(f'    upload retry in {wait}s ({type(e).__name__})')
            time.sleep(wait)


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    log('=' * 60)
    log(f'Repo: {REPO}')
    log(f'Source: {SOURCE}')
    log(f'Staging: {STAGING}')

    if not TOKEN:
        log('ERROR: HF_TOKEN env var not set. On Kaggle: Add a Secret named HF_TOKEN.')
        return 1

    from huggingface_hub import HfApi
    api = HfApi(token=TOKEN)
    global _remote_progress_api
    _remote_progress_api = api

    # 1. List all books
    books_meta = ROOT / 'books_meta.json'
    if books_meta.exists():
        log(f'Loading book list from {books_meta} (cached) ...')
        books = json.loads(books_meta.read_text(encoding='utf-8'))
    else:
        books = list_books()
        books_meta.write_text(json.dumps(books, ensure_ascii=False), encoding='utf-8')
    log(f'Books to process: {len(books)}')

    # 2. Resume safety
    progress = load_progress()
    done = set(progress.get('done', []))
    failed = progress.get('failed', {})
    todo = [b for b in books if b['shamelaId'] not in done]
    log(f'Already done: {len(done)} | Remaining: {len(todo)} | Failed so far: {len(failed)}')

    t0 = time.time()
    for i, b in enumerate(todo, 1):
        bid = b['shamelaId']
        t_start = time.time()
        try:
            status = split_and_upload_book(b, api)
            dt = time.time() - t_start
            log(f'  [{i}/{len(todo)}] {bid:5d}: {status} in {dt:.1f}s')
            if status in ('ok', 'skipped'):
                done.add(bid)
                failed.pop(str(bid), None)
                progress['done'] = sorted(done)
                progress['failed'] = failed
                save_progress(progress)
        except KeyboardInterrupt:
            log('Interrupted. Progress saved — restart to resume.')
            return 2
        except Exception as e:
            log(f'  [{i}/{len(todo)}] {bid:5d}: FAILED ({type(e).__name__}: {e})')
            failed[str(bid)] = repr(e)[:200]
            progress['failed'] = failed
            save_progress(progress)
            # continue to next book — a single bad book shouldn't kill the run

        # Estimate ETA
        elapsed = time.time() - t0
        avg = elapsed / max(i, 1)
        eta = avg * (len(todo) - i)
        if i % 50 == 0:
            log(f'  === progress: {i}/{len(todo)} | avg {avg:.1f}s/book | ETA {eta/3600:.1f}h ===')

    log(f'All books processed. Total time: {(time.time()-t0)/3600:.1f}h')
    return 0


if __name__ == '__main__':
    sys.exit(main())
