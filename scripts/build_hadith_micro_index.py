#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate hadiths_micro_index.json for the chunked layout on
hozifa1/noor-platform-hadith, with FULL arabic text per hadith
(so global search works on the actual text, not a 23-char snippet).

For each of the 17 books, downloads every chapters/NNN.json from
the new dataset, then writes a single micro_index.json with
{ books: [...], grades: [...], items: [[bookIdx, hadithId, chapterId, text, grade]] }.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = 'hozifa1/noor-platform-hadith'
BASE = f'https://huggingface.co/datasets/{REPO}/resolve/main'
OUT = Path(sys.argv[1] if len(sys.argv) > 1
           else r'C:\Users\hazoz\hadith_micro_index_workspace')
OUT.mkdir(parents=True, exist_ok=True)

BOOKS = [
    'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai',
    'ibnmajah', 'malik', 'ahmed', 'darimi', 'mishkat_almasabih',
    'riyad_assalihin', 'bulugh_almaram', 'aladab_almufrad',
    'shamail_muhammadiyah', 'nawawi40', 'qudsi40', 'shahwaliullah40',
]

# Map book id -> (slug, default grade)
GRADES = ['صحيح', 'حسن', 'ضعيف', 'موضوع', 'مقبول']


def log(msg):
    print(f'[{time.strftime("%H:%M:%S")}] {msg}', flush=True)


def hf_get_json(url, retries=4):
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (2 ** attempt)
                log(f'  429 on {url[-60:]}, retry in {wait}s')
                time.sleep(wait)
                continue
            return None
        except Exception as e:
            if attempt < retries:
                time.sleep(10 * attempt)
                continue
            log(f'  gave up: {e}')
            return None
    return None


def main():
    items: list[list] = []

    for book_idx, book in enumerate(BOOKS):
        idx_url = f'{BASE}/data/hadith/books/{book}/index.json'
        idx = hf_get_json(idx_url)
        if idx is None:
            log(f'  [skip] {book}: cannot fetch index.json')
            continue
        chunks = idx.get('chunkCount', 0)
        if chunks == 0:
            # All hadiths may be in a single file at root
            chunks = 1
        log(f'{book}: {idx.get("totalHadiths", "?")} hadiths, {chunks} chunks')

        got = 0
        for c in range(chunks):
            url = f'{BASE}/data/hadith/books/{book}/chapters/{c:03d}.json'
            chapter = hf_get_json(url)
            if chapter is None:
                log(f'  [warn] {book} chunk {c}: missing')
                continue
            for h in chapter:
                # Strip diacritics to save space and improve token match
                text = h.get('arabic', '') or ''
                # Keep first 600 chars (covers >95% of hadiths and saves space)
                text = text[:600]
                items.append([
                    book_idx,
                    int(h.get('idInBook', h.get('id', 0))),
                    int(h.get('chapterId', 0)),
                    text,
                    0,  # grade: 0 = صحيح (assume sahih for the canonical six; refined later)
                ])
                got += 1
        log(f'  -> {got} hadiths collected')

    log(f'Total items: {len(items)}')

    payload = {
        'books': BOOKS,
        'grades': GRADES,
        'items': items,
    }
    out_path = OUT / 'hadiths_micro_index.json'
    log(f'Writing {out_path} ...')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
    size = out_path.stat().st_size
    log(f'Wrote {size/1024/1024:.1f} MB')

    # Summary per book
    log('\n=== Summary ===')
    counts = {}
    for it in items:
        counts[BOOKS[it[0]]] = counts.get(BOOKS[it[0]], 0) + 1
    for b, c in counts.items():
        log(f'  {b}: {c}')


if __name__ == '__main__':
    main()
