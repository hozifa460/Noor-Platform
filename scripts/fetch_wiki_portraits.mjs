import fs from 'fs';
import path from 'path';

const SHEIKHS_WIKI = [
  { id: 'minshawi', name: 'محمد صديق المنشاوي', wiki: 'محمد_صديق_المنشاوي' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', wiki: 'عبد_الباسط_عبد_الصمد' },
  { id: 'husary', name: 'محمود خليل الحصري', wiki: 'محمود_خليل_الحصري' },
  { id: 'alafasy', name: 'مشاري العفاسي', wiki: 'مشاري_العفاسي' },
  { id: 'sudais', name: 'عبد الرحمن السديس', wiki: 'عبد_الرحمن_السديس' },
  { id: 'shuraim', name: 'سعود الشريم', wiki: 'سعود_الشريم' },
  { id: 'muaiqly', name: 'ماهر المعيقلي', wiki: 'ماهر_المعيقلي' },
  { id: 'ghamdi', name: 'سعد الغامدي', wiki: 'سعد_الغامدي' },
  { id: 'ajmi', name: 'أحمد بن علي العجمي', wiki: 'أحمد_بن_علي_العجمي' },
  { id: 'dosari', name: 'ياسر الدوسري', wiki: 'ياسر_الدوسري' },
  { id: 'qatami', name: 'ناصر القطامي', wiki: 'ناصر_القطامي' },
  { id: 'ayyub', name: 'محمد أيوب', wiki: 'محمد_أيوب_(قارئ)' },
  { id: 'hudhaifi', name: 'علي بن عبد الرحمن الحذيفي', wiki: 'علي_بن_عبد_الرحمن_الحذيفي' },
  { id: 'ali_jaber', name: 'علي جابر', wiki: 'علي_جابر_(إمام)' },
  { id: 'tablawi', name: 'محمد محمود الطبلاوي', wiki: 'محمد_محمود_الطبلاوي' },
  { id: 'mustafa_ismail', name: 'مصطفى إسماعيل', wiki: 'مصطفى_إسماعيل_(مقرئ)' },
  { id: 'banna', name: 'محمود علي البنا', wiki: 'محمود_علي_البنا' },
  { id: 'shatri', name: 'أبو بكر الشاطري', wiki: 'أبو_بكر_الشاطري' },
  { id: 'idrees_abkar', name: 'إدريس أبكر', wiki: 'إدريس_أبكر' },
  { id: 'jibreel', name: 'محمد جبريل', wiki: 'محمد_جبريل' },
  { id: 'baleela', name: 'بندر بليلة', wiki: 'بندر_بليلة' },
  { id: 'kalbani', name: 'عادل الكلباني', wiki: 'عادل_الكلباني' },
  { id: 'thubaiti', name: 'عبد البارئ الثبيتي', wiki: 'عبد_البارئ_الثبيتي' },
  { id: 'budair', name: 'صلاح البدير', wiki: 'صلاح_البدير' },
  { id: 'juhany', name: 'عبد الله الجهني', wiki: 'عبد_الله_عواد_الجهني' },
];

async function fetchWikiImages() {
  console.log('Fetching official Wikipedia photographic portraits for all sheikhs...\n');
  const results = {};

  for (const s of SHEIKHS_WIKI) {
    try {
      const url = `https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(s.wiki)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NoorPlatform/1.0 (contact@noor-platform.org)' }
      });
      if (res.ok) {
        const data = await res.json();
        const img = data.thumbnail?.source || data.originalimage?.source;
        if (img) {
          console.log(`✓ [${s.name}]: ${img}`);
          results[s.id] = { name: s.name, img };
        } else {
          console.log(`⚠️ [${s.name}]: No image in wiki summary`);
        }
      } else {
        console.log(`❌ [${s.name}]: Wiki API ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ [${s.name}]: ${e.message}`);
    }
  }

  console.log('\nTotal images found:', Object.keys(results).length);
}

fetchWikiImages();
