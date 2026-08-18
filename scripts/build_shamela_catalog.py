import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import urllib.request
import urllib.parse
import json
import io
import os
import re
import concurrent.futures
import pyarrow.parquet as pq

def normalize_arabic_simple(text):
    if not text:
        return ''
    text = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', text)
    text = re.sub(r'\u0640', '', text)
    text = re.sub(r'[أإآٱٲٳ]', 'ا', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'[ىئیؽؾؿؚ]', 'ي', text)
    text = re.sub(r'ؤ', 'و', text)
    text = re.sub(r'ء', '', text)
    text = re.sub(r'[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"«»“”‏\\]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()

def map_shamela_to_art(category_id, category_name):
    cid = int(category_id)
    if cid in [1, 2]: # العقيدة، الفرق والردود
        return 'aqeedah'
    elif cid in [3, 4, 5]: # التفسير، علوم القرآن، التجويد والقراءات
        return 'quran'
    elif cid in [6, 7, 8, 9, 10]: # كتب السنة، شروح الحديث، التخريج، العلل، علوم الحديث
        return 'hadith'
    elif cid in [11, 12, 13]: # أصول الفقه، علوم الفقه، المنطق
        return 'usul'
    elif cid in [14, 15, 16, 17, 18, 19, 20, 21, 22]: # المذاهب الأربعة، الفقه العام، الفتاوى
        return 'fiqh'
    elif cid in [23]: # الرقائق والآداب والأذكار
        return 'raqaiq'
    elif cid in [24, 25, 26, 27, 28]: # السيرة، التاريخ، التراجم، الأنساب، البلدان
        return 'history'
    elif cid in [29, 30, 31, 32, 33, 34, 35]: # اللغة، المعاجم، النحو، الأدب، الشعر، البلاغة
        return 'language'
    else:
        return 'general'

def fetch_category_tree(cat_dir):
    try:
        url = f"https://huggingface.co/api/datasets/AuthenticIlm/Shamela4_Full_DB/tree/main/{urllib.parse.quote(cat_dir)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            items = json.loads(resp.read().decode('utf-8'))
        
        book_paths = {}
        for item in items:
            if item['type'] == 'directory':
                full_path = item['path'] # e.g. "06__كتب-السنة/1167__صحيح-البخاري-ط-التأصيل"
                parts = full_path.split('/')
                if len(parts) >= 2:
                    folder_name = parts[1]
                    book_id_str = folder_name.split('__')[0]
                    if book_id_str.isdigit():
                        book_paths[int(book_id_str)] = full_path
        return book_paths
    except Exception as e:
        print(f"Error fetching category {cat_dir}: {e}")
        return {}

def main():
    print("🏛️ Step 1: Downloading _meta/book_metadata.parquet...")
    meta_url = 'https://huggingface.co/datasets/AuthenticIlm/Shamela4_Full_DB/resolve/main/_meta/book_metadata.parquet'
    req = urllib.request.Request(meta_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        table = pq.read_table(io.BytesIO(resp.read()))
    
    df = table.to_pandas()
    print(f"📊 Loaded metadata for {len(df)} books from Parquet.")

    print("🌳 Step 2: Fetching root directory tree from Hugging Face...")
    tree_url = 'https://huggingface.co/api/datasets/AuthenticIlm/Shamela4_Full_DB/tree/main'
    req = urllib.request.Request(tree_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        root_tree = json.loads(resp.read().decode('utf-8'))

    cat_dirs = [item['path'] for item in root_tree if item['type'] == 'directory' and item['path'] != '_meta']
    print(f"📁 Found {len(cat_dirs)} category folders. Fetching book folders in parallel...")

    book_to_path = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_cat = {executor.submit(fetch_category_tree, c): c for c in cat_dirs}
        for future in concurrent.futures.as_completed(future_to_cat):
            cat = future_to_cat[future]
            res = future.result()
            book_to_path.update(res)
            print(f"  ✓ Processed category [{cat}]: {len(res)} books")

    print(f"✅ Resolved paths for {len(book_to_path)} books.")

    print("📚 Step 3: Compiling master catalog JSON...")
    catalog = []
    
    for _, row in df.iterrows():
        book_id = int(row['book_id'])
        title_ar = str(row['title_ar']).strip() if row['title_ar'] else f"كتاب {book_id}"
        author_ar = str(row['main_author_name_ar']).strip() if row['main_author_name_ar'] else "من أئمة الإسلام"
        category_name = str(row['category_name_ar']).strip() if row['category_name_ar'] else "عام"
        category_id = int(row['category_id']) if row['category_id'] else 40
        death_hijri = int(row['main_author_death_hijri']) if row['main_author_death_hijri'] and str(row['main_author_death_hijri']).isdigit() else None
        volume_count = int(row['volume_count_observed']) if row['volume_count_observed'] else 1
        betaka = str(row['betaka_text']).strip() if row['betaka_text'] else ""
        printed = bool(row['printed'])

        century = None
        if death_hijri and death_hijri > 0:
            century = min(15, max(1, (death_hijri + 99) // 100))

        rel_path = book_to_path.get(book_id)
        if not rel_path:
            # Fallback construct path from category directory
            matched_cat_dir = next((c for c in cat_dirs if c.startswith(f"{category_id:02d}__")), f"{category_id:02d}__كتب")
            slug = re.sub(r'[\s_]+', '-', title_ar)
            rel_path = f"{matched_cat_dir}/{book_id}__{slug}"

        islamic_art = map_shamela_to_art(category_id, category_name)
        norm_title = normalize_arabic_simple(title_ar)
        norm_author = normalize_arabic_simple(author_ar)
        norm_cat = normalize_arabic_simple(category_name)
        norm_search = f"{norm_title} {norm_author} {norm_cat} {death_hijri or ''} {century or ''} شامله"

        # Build clean description from betaka_text
        desc = f"مصنف في {category_name} للإمام {author_ar}"
        if death_hijri:
            desc += f" (ت {death_hijri} هـ)"
        if volume_count > 1:
            desc += f" في {volume_count} مجلدات"
        if printed:
            desc += " [موافق للمطبوع]"

        catalog.append({
            "id": f"shamela-{book_id}",
            "shamelaId": book_id,
            "title": title_ar,
            "sheikhName": author_ar,
            "section": "books",
            "category": islamic_art,
            "islamicArt": islamic_art,
            "shamelaCategoryId": category_id,
            "shamelaCategoryName": category_name,
            "century": century,
            "date": str(death_hijri) if death_hijri else None,
            "volumeCount": volume_count,
            "printed": printed,
            "betakaText": betaka[:500],
            "shamelaPath": rel_path,
            "description": desc,
            "tags": ["شاملة", category_name, f"ت {death_hijri} هـ" if death_hijri else "مخطوط", f"القرن {century} هـ" if century else "تراث", islamic_art],
            "language": "ar",
            "mediaType": "shamela_archive",
            "_normTitle": norm_title,
            "_normAuthor": norm_author,
            "_normSearchText": norm_search
        })

    out_dir = os.path.join(os.getcwd(), 'public', 'data', 'ebooks')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'shamela_arabic_catalog.json')

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=None)

    file_size_mb = os.path.getsize(out_file) / (1024 * 1024)
    print(f"\n🎉 Successfully compiled {len(catalog)} Shamela 4 books into: {out_file} ({file_size_mb:.2f} MB)")

if __name__ == '__main__':
    main()
