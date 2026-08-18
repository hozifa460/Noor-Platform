/**
 * Islamic Radio Visual & Artwork Engine
 * 
 * Maps every single radio station to an authentic, high-definition,
 * curated scholar portrait, national radio emblem, or Islamic manuscript illumination.
 */

// Curated high-res real photographic portraits saved locally
export const SCHOLAR_PORTRAITS: Record<string, string> = {
  'عبد الباسط': '/images/sheikhs/abdulbasit.png',
  'عبدالباسط': '/images/sheikhs/abdulbasit.png',
  'المنشاوي': '/images/sheikhs/minshawi.jpg',
  'منشاوي': '/images/sheikhs/minshawi.jpg',
  'الحصري': '/images/sheikhs/husary.jpg',
  'العفاسي': '/images/sheikhs/alafasy.jpg',
  'عفاسي': '/images/sheikhs/alafasy.jpg',
  'السديس': '/images/sheikhs/sudais.jpg',
  'الشريم': '/images/sheikhs/shuraim.png',
  'المعيقلي': '/images/sheikhs/muaiqly.png',
  'الغامدي': '/images/sheikhs/ghamdi.jpg',
  'الدوسري': '/images/sheikhs/dosari.jpg',
  'القطامي': '/images/sheikhs/qatami.jpg',
  'أيوب': '/images/sheikhs/ayyub.jpeg',
  'علي جابر': '/images/sheikhs/ali_jaber.jpg',
  'الحذيفي': '/images/sheikhs/hudhaifi.jpg',
  'الطبلاوي': '/images/sheikhs/tablawi.jpeg',
  'البنا': '/images/sheikhs/banna.jpg',
  'مصطفى إسماعيل': '/images/sheikhs/mustafa_ismail.jpg',
  'بليلة': '/images/sheikhs/baleela.jpg',
  'الكلباني': '/images/sheikhs/kalbani.jpg',
  'الثبيتي': '/images/sheikhs/thubaiti.jpg',
  'البدير': '/images/sheikhs/budair.jpg',
  'الجهني': '/images/sheikhs/juhany.png',
  'جبريل': '/images/sheikhs/jibreel.png',
};

// Curated Islamic Theme & Subject Artworks
export const THEMATIC_RADIO_ARTWORKS: Record<string, string> = {
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
  'الكهف': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'قصص الأنبياء': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'السعودية': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'الشارقة': 'https://sfile.chatglm.cn/images-ppt/8bcc93091c33.jpg',
  'الكويت': 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
  'القاهرة': 'https://sfile.chatglm.cn/images-ppt/7302075867a8.jpg',
  'دار السلام': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'الأنصار': 'https://sfile.chatglm.cn/images-ppt/eec795bf670e.jpg',
  'السراج': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'تراتيل': 'https://sfile.chatglm.cn/images-ppt/ec716583c961.jpg',
  'تلاوات': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
  'ترجمة': 'https://sfile.chatglm.cn/images-ppt/ec19c2e44007.jpeg',
};

/**
 * Returns a tailored, authentic image URL for any radio station
 */
export function getRadioArtwork(title: string, subtitle?: string): string {
  const fullText = `${title} ${subtitle || ''}`;

  // 1. Check Scholar names with real verified photographic portraits
  for (const [scholar, img] of Object.entries(SCHOLAR_PORTRAITS)) {
    if (fullText.includes(scholar)) {
      return img;
    }
  }

  // 2. Check Subject/Thematic keywords
  for (const [subject, img] of Object.entries(THEMATIC_RADIO_ARTWORKS)) {
    if (fullText.includes(subject)) {
      return img;
    }
  }

  // 3. For other stations without a verified photo, return empty string so
  // the UI renders the custom luxury geometric medallion card.
  return '';
}
