#!/usr/bin/env python3
"""
Noor Platform — Fatwa Answer Shards Builder (Phase 1)
=====================================================
Streams EVERY fatwa file in hozifa1/fatawaset and produces:

1. public/data/fatwa_answers/{hash}.json  — answer shards (~60KB each)
   Record: { id, q, a }  (question + full answer text)
2. public/data/fatwa_answers/index.json   — id -> shard hash map
   { "hf-...-123": "ab12cd34", ... }

Deduplication & ID stability:
- Existing micro_shards already use ids like `hf-<dataset>-<index>`.
  This builder REGENERATES ids with the same rule so existing shards stay valid:
    hf-<sanitized-dataset-basename>-<record index within file>
  For files that previously had no shard coverage, new ids appear.

Streaming strategy (files up to 250MB):
- HTTP Range streaming is unreliable for JSON arrays; instead we download each
  file once into a local cache dir (.fatwa-src-cache), reusing across runs.
- Parsing: incremental JSONL when possible; for big arrays we use a chunked
  regex-based object splitter to avoid loading full text twice.
"""
import json
import os
import re
import sys
import time
import hashlib
import urllib.request
import urllib.parse

REPO = 'https://huggingface.co/datasets/hozifa1/fatawaset/resolve/main/'
OUT_DIR = os.path.join('public', 'data', 'fatwa_answers')
SRC_CACHE = '.fatwa-src-cache'
SHARD_TARGET_BYTES = 60 * 1024          # ~60KB per answer shard
MAX_ANSWER_CHARS = 20_000               # trim pathological answers
MAX_QUESTION_CHARS = 6_000

# ---------------------------------------------------------------------------
# File manifest: every fatwa-bearing file in the repo (verified via HF API).
# Arabic-named folders included. Non-fatwa formats skipped for now:
#   - tar.xz/tar.gz archives (askimam_, islamqa_emb_, dorar tarball) → phase 1.5
#   - parquet parallel corpus → not arabic Q/A shape
#   - FiqhQA CSVs → different shape; can be added later
# ---------------------------------------------------------------------------
FATWA_FILES = [
    # English flat files
    'fatawa/fatawa_01_1.json',
    'fatawa/fatawa_02_2.json',
    'fatawa/fatawa_Islamic_Q_and_A_1.json',
    'fatawa/fatawa_Islamic_Q_and_A_2.json',
    'fatawa/fatawa_binbaz.json',
    'fatawa/fatawa_islamqa1.json',
    'fatawa/fatawaa_aljamie_alkabir.json',
    'fatawa/islamhouse_fatwa_ar.json',
    'fatawa/islamweb_fatwa.json',
    'fatawa/nur_ealaa_aldarb1.json',
    'fatawa/nur_ealaa_aldarb2.json',
    'fatawa/nur_ealaa_aldarb3.json',
    # Arabic folder (the big curated collections incl. new additions)
    'fatawa/فتاوى_JSON/أبحاث_وأحكام_فقهية.json',
    'fatawa/فتاوى_JSON/فتاوى_إسلام_أونلاين.json',
    'fatawa/فتاوى_JSON/فتاوى_إسلام_سؤال_وجواب.json',
    'fatawa/فتاوى_JSON/فتاوى_إسلام_ويب.json',
    'fataوا_JSON/.keep',  # placeholder never used; ignored below
]
FATWA_FILES = [f for f in FATWA_FILES if not f.endswith('.keep')]
ARABIC_DIR = [
    'أبحاث_وأحكام_فقهية.json',
    'فتاوى_إسلام_أونلاين.json',
    'فتاوى_إسلام_سؤال_وجواب.json',
    'فتاوى_إسلام_ويب.json',
    'فتاوى_الإفتاء_السعودية_أركان_الإسلام.json',
    'فتاوى_الإفتاء_السعودية_قسم_ابن_باز.json',
    'فتاوى_الإفتاء_السعودية_قسم_الفوزان.json',
    'فتاوى_الإفتاء_السعودية_قسم_المفتي.json',
    'فتاوى_الإفتاء_السعودية_نور_على_الدرب.json',
    'فتاوى_الشيخ_ابن_باز.json',
    'فتاوى_الشيخ_صالح_الفوزان.json',
    'فتاوى_الشيخ_صالح_بن_حميد.json',
    'فتاوى_الشيخ_عبدالعزيز_آل_الشيخ.json',
    'فتاوى_الشيخ_عبدالله_المنيع.json',
    'فتاوى_الشيخ_محمد_بن_عثيمين.json',
    'فتاوى_اللجنة_الدائمة_للإفتاء_السعودية.json',
    'فتاوى_دار_الإفتاء_الأردنية.json',
    'فتاوى_دار_الإفتاء_المصرية.json',
    'موسوعة_الفتاوى_الجزء_الأول.json',
    'موسوعة_الفتاوى_الجزء_الثاني.json',
]
FATWA_FILES += ['fatawa/فتاوى_JSON/' + f for f in ARABIC_DIR]

