#!/usr/bin/env python3
"""Final update of public/books/islamic_books.json with all verified URLs."""
import json
import urllib.parse
import urllib.request
import re
from pathlib import Path

# Final, verified mapping: original_identifier → (new_identifier, new_pdf_filename)
# All URLs below have been tested with HEAD requests and return 200.
VERIFIED = {
    "sahih-bukhari-arabic": ("sahih-bukhari-arabic", "99184_text.pdf"),
    "sahih-muslim-arabic": ("sahih-muslim-arabic", "sahih-muslim-arabic_text.pdf"),
    "BolughAlMaram": ("AAskZad-0188727", "Book بلوغ المرام من جمع أدلة الأحكام [0188727] --- الحافظ أبي الفضل شهاب الدين أحمد بن علي ابن محمد بن حجر العسقلاني الشافعي (مؤلف).pdf"),
    "RiyadAlSalihin": ("full-scan", "full scan رياض الصالحين - الامام النووي.pdf"),
    "UmdatAlAhkam": ("sharh-umdah-uthaymeen", "sharh-umdah-uthaymeen.pdf"),
    "AlAdhkarNawawi": ("aladhkar-min-kalamsayid_202511", "aladhkar-min-kalamsayid.pdf"),
    "tafsir-ibn-kathir-tayba": ("tafsir-ibn-kathir-tayba", "tqa1_text.pdf"),
    "TafsirAlJalalayn": ("daguestan-tafsir-jalalain", "تفسير الجلالين ط مورايوف ١.pdf"),
    "KitabAlTawhid": ("sharh-kitab-al-tawhid", "sharh kitab al-tawhid.pdf"),
    "ThalathatAlUsul": ("sharh_alosool_althlatha", "sharh_thalathat_alosool.pdf"),
    "SummaryOfSeerahArabic": ("SummaryOfSeerahArabic", "Summary of Seerah (Arabic).pdf"),
    "FiqhAlSirah": ("20250902_20250902_0437", "فقه السيرة النبوية ﷺ مع موجز لتاريخ الخلافة الراشدة لمحمد سعيد رمضان البوطي ۔ عربی ۔ حق .pdf"),
    "ZadAlMaad": ("alex0037", "smsr0.pdf"),
    "IghathatAllahfan": ("abuyaala_kotobenkayim_1757", "إغاثة اللهفان في مصايد الشيطان ط المجمع.pdf"),
    "AlWabilAlSayyib": ("wabil_saib", "wabils.pdf"),
    "Altib_Alnabawy": ("Altib_Alnabawy", "الطب النبوي لابن قيم الجوزية.pdf"),
}


def url_works(url: str, timeout: int = 12) -> int:
    """Return HTTP status code or 0 on failure."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def build_url(identifier: str, pdf: str) -> str:
    encoded = urllib.parse.quote(pdf, safe="()")
    return f"https://archive.org/download/{identifier}/{encoded}"


def main():
    books_path = Path("public/books/islamic_books.json")
    with books_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    results = {"verified": 0, "updated": 0, "still_broken": 0}

    for group in data.get("items", []):
        for sub in group.get("subItems", []):
            old_url = sub.get("pdfUrl", "")
            if not old_url:
                continue
            match = re.match(r"https?://archive\.org/download/([^/]+)/", old_url)
            if not match:
                continue
            orig_id = match.group(1)

            # Try to find a verified replacement
            if orig_id in VERIFIED:
                new_id, new_pdf = VERIFIED[orig_id]
                new_url = build_url(new_id, new_pdf)
                code = url_works(new_url)
                if code in (200, 302):
                    if new_url != old_url:
                        print(f"  ✓ UPDATED: {orig_id} → {new_id}  [{code}]")
                        sub["pdfUrl"] = new_url
                        results["updated"] += 1
                    else:
                        print(f"  ✓ VERIFIED: {orig_id}  [{code}]")
                        results["verified"] += 1
                else:
                    print(f"  ✗ STILL BROKEN: {orig_id} → {new_id}  [{code}]")
                    results["still_broken"] += 1
            else:
                print(f"  ? NO MAPPING for: {orig_id}")

    with books_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n=== SUMMARY ===")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
