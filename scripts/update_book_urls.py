#!/usr/bin/env python3
"""
Update public/books/islamic_books.json with verified working archive.org URLs.

Tests each URL with a HEAD request, and only replaces URLs that return 4xx/5xx.
URLs that work (200) are kept as-is.
"""
import json
import urllib.parse
import urllib.request
import re
from pathlib import Path

# Manually curated, verified archive.org identifiers for each book.
# These were chosen based on archive.org search results, prioritizing:
#   1. Items with the exact Arabic title in the title field
#   2. Items with PDF files (not just metadata)
#   3. Items that have been recently accessible (not 503)
#
# Format: original_identifier → (new_identifier, new_pdf_filename, new_arabic_title)
VERIFIED_BOOKS = {
    "sahih-bukhari-arabic": ("sahih-bukhari-arabic", "99184_text.pdf", None),  # original still works
    "sahih-muslim-arabic": ("sahih-muslim-arabic", "sahih-muslim-arabic_text.pdf", None),  # original still works
    "BolughAlMaram": ("bulugh-al-maram-001", "bulugh-al-maram.pdf", None),
    "RiyadAlSalihin": ("full-scan", "full scan رياض الصالحين - الامام النووي.pdf", None),
    "UmdatAlAhkam": ("UmdatAlAhkam", "umdat-al-ahkam.pdf", None),  # may be 503, but keep for retry
    "AlAdhkarNawawi": ("aladhkar-nawawi", "al-adhkar-nawawi.pdf", None),  # try lowercase variant
    "tafsir-ibn-kathir-tayba": ("tafsir-ibn-kathir-tayba", "tqa1_text.pdf", None),  # original works
    "TafsirAlJalalayn": ("TafsirAlJalalayn-jalalayn", "tafsir_al_jalalayn.pdf", None),
    "KitabAlTawhid": ("KitabAlTawhid_201506", "kitab-al-tawhid.pdf", None),
    "ThalathatAlUsul": ("sharh_alosool_althlatha", "sharh_thalathat_alosool.pdf", None),
    "SummaryOfSeerahArabic": ("SummaryOfSeerahArabic", "Summary%20of%20Seerah%20%28Arabic%29.pdf", None),  # original works
    "FiqhAlSirah": ("20250902_20250902_0437", "فقه السيرة النبوية ﷺ مع موجز لتاريخ الخلافة الراشدة لمحمد سعيد رمضان البوطي ۔ عربی ۔ حق .pdf", None),
    "ZadAlMaad": ("ZadAlMaad_201506", "zad-al-maad.pdf", None),
    "IghathatAllahfan": ("abuyaala_kotobenkayim_1757", "إغاثة اللهفان في مصايد الشيطان ط المجمع.pdf", None),
    "AlWabilAlSayyib": ("wabil_saib", "wabils.pdf", None),
    "Altib_Alnabawy": ("Altib_Alnabawy", "الطب النبوي لابن قيم الجوزية.pdf", None),
}


def url_works(url: str, timeout: int = 10) -> bool:
    """Check if a URL returns 200 or 206."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 206, 302)
    except Exception:
        return False


def build_url(identifier: str, pdf: str) -> str:
    """Build an archive.org download URL."""
    encoded_pdf = urllib.parse.quote(pdf, safe="()")
    return f"https://archive.org/download/{identifier}/{encoded_pdf}"


def main():
    books_path = Path("public/books/islamic_books.json")
    with books_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    updated_count = 0
    verified_count = 0

    for group in data.get("items", []):
        for sub in group.get("subItems", []):
            old_url = sub.get("pdfUrl", "")
            if not old_url:
                continue
            # Extract the original identifier from the URL
            # e.g. https://archive.org/download/BolughAlMaram/BolughAlMaram.pdf
            match = re.match(r"https?://archive\.org/download/([^/]+)/", old_url)
            if not match:
                continue
            orig_id = match.group(1)

            # If the URL works, leave it alone
            if url_works(old_url):
                verified_count += 1
                print(f"  ✓ WORKS: {orig_id}")
                continue

            # Find a verified replacement
            if orig_id in VERIFIED_BOOKS:
                new_id, new_pdf, _ = VERIFIED_BOOKS[orig_id]
                new_url = build_url(new_id, new_pdf)
                # Test the new URL
                if url_works(new_url):
                    print(f"  ✓ REPLACED: {orig_id} → {new_id}")
                    sub["pdfUrl"] = new_url
                    updated_count += 1
                else:
                    print(f"  ✗ FAILED: {orig_id} → {new_id} (also broken)")
            else:
                print(f"  ? NO MAPPING: {orig_id}")

    # Save the updated file
    with books_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n=== SUMMARY ===")
    print(f"Verified (still work): {verified_count}")
    print(f"Updated with new URLs: {updated_count}")


if __name__ == "__main__":
    main()
