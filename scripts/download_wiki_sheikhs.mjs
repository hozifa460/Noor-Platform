import fs from 'fs';
import path from 'path';

const SHEIKHS = [
  { id: 'minshawi', name: 'محمد صديق المنشاوي', wiki: 'محمد_صديق_المنشاوي' },
  { id: 'abdulbasit', name: 'عبد الباسط عبد الصمد', wiki: 'عبد_الباسط_عبد_الصمد' },
  { id: 'husary', name: 'محمود خليل الحصري', wiki: 'محمود_خليل_الحصري' },
  { id: 'alafasy', name: 'مشاري العفاسي', wiki: 'مشاري_العفاسي' },
  { id: 'sudais', name: 'عبد الرحمن السديس', wiki: 'عبد_الرحمن_السديس' },
  { id: 'shuraim', name: 'سعود الشريم', wiki: 'سعود_الشريم' },
  { id: 'muaiqly', name: 'ماهر المعيقلي', wiki: 'ماهر_المعيقلي' },
  { id: 'ghamdi', name: 'سعد الغامدي', wiki: 'سعد_الغامدي' },
  { id: 'dosari', name: 'ياسر الدوسري', wiki: 'ياسر_الدوسري' },
  { id: 'qatami', name: 'ناصر القطامي', wiki: 'ناصر_القطامي' },
  { id: 'ayyub', name: 'محمد أيوب', wiki: 'محمد_أيوب' },
  { id: 'ali_jaber', name: 'علي جابر', wiki: 'علي_عبد_الله_جابر' },
  { id: 'hudhaifi', name: 'علي بن عبد الرحمن الحذيفي', wiki: 'علي_بن_عبد_الرحمن_الحذيفي' },
  { id: 'tablawi', name: 'محمد محمود الطبلاوي', wiki: 'محمد_محمود_الطبلاوي' },
  { id: 'mustafa_ismail', name: 'مصطفى إسماعيل', wiki: 'مصطفى_إسماعيل_(مقرئ)' },
  { id: 'banna', name: 'محمود علي البنا', wiki: 'محمود_علي_البنا' },
  { id: 'baleela', name: 'بندر بليلة', wiki: 'بندر_بليلة' },
  { id: 'kalbani', name: 'عادل الكلباني', wiki: 'عادل_الكلباني' },
  { id: 'thubaiti', name: 'عبد البارئ الثبيتي', wiki: 'عبد_الباري_الثبيتي' },
  { id: 'budair', name: 'صلاح البدير', wiki: 'صلاح_البدير' },
  { id: 'juhany', name: 'عبد الله الجهني', wiki: 'عبد_الله_عواد_الجهني' },
  { id: 'jibreel', name: 'محمد جبريل', wiki: 'محمد_جبريل_(قارئ)' },
];

async function downloadFromWiki() {
  const dir = path.join(process.cwd(), 'public', 'images', 'sheikhs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const customUA = 'NoorPlatform/2.0 (https://noor-platform.org; admin@noor-platform.org) NodeFetch';

  for (const s of SHEIKHS) {
    try {
      const summaryUrl = `https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(s.wiki)}`;
      const sumRes = await fetch(summaryUrl, { headers: { 'User-Agent': customUA } });
      if (!sumRes.ok) {
        console.log(`❌ Summary failed for ${s.name} (${sumRes.status})`);
        continue;
      }
      const sumData = await sumRes.json();
      const rawImgUrl = sumData.originalimage?.source || sumData.thumbnail?.source;
      if (!rawImgUrl) {
        console.log(`⚠️ No image found for ${s.name}`);
        continue;
      }

      // Fetch the actual image binary
      const imgRes = await fetch(rawImgUrl, { headers: { 'User-Agent': customUA } });
      if (imgRes.ok) {
        const ext = rawImgUrl.includes('.png') ? 'png' : rawImgUrl.includes('.jpeg') ? 'jpeg' : 'jpg';
        const filename = `${s.id}.${ext}`;
        const dest = path.join(dir, filename);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(dest, buf);
        console.log(`✓ SAVED REAL PHOTO: [${s.name}] -> /images/sheikhs/${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`❌ Img fetch failed for ${s.name} (${imgRes.status}): ${rawImgUrl}`);
      }
    } catch (e) {
      console.log(`❌ Error for ${s.name}: ${e.message}`);
    }
  }
}

downloadFromWiki();
