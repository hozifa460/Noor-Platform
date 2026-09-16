#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Quran Word Morphology and Roots Index for Noor Platform.
Source: The Quranic Arabic Corpus (v0.4) - Kais Dukes, University of Leeds.
Dataset: hozifa1/quran_and_sunnah (quranset/quranic_corpus/quran_morphology.parquet).
Scope: Hafs an Asim (رواية حفص عن عاصم).
"""

import os
import sys
import json
import urllib.request
import pyarrow.parquet as pq

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'public', 'data', 'quran', 'morphology')
CACHE_DIR = os.path.join(PROJECT_ROOT, 'node_modules', '.cache')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

PARQUET_CACHE = os.path.join(CACHE_DIR, 'quran_morphology.parquet')
PARQUET_URL = "https://huggingface.co/datasets/hozifa1/quran_and_sunnah/resolve/main/quranset/quranic_corpus/quran_morphology.parquet"

# Check if scratch parquet exists first to avoid re-downloading
SCRATCH_PARQUET = r"C:\Users\hazoz\.gemini\antigravity\brain\8f71b3a5-3d70-43f7-a02f-4bb01c3cdfd5\scratch\quran_morphology.parquet"
if os.path.exists(SCRATCH_PARQUET) and not os.path.exists(PARQUET_CACHE):
    import shutil
    print(f"Copying cached parquet from scratch to {PARQUET_CACHE}...")
    shutil.copyfile(SCRATCH_PARQUET, PARQUET_CACHE)
elif not os.path.exists(PARQUET_CACHE):
    print(f"Downloading quran_morphology.parquet from {PARQUET_URL}...")
    req = urllib.request.Request(PARQUET_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp, open(PARQUET_CACHE, 'wb') as f:
        f.write(resp.read())
    print("Download complete.")

BW_TO_AR = {
    "'": "ء", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ",
    "A": "ا", "b": "ب", "p": "ة", "t": "ت", "v": "ث",
    "j": "ج", "H": "ح", "x": "خ", "d": "د", "*": "ذ",
    "r": "ر", "z": "ز", "s": "س", "$": "ش", "S": "ص",
    "D": "ض", "T": "ط", "Z": "ظ", "E": "ع", "g": "غ",
    "_": "ـ", "f": "ف", "q": "ق", "k": "ك", "l": "ل",
    "m": "م", "n": "ن", "h": "ه", "w": "و", "Y": "ى",
    "y": "ي", "F": "ً", "N": "ٌ", "K": "ٍ", "a": "َ",
    "u": "ُ", "i": "ِ", "~": "ّ", "o": "ْ", "^": "ٰ",
    "`": "ٰ", "{": "ٱ", "@": ""
}

TAG_AR = {
    'N': 'اسم',
    'PN': 'اسم علم',
    'ADJ': 'صفة',
    'IMPN': 'اسم فعل',
    'PRON': 'ضمير متصل',
    'DEM': 'اسم إشارة',
    'REL': 'اسم موصول',
    'T': 'ظرف زمان',
    'LOC': 'ظرف مكان',
    'V': 'فعل',
    'P': 'حرف جر',
    'CONJ': 'حرف عطف',
    'DET': 'أداة تعريف',
    'NEG': 'حرف نفي',
    'REM': 'واو/فاء الاستئناف',
    'ACC': 'حرف توكيد ونصب',
    'EMPH': 'لام التوكيد',
    'COND': 'حرف شرط',
    'INTG': 'أداة استفهام',
    'SUB': 'حرف مصدري',
    'RES': 'أداة حصر واستثناء',
    'CERT': 'حرف تحقيق',
    'VOC': 'حرف نداء',
    'RSLT': 'حرف واقع في جواب الشرط',
    'PRO': 'حرف نهي',
    'PRP': 'لام التعليل',
    'CIRC': 'واو الحال',
    'SUP': 'حرف صلة/زائد',
    'PREV': 'ما الكافة',
    'FUT': 'حرف استقبال',
    'RET': 'حرف إضراب',
    'EXP': 'أداة تفسير',
    'INC': 'حرف ابتداء',
    'CAUS': 'فاء السببية',
    'IMPV': 'لام الأمر',
    'EXL': 'حرف تحضيض',
    'AMD': 'حرف استدراك',
    'ANS': 'حرف جواب',
    'SUR': 'حرف مفاجأة',
    'AVR': 'حرف ردع وزجر',
    'INL': 'حرف افتتاح',
    'EQ': 'همزة التسوية',
    'COM': 'واو المعية'
}

def bw_to_ar(s: str) -> str:
    if not s:
        return ""
    return "".join(BW_TO_AR.get(c, c) for c in str(s))

def format_root_spaced(root_ar: str) -> str:
    if not root_ar:
        return ""
    letters = [c for c in root_ar if '\u0600' <= c <= '\u06FF']
    return " - ".join(letters)

def parse_features(feat_str: str):
    parts = feat_str.split('|')
    tags_ar = []
    for p in parts:
        if p.startswith('POS:'):
            pos_val = p[4:]
            if pos_val in TAG_AR:
                tags_ar.append(TAG_AR[pos_val])
        elif p == 'PERF':
            tags_ar.append('ماضٍ')
        elif p == 'IMPF':
            tags_ar.append('مضارع')
        elif p == 'IMPV':
            tags_ar.append('أمر')
        elif p == 'ACT':
            tags_ar.append('مبني للمعلوم')
        elif p == 'PASS':
            tags_ar.append('مبني للمجهول')
        elif p == 'NOM':
            tags_ar.append('مرفوع')
        elif p == 'ACC':
            tags_ar.append('منصوب')
        elif p == 'GEN':
            tags_ar.append('مجرور')
        elif p == 'JUS':
            tags_ar.append('مجزوم')
        elif p == 'M':
            tags_ar.append('مذكر')
        elif p == 'F':
            tags_ar.append('مؤنث')
        elif p == 'S':
            tags_ar.append('مفرد')
        elif p == 'D':
            tags_ar.append('مثنى')
        elif p == 'P':
            tags_ar.append('جمع')
        elif p == '1S':
            tags_ar.append('للمتكلم المفرد')
        elif p == '1P':
            tags_ar.append('للمتكلمين')
        elif p == '2MS':
            tags_ar.append('للمخاطب المذكر')
        elif p == '2FS':
            tags_ar.append('للمخاطبة المؤنثة')
        elif p == '2MP':
            tags_ar.append('للمخاطبين الجمع')
        elif p == '3MS':
            tags_ar.append('للغائب المذكر')
        elif p == '3FS':
            tags_ar.append('للغائبة المؤنثة')
        elif p == '3MP':
            tags_ar.append('للغائبين الجمع')
        elif p == '3FP':
            tags_ar.append('للغائبات الجمع')
        elif p == 'PREFIX':
            tags_ar.append('سابقة')
        elif p == 'SUFFIX':
            tags_ar.append('لاحقة')
        elif p.startswith('(') and p.endswith(')'):
            form = p[1:-1]
            tags_ar.append(f'وزن مزيد {form}')
    return tags_ar

def main():
    print(f"Reading parquet from {PARQUET_CACHE}...")
    table = pq.read_table(PARQUET_CACHE)
    df = table.to_pandas()
    print(f"Total segment rows: {len(df)}")

    # 1. Build Surah files (1..114)
    print("Generating per-surah morphology JSON files...")
    for surah_no in range(1, 115):
        surah_df = df[df['surah'] == surah_no]
        words_map = {}

        for (ayah_no, word_idx), grp in surah_df.groupby(['ayah', 'word']):
            root_ar = ""
            root_bw = ""
            lemma_ar = ""
            segments = []

            for _, row in grp.iterrows():
                feat = row['features']
                seg_type = 'stem'
                if 'PREFIX' in feat:
                    seg_type = 'prefix'
                elif 'SUFFIX' in feat:
                    seg_type = 'suffix'

                r_bw = row['root']
                if r_bw:
                    root_bw = r_bw
                    root_ar = bw_to_ar(r_bw)

                lem_bw = row['lemma']
                if lem_bw:
                    lemma_ar = bw_to_ar(lem_bw)

                seg_dict = {
                    'segment': int(row['segment']),
                    'type': seg_type,
                    'arabic': bw_to_ar(row['form_bw']),
                    'tag': row['tag'],
                    'tagAr': TAG_AR.get(row['tag'], row['tag']),
                    'featuresAr': parse_features(feat)
                }
                segments.append(seg_dict)

            # Reconstruct word Arabic representation from segments
            word_arabic = "".join([s['arabic'] for s in segments])
            pos_parts = []
            for s in segments:
                if s['tagAr'] and s['tagAr'] not in pos_parts:
                    pos_parts.append(s['tagAr'])
            pos_summary = " + ".join(pos_parts)

            words_map[f"{ayah_no}:{word_idx}"] = {
                'ayahNo': int(ayah_no),
                'wordIndex': int(word_idx),
                'wordArabic': word_arabic,
                'root': root_ar,
                'rootSpaced': format_root_spaced(root_ar),
                'rootBw': root_bw,
                'lemma': lemma_ar,
                'posSummary': pos_summary,
                'segments': segments
            }

        surah_output = {
            'surahNo': surah_no,
            'source': "The Quranic Arabic Corpus (v0.4) - Kais Dukes, University of Leeds",
            'riwayah': "رواية حفص عن عاصم بالرسم العثماني",
            'attribution': "معجم كوربس القرآن - جامعة ليدز (د. قيس دوكس)",
            'totalWords': len(words_map),
            'words': words_map
        }

        out_file = os.path.join(OUTPUT_DIR, f"{surah_no}.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(surah_output, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Generated 114 surah morphology files in {OUTPUT_DIR}.")

    # 2. Build compact roots index
    print("Generating roots_index.json...")
    with_root = df[df['root'].str.len() > 0]
    root_words = with_root.groupby(['root', 'surah', 'ayah', 'word']).size().reset_index()

    roots_dict = {}
    for root_bw, grp in root_words.groupby('root'):
        root_ar = bw_to_ar(root_bw)
        occ_list = grp[['surah', 'ayah', 'word']].values.tolist()
        roots_dict[root_ar] = {
            'bw': root_bw,
            'spaced': format_root_spaced(root_ar),
            'count': len(occ_list),
            'occurrences': occ_list  # [[surah, ayah, word], ...]
        }

    roots_index_path = os.path.join(OUTPUT_DIR, "roots_index.json")
    with open(roots_index_path, 'w', encoding='utf-8') as f:
        json.dump(roots_dict, f, ensure_ascii=False, separators=(',', ':'))

    roots_size_kb = os.path.getsize(roots_index_path) / 1024
    print(f"Generated roots_index.json with {len(roots_dict)} unique roots ({roots_size_kb:.1f} KB).")

if __name__ == '__main__':
    main()
