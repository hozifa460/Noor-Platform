#!/usr/bin/env python3
"""Find remaining missing books on archive.org."""
import json
import urllib.parse
import urllib.request

# Books still missing working URLs
MISSING = [
    ("UmdatAlAhkam", "عمدة الأحكام عبد الغني المقدسي"),
    ("AlAdhkarNawawi", "الأذكار النووي"),  # Try without "النووي"
    ("AlAdhkarNawawi2", "الأذكار الإمام النووي"),
    ("TafsirAlJalalayn", "تفسير الجلالين المحلي السيوطي"),
    ("KitabAlTawhid", "كتاب التوحيد محمد بن عبد الوهاب"),
    ("ZadAlMaad", "زاد المعاد ابن القيم"),
    ("BolughAlMaram2", "بلوغ المرام من أدلة الأحكام"),
]


def search(query: str, rows: int = 20):
    base = "https://archive.org/advancedsearch.php"
    params = {
        "q": query,
        "fl[]": ["identifier", "title", "mediatype"],
        "output": "json",
        "rows": str(rows),
    }
    url = base + "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return [d for d in data.get("response", {}).get("docs", [])
            if d.get("mediatype") == "texts"]


def get_pdfs(identifier: str):
    url = f"https://archive.org/metadata/{identifier}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return [
        f["name"] for f in data.get("files", [])
        if f.get("name", "").lower().endswith(".pdf")
        and f.get("source") != "derivative"
        and not f["name"].startswith("_")
    ]


def test_url(url: str) -> int:
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except Exception as e:
        return 0


for orig, query in MISSING:
    print(f"\n=== {orig}: '{query}' ===")
    try:
        docs = search(query, rows=15)
    except Exception as e:
        print(f"  ! err: {e}")
        continue
    for doc in docs[:8]:
        ident = doc.get("identifier", "")
        title = doc.get("title", "")[:80]
        try:
            pdfs = get_pdfs(ident)
        except:
            continue
        if not pdfs:
            continue
        # Test first PDF
        encoded = urllib.parse.quote(pdfs[0], safe="()")
        url = f"https://archive.org/download/{ident}/{encoded}"
        code = test_url(url)
        marker = "✓" if code in (200, 302) else "✗"
        print(f"  {marker} [{code}] {ident}  |  {title}")
        print(f"     PDF: {pdfs[0]}")
        if code in (200, 302):
            print(f"     URL: {url}")
            break
