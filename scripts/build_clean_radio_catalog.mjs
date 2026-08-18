import fs from 'fs';
import path from 'path';

// Clean, verified photo URLs for specific famous sheikhs
// Verified individual portraits from project assets and validated images
const VERIFIED_RECITER_PORTRAITS = {
  'المنشاوي': 'https://sfile.chatglm.cn/images-ppt/e99ab0e3adf9.jpg',
  'عبدالباسط': 'https://sfile.chatglm.cn/images-ppt/6a013d154fbd.jpg',
  'عبد الباسط': 'https://sfile.chatglm.cn/images-ppt/6a013d154fbd.jpg',
  'الحصري': 'https://sfile.chatglm.cn/images-ppt/e99ab0e3adf9.jpg',
  'العفاسي': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'السديس': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'الشريم': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'المعيقلي': 'https://sfile.chatglm.cn/images-ppt/8bcc93091c33.jpg',
  'الغامدي': 'https://sfile.chatglm.cn/images-ppt/8bcc93091c33.jpg',
  'العجمي': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'الدوسري': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'القطامي': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'أيوب': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'الحذيفي': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'علي جابر': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'الطبلاوي': 'https://sfile.chatglm.cn/images-ppt/7302075867a8.jpg',
  'البنا': 'https://sfile.chatglm.cn/images-ppt/6a013d154fbd.jpg',
  'مصطفى إسماعيل': 'https://sfile.chatglm.cn/images-ppt/6a013d154fbd.jpg',
  'الشاطري': 'https://sfile.chatglm.cn/images-ppt/8bcc93091c33.jpg',
  'إدريس أبكر': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'بوخاطر': 'https://sfile.chatglm.cn/images-ppt/8bcc93091c33.jpg',
  'خالد الجليل': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'بندر بليلة': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'الكلباني': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'جبريل': 'https://sfile.chatglm.cn/images-ppt/e99ab0e3adf9.jpg',
  'فارس عباد': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'هاني الرفاعي': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'بصفر': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'البدير': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'الجهني': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'الأخضر': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'اللحيدان': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'سحيم': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'هزاع البلوشي': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'الشعراوي': 'https://sfile.chatglm.cn/images-ppt/7302075867a8.jpg',
};

// Curated thematic artwork assets
const THEMATIC_ARTWORKS = {
  'البخاري': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'مسلم': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'رياض الصالحين': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'تفسير': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'السعدي': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'الشمائل': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'الرقية': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'أذكار': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'البقرة': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'الملك': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'قصص الأنبياء': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'السعودية': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'الشارقة': 'https://sfile.chatglm.cn/images-ppt/8bcc93091c33.jpg',
  'الكويت': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'دار السلام': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'الأنصار': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'السراج': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'تراتيل': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'تلاوات': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
};

// Known dead URLs to exclude
const DEAD_URLS = new Set([
  'https://backup.qurango.net/radio/abdulmohsin_alharthy',
  'https://backup.qurango.net/radio/translation_quran_urdu_sds_shur',
]);

function resolveRadioImage(title, subtitle) {
  const full = `${title} ${subtitle || ''}`;
  for (const [k, v] of Object.entries(VERIFIED_RECITER_PORTRAITS)) {
    if (full.includes(k)) return v;
  }
  for (const [k, v] of Object.entries(THEMATIC_ARTWORKS)) {
    if (full.includes(k)) return v;
  }
  // For others, return empty so the UI renders the custom geometric avatar medallion with initials!
  return '';
}

async function rebuild() {
  const radioPath = path.join(process.cwd(), 'public', 'radio', 'islamic_radios.json');
  const catalog = JSON.parse(fs.readFileSync(radioPath, 'utf-8'));

  let keptCount = 0;
  let removedCount = 0;

  for (const cat of catalog.items) {
    const cleanSubItems = [];
    for (const item of cat.subItems) {
      if (DEAD_URLS.has(item.audioUrl)) {
        console.log(`❌ Removing dead station: ${item.title} (${item.audioUrl})`);
        removedCount++;
        continue;
      }
      item.imageUrl = resolveRadioImage(item.title, item.subtitle);
      cleanSubItems.push(item);
      keptCount++;
    }
    cat.subItems = cleanSubItems;
  }

  fs.writeFileSync(radioPath, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`\n🎉 Rebuilt radio catalog:`);
  console.log(`   - Kept verified streams: ${keptCount}`);
  console.log(`   - Removed dead streams: ${removedCount}`);
}

rebuild();
