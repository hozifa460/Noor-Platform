import fs from 'fs';
import path from 'path';

function normalizeArabicSimple(text) {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئیؽؾؿؚ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ء/g, '')
    .replace(/[،؛؟.,\/#!$%\^&\*;:{}=\-_`~()\[\]"«»“”‏\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanDuplicateField(str) {
  if (!str) return '';
  const parts = str.split('::').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  // Pick the longest descriptive title or first clean part
  parts.sort((a, b) => b.length - a.length);
  return parts[0];
}

function classifyIslamicArt(title, author, tags, localPath) {
  const text = `${title} ${author} ${tags} ${localPath}`.toLowerCase();
  const norm = normalizeArabicSimple(text);

  // 1. Quran & Tafsir
  if (
    /تفسير|قران|مصحف|تنزيل|ايات|قراءات|تجويد|اعراب القران|معاني القران|احكام القران|الدر المنثور|الطبري|القرطبي|ابن كثير|البغوي|السعدي|الزمخشري|البيضاوي|quran|tafsir/i.test(text) ||
    /تفسير|قران|قراءات|تجويد|مصحف/i.test(norm)
  ) {
    return 'quran';
  }

  // 2. Hadith & Sciences
  if (
    /حديث|صحيح|سنن|مسند|جامع|مستدرك|مصنف|معجم|جزء|اربعين|علل|رجال|جرح|تعديل|البخاري|مسلم|الترمذي|النسائي|ابو داود|ابن ماجه|احمد بن حنبل|الدارمي|البيهقي|الطبراني|ابن حبان|ابن خزيمة|الحاكم|العسقلاني|hadith|tradition/i.test(text) ||
    /حديث|سنن|مسند|صحيح|مسانيد|تخريج|اسناد|رجال الحديث/i.test(norm)
  ) {
    return 'hadith';
  }

  // 3. Fiqh & Usul
  if (
    /فقه|اصول|فتاوى|مذهب|حنفي|مالكي|شافعي|حنبلي|احكام|شرح|مختصر|روضة|مجموع|منهاج|كفاية|هداية|مغني|مدونة|رسالة|قواعد|اشباه|نوازل|فرائض|بيوع|نكاح|جنايات|طهارة|صلاة|زكاة|صيام|حج|fiqh|law|jurisprudence/i.test(text) ||
    /فقه|اصول الفقه|فتاوى|احكام فقهيه|المذهب/i.test(norm)
  ) {
    return 'fiqh';
  }

  // 4. Aqeedah & Theology
  if (
    /عقيدة|توحيد|ايمان|سنة|رد على|اصول الدين|مقالات|فرق|ملل|نحل|اشاعرة|ماتريدية|سلف|اسماء وصفات|واسطية|حموية|تدمرية|طحاوية|ابن تيمية|theology|aqida|kalam/i.test(text) ||
    /عقيده|توحيد|ايمان|السنه والرد/i.test(norm)
  ) {
    return 'aqeedah';
  }

  // 5. History, Seerah & Biographies
  if (
    /تاريخ|سيرة|مغازي|طبقات|وفيات|انساب|اعلام|فتوح|تراجم|اخبار|سير|بداية ونهاية|كامل في التاريخ|طبري|ذهبي|ابن اثير|ابن حزم|ابن عساكر|ابن خلدون|history|biography|sira/i.test(text) ||
    /تاريخ|سيره|مغازي|طبقات|وفيات|انساب|تراجم/i.test(norm)
  ) {
    return 'history';
  }

  // 6. Language, Literature, Poetry & Lexicons
  if (
    /ديوان|شعر|قصائد|معلقة|لغة|لسان|قاموس|معجم|نحو|صرف|اعراب|بلاغة|بيان|بديع|ادب|مقامات|امثال|سيبويه|خليل|فراهيدي|ابن منظور|فيروزابادي|جوهري|زمخشري|ابن جني|poetry|grammar|lexicography|literature/i.test(text) ||
    /ديوان|شعر|قصيده|معجم|نحو|صرف|بلاغه|ادب/i.test(norm)
  ) {
    return 'language';
  }

  // 7. Raqaiq, Zuhd & Tazkiyah
  if (
    /زهد|رقائق|تزكية|اخلاق|تصوف|حكم|مواعظ|احياء علوم|قوت القلوب|طريق الهجرتين|مدارج|محاسبة|صبر|شكر|ذكر|دعاء|ابن الجوزي|ابن القيم|غزالي|محاسبي|zuhd|asceticism|sufism/i.test(text) ||
    /زهد|رقائق|تزكيه|مواعظ|اخلاق/i.test(norm)
  ) {
    return 'raqaiq';
  }

  return 'general';
}

const ISLAMIC_ART_LABELS = {
  quran: 'التفسير وعلوم القرآن',
  hadith: 'الحديث الشريف وعلومه',
  fiqh: 'الفقه وأصوله والقواعد',
  aqeedah: 'العقيدة والتوحيد',
  history: 'السيرة والتاريخ والتراجم',
  language: 'اللغة والأدب والمعاجم',
  raqaiq: 'الرقائق والزهد والتزكية',
  general: 'علوم متنوعة وتراث',
};

async function buildOpenItiCatalog() {
  console.log('🏛️ Fetching OpenITI_metadata_2025.tsv from Hugging Face...');
  const tsvUrl = 'https://huggingface.co/datasets/hozifa1/islamic_books/resolve/main/books/OpenITI_14k_Classical_Books/OpenITI_metadata_2025.tsv';
  
  const res = await fetch(tsvUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch TSV: HTTP ${res.status}`);
  }
  
  const text = await res.text();
  const lines = text.split('\n');
  console.log(`📊 Processing ${lines.length} lines from TSV...`);
  
  const headers = lines[0].split('\t').map((h) => h.trim());
  const titleArIdx = headers.indexOf('title_ar');
  const authorArIdx = headers.indexOf('author_ar');
  const dateIdx = headers.indexOf('date');
  const localPathIdx = headers.indexOf('local_path');
  const versionUriIdx = headers.indexOf('version_uri');
  const tagsIdx = headers.indexOf('tags');
  const idIdx = headers.indexOf('id');
  const tokLengthIdx = headers.indexOf('tok_length');

  const catalog = [];
  const seen = new Set();
  const artCounts = { quran: 0, hadith: 0, fiqh: 0, aqeedah: 0, history: 0, language: 0, raqaiq: 0, general: 0 };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split('\t');
    
    // Filter: only include Arabic texts (language column = 'ara', and version_uri ends with -ara1)
    const language = cols[headers.indexOf('language')] ? cols[headers.indexOf('language')].trim() : '';
    const versionUri = cols[versionUriIdx] ? cols[versionUriIdx].trim() : '';
    if (language && language !== 'ara') continue;
    if (versionUri.endsWith('-per1') || versionUri.endsWith('-heb1') || versionUri.endsWith('-tur1') || versionUri.endsWith('-urd1')) continue;
    
    let rawTitle = cleanDuplicateField(cols[titleArIdx]);
    let rawAuthor = cleanDuplicateField(cols[authorArIdx]);
    const date = cols[dateIdx] ? cols[dateIdx].trim() : '';
    const localPath = cols[localPathIdx] ? cols[localPathIdx].trim() : '';
    const rawTags = cols[tagsIdx] ? cols[tagsIdx].trim() : '';
    const id = cols[idIdx] ? cols[idIdx].trim() : `openiti-${i}`;
    const tokCount = cols[tokLengthIdx] ? parseInt(cols[tokLengthIdx], 10) : 0;

    // Fallback if Arabic title is missing in TSV
    if (!rawTitle) {
      const parts = versionUri.split('.');
      if (parts.length >= 2) {
        rawTitle = parts[1].replace(/([A-Z])/g, ' $1').trim();
      } else {
        rawTitle = versionUri;
      }
    }

    if (!rawAuthor) {
      const parts = versionUri.split('.');
      if (parts.length >= 1) {
        rawAuthor = parts[0].replace(/^\d+/, '').replace(/([A-Z])/g, ' $1').trim();
      }
    }

    const dedupeKey = `${rawTitle}|${rawAuthor}|${date}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const normTitle = normalizeArabicSimple(rawTitle);
    const normAuthor = normalizeArabicSimple(rawAuthor);

    // Compute Hijri Century (1 to 15)
    const dateNum = parseInt(date, 10) || 1;
    const century = Math.min(15, Math.max(1, Math.ceil(dateNum / 100)));
    const islamicArt = classifyIslamicArt(rawTitle, rawAuthor, rawTags, localPath);
    artCounts[islamicArt] = (artCounts[islamicArt] || 0) + 1;

    const normSearchText = `${normTitle} ${normAuthor} ${date} ${century} ${ISLAMIC_ART_LABELS[islamicArt]} تراث`;

    // Construct raw read URL
    // OpenITI repos are organized in 25-year Hijri ranges: 0025AH, 0050AH, ...
    const repoBucket = Math.ceil(dateNum / 25) * 25;
    const repoName = repoBucket.toString().padStart(4, '0') + 'AH';
    const cleanPath = localPath ? localPath.replace(/^data\//, '') : versionUri;
    const readUrl = `https://raw.githubusercontent.com/OpenITI/${repoName}/master/data/${cleanPath}`;

    catalog.push({
      id: `openiti-${id || versionUri}`,
      title: rawTitle,
      sheikhName: rawAuthor || 'من علماء التراث',
      section: 'books',
      tags: ['تراث', 'openiti', date ? `ت ${date} هـ` : 'مخطوط', `القرن ${century} هـ`, ISLAMIC_ART_LABELS[islamicArt]],
      language: 'ar',
      description: `مصنف تراثي في ${ISLAMIC_ART_LABELS[islamicArt]} للإمام ${rawAuthor || 'المؤلف'} (توفي سنة ${date || 'غير محدد'} هـ - القرن ${century} هجري). حجم الكتاب التقريبي: ${tokCount ? tokCount.toLocaleString('ar-EG') + ' كلمة' : 'مجلد تراثي'}.`,
      pdfUrl: readUrl,
      mediaType: 'text_archive',
      date: date || undefined,
      century,
      islamicArt,
      _normTitle: normTitle,
      _normAuthor: normAuthor,
      _normSearchText: normSearchText,
    });
  }

  console.log(`✅ Successfully compiled ${catalog.length} classical Arabic books!`);
  console.log('📚 Art Distribution:', JSON.stringify(artCounts, null, 2));

  const outDir = path.resolve('public/data/ebooks');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'openiti_arabic_catalog.json');
  fs.writeFileSync(outPath, JSON.stringify(catalog));
  const stats = fs.statSync(outPath);
  console.log(`💾 Saved catalog to: ${outPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
}

buildOpenItiCatalog().catch((err) => {
  console.error('Error building catalog:', err);
  process.exit(1);
});