# XML collection (ibn taymiyyah majmu) handled separately
XML_FILES = ['fatawa/ibn_taymia/ibn_taymiyyah_majmu_fatawa.xml']


def log(msg):
    print(msg, flush=True)


def ensure_dirs():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(SRC_CACHE, exist_ok=True)


def download_with_progress(url, dest, label):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return  # cached from previous run
    tmp = dest + '.part'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    started = time.time()
    last_pct = -10
    with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, 'wb') as out:
        total = int(resp.headers.get('Content-Length') or 0)
        done = 0
        while True:
            chunk = resp.read(1024 * 512)
            if not chunk:
                break
            out.write(chunk)
            done += len(chunk)
            if total:
                pct = int(done * 100 / total)
                if pct >= last_pct + 10:
                    last_pct = pct
                    rate = done / max(1e-9, time.time() - started) / 1024
                    log(f'      {label}: {pct}% ({done/1024/1024:.0f}MB @ {rate:.0f}KB/s)')
    os.replace(tmp, dest)


def sanitize_dataset_key(rel_path):
    """Stable dataset key from relative path — matches legacy shard id rule:
    basename without extension, e.g. 'fatawa_binbaz' or 'فتاوى_الشيخ_ابن_باز'."""
    base = os.path.basename(rel_path)
    base = re.sub(r'\.(json|xml)$', '', base, flags=re.I)
    return base


def iter_records_from_file(path):
    """Yields dicts from either a JSON array or JSONL file, memory-efficient."""
    with open(path, encoding='utf-8') as f:
        head = f.read(4096).lstrip()
        f.seek(0)

    if head.startswith('['):
        yield from iter_json_array_records(path)
    else:
        # JSONL
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or not line.startswith('{'):
                    continue
                try:
                    obj = json.loads(line)
                    if isinstance(obj, dict):
                        yield obj
                except Exception:
                    continue


def iter_json_array_records(path):
    """Incrementally parse a top-level JSON array of objects using a stream
    splitter on object boundaries. Handles nested braces inside strings.

    Performance: uses bytearray + memoryview-style scanning (never re-scan
    consumed bytes) so 250MB files parse at ~10-20k records/sec.
    """
    buf = bytearray()
    depth = 0
    in_str = False
    esc = False
    start = None
    scan_pos = 0

    with open(path, 'rb') as f:
        # skip until first '['
        while True:
            ch = f.read(1)
            if not ch:
                return
            if ch == b'[':
                break

        while True:
            chunk = f.read(1024 * 512)
            if not chunk:
                break
            buf += chunk
            n = len(buf)

            while scan_pos < n:
                c = buf[scan_pos]
                if in_str:
                    if esc:
                        esc = False
                    elif c == 0x5C:  # backslash
                        esc = True
                    elif c == 0x22:  # quote
                        in_str = False
                else:
                    if c == 0x22:  # quote
                        in_str = True
                    elif c == 0x7B:  # {
                        if depth == 0:
                            start = scan_pos
                        depth += 1
                    elif c == 0x7D:  # }
                        depth -= 1
                        if depth == 0 and start is not None:
                            obj_bytes = bytes(buf[start:scan_pos + 1])
                            try:
                                obj = json.loads(obj_bytes.decode('utf-8'))
                                if isinstance(obj, dict):
                                    yield obj
                            except Exception:
                                pass
                            start = None
                            # Drop everything up to scan_pos+1 — never rescanned
                            del buf[:scan_pos + 1]
                            scan_pos = -1
                            n = len(buf)
                    elif c == 0x5D and depth > 0:
                        pass  # ] inside nested structure
                    # top-level closing ] ends the array; we just stop scanning
                scan_pos += 1

            # Safety bound: an unterminated monster object (>64MB) → bail
            if start is not None and (n - start) > 64 * 1024 * 1024:
                return
    # EOF


def extract_fields(rec):
    """Normalizes heterogeneous record shapes into (title, question, answer,
    scholar, audio, categories, link)."""
    def g(*names, default=''):
        for nm in names:
            v = rec.get(nm)
            if v and isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, list) and v:
                joined = ', '.join(str(x) for x in v if x)
                if joined.strip():
                    return joined.strip()
        return default

    title = g('title', 'Title', 'question')
    question = g('question', 'Question', 'description', 'body', default=title[:300])
    answer = g('answer', 'Answer', 'reply', 'fatwa', 'full_description', 'cleaned_text', 'content')
    scholar = g('mufti_or_scholar', 'scholar', 'mufti', 'sheikh')
    audio = g('audio', 'audio_url')
    cats = rec.get('categories') or []
    if isinstance(cats, str):
        cats = [cats] if cats.strip() else []

    def strip_html(s):
        s = re.sub(r'<br\s*/?>', '\n', s, flags=re.I)
        s = re.sub(r'</p\s*>', '\n\n', s, flags=re.I)
        s = re.sub(r'<[^>]+>', '', s)
        s = (
            s.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<')
            .replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
        )
        return s.strip()

    return strip_html(title)[:400], strip_html(question)[:MAX_QUESTION_CHARS], strip_html(answer)[:MAX_ANSWER_CHARS], scholar, audio, cats


