#!/usr/bin/env python3
"""
Find correct archive.org identifiers for each Islamic book.
Strategy: search by Arabic title + author name, pick the best match
(texts mediatype with PDF files).
"""
import json
import urllib.parse
import urllib.request
import time

BOOKS = [
    ("sahih-bukhari-arabic", "صحيح البخاري", "البخاري"),
    ("sahih-muslim-arabic", "صحيح مسلم", "مسلم"),
    ("BolughAlMaram", "بلوغ المرام", "ابن حجر"),
    ("RiyadAlSalihin", "رياض الصالحين", "النووي"),
    ("UmdatAlAhkam", "عمدة الأحكام", "المقدسي"),
    ("AlAdhkarNawawi", "الأذكار النووي", "النووي"),
    ("tafsir-ibn-kathir-tayba", "تفسير ابن كثير", "ابن كثير"),
    ("TafsirAlJalalayn", "تفسير الجلالين", "جلال الدين"),
    ("KitabAlTawhid", "كتاب التوحيد", "محمد بن عبد الوهاب"),
    ("ThalathatAlUsul", "الأصول الثلاثة", "محمد بن عبد الوهاب"),
    ("SummaryOfSeerahArabic", "ملخص السيرة النبوية", None),
    ("FiqhAlSirah", "فقه السيرة", "البوطي"),
    ("ZadAlMaad", "زاد المعاد", "ابن القيم"),
    ("IghathatAllahfan", "إغاثة اللهفان", "ابن القيم"),
    ("AlWabilAlSayyib", "الوابل الصيب", "ابن القيم"),
    ("Altib_Alnabawy", "الطب النبوي", "ابن القيم"),
]


def search(query: str, rows: int = 15) -> list[dict]:
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
    return [
        d for d in data.get("response", {}).get("docs", [])
        if d.get("mediatype") == "texts"
    ]


def get_pdfs(identifier: str) -> list[str]:
    url = f"https://archive.org/metadata/{identifier}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    pdfs = []
    for f in data.get("files", []):
        name = f.get("name", "")
        if name.lower().endswith(".pdf") and f.get("source") != "derivative":
            pdfs.append(name)
    return pdfs


def main():
    results = {}
    for orig_id, title, author in BOOKS:
        query = f"{title} {author}" if author else title
        print(f"\n=== {title} ===")
        try:
            docs = search(query, rows=15)
        except Exception as e:
            print(f"  ! search error: {e}")
            continue
        for doc in docs[:8]:
            ident = doc.get("identifier", "")
            doc_title = doc.get("title", "")
            # Prefer results whose identifier contains Latin transliteration
            # of the book name — these are usually the canonical uploads.
            print(f"  - {ident}  |  {doc_title[:80]}")
            try:
                pdfs = get_pdfs(ident)
                if pdfs:
                    print(f"    PDFs: {pdfs[:3]}")
                    # Pick the largest PDF (main book, not cover)
                    results[orig_id] = {
                        "identifier": ident,
                        "title": doc_title,
                        "pdf": pdfs[0],
                        "url": f"https://archive.org/download/{ident}/{pdfs[0]}",
                    }
                    break
            except Exception as e:
                print(f"    ! pdf list error: {e}")
                continue
        time.sleep(0.5)
    print("\n\n=== FINAL MAPPING ===")
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