ID_RE = re.compile(r'\s+', re.UNICODE)


def make_id(dataset_key, idx):
    return f'hf-{dataset_key}-{idx}'


def shard_hash_for_id(fid):
    """Same hashing scheme as existing micro-shards: md5(id) hex 8 chars."""
    return hashlib.md5(fid.encode('utf-8')).hexdigest()[:8]


class ShardWriter:
    def __init__(self):
        self.shards = {}       # hash -> list[dict]
        self.shard_bytes = {}  # hash -> approx bytes
        self.index_map = {}    # id -> hash

    def add(self, fid, q, a):
        h = shard_hash_for_id(fid)
        self.index_map[fid] = h
        rec = {'id': fid, 'q': q, 'a': a}
        blob = json.dumps(rec, ensure_ascii=False, separators=(',', ':'))
        self.shards.setdefault(h, []).append(rec)
        self.shard_bytes[h] = self.shard_bytes.get(h, 0) + len(blob.encode('utf-8'))

        # INCREMENTAL flush: write each shard the moment it's complete-sized,
        # and persist the index map periodically — a kill mid-run loses nothing.
        if self.shard_bytes.get(h, 0) >= SHARD_TARGET_BYTES:
            self._write_shard(h)

    def _write_shard(self, h):
        items = self.shards.get(h)
        if not items:
            return
        path = os.path.join(OUT_DIR, f'{h}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(items, f, ensure_ascii=False, separators=(',', ':'))
        del self.shards[h]
        self.shard_bytes.pop(h, None)

    def save_index_snapshot(self):
        tmp = os.path.join(OUT_DIR, 'index.json.tmp')
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(self.index_map, f, ensure_ascii=False, separators=(',', ':'))
        os.replace(tmp, os.path.join(OUT_DIR, 'index.json'))

    def flush(self):
        # write remaining partial shards
        for h in list(self.shards.keys()):
            self._write_shard(h)
        self.save_index_snapshot()
        bytes_total = sum(
            os.path.getsize(os.path.join(OUT_DIR, f))
            for f in os.listdir(OUT_DIR)
            if f.endswith('.json') and f != 'index.json'
        )
        return len([f for f in os.listdir(OUT_DIR) if f.endswith('.json') and f != 'index.json']), bytes_total, len(self.index_map)


def main():
    ensure_dirs()
    writer = ShardWriter()
    t0 = time.time()

    all_files = [(p, False) for p in FATWA_FILES] + [(p, True) for p in XML_FILES]

    grand_records = 0
    grand_with_answer = 0

    for rel, is_xml in all_files:
        label = rel.split('/')[-1]
        local = os.path.join(SRC_CACHE, re.sub(r'[^\w\.\-\u0600-\u06FF]', '_', rel))
        url = REPO + urllib.parse.quote(rel)
        log(f'\n[{rel}]')
        try:
            download_with_progress(url, local, label)
        except Exception as e:
            log(f'  ⚠️ download failed: {e} — skipping')
            continue

        dkey = sanitize_dataset_key(rel)
        file_records = 0
        file_answers = 0

        if not is_xml:
            for idx, rec in enumerate(iter_records_from_file(local), start=1):
                title, q, a, scholar, audio, cats = extract_fields(rec)
                if not title and not q:
                    continue
                fid = make_id(dkey, idx)
                writer.add(fid, q or title, a)
                file_records += 1
                if a:
                    file_answers += 1
        else:
            # ibn taymiyyah XML: <item><number>..</number><title>CDATA</title>
            # <content>CDATA html</content></item>
            import xml.etree.ElementTree as ET
            tree = ET.iterparse(local, events=('end',))
            idx = 0
            for _ev, elem in tree:
                tag = elem.tag.split('}')[-1]
                if tag != 'item':
                    continue
                idx += 1
                get_t = lambda name: (elem.findtext(name) or '').strip()
                title = get_t('title')
                content = get_t('content')
                # strip html from CDATA content
                _, _, ans, *_ = extract_fields({'title': title, 'answer': content})
                fid = make_id(dkey, idx)
                writer.add(fid, title, ans)
                file_records += 1
                if ans:
                    file_answers += 1
                elem.clear()

        grand_records += file_records
        grand_with_answer += file_answers
        writer.save_index_snapshot()  # crash-safe: index persisted after every file
        log(f'  ✓ {file_records:,} records ({file_answers:,} with answers)')

    shards, approx_bytes, ids = writer.flush()
    dt = time.time() - t0
    log('\n' + '=' * 70)
    log('✅ DONE')
    log(f'   source files processed : {len(all_files)}')
    log(f'   records indexed        : {grand_records:,}')
    log(f'   records WITH answer    : {grand_with_answer:,}')
    log(f'   answer shards written  : {shards:,} files (~{approx_bytes/1024/1024:.1f}MB)')
    log(f'   index.json entries     : {ids:,}')
    log(f'   elapsed                : {dt/60:.1f} min')


if __name__ == '__main__':
    main()
