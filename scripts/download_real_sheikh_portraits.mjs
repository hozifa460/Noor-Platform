import fs from 'fs';
import path from 'path';

const SHEIKH_PORTRAIT_DOWNLOADS = [
  {
    filename: 'minshawi.jpg',
    sheikhName: 'محمد صديق المنشاوي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Elminshwey.jpg/400px-Elminshwey.jpg',
  },
  {
    filename: 'abdulbasit.png',
    sheikhName: 'عبد الباسط عبد الصمد',
    url: 'https://upload.wikimedia.org/wikipedia/ar/thumb/7/73/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF.png/400px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%A8%D8%A7%D8%B3%D8%B7_%D8%B9%D8%A8%D8%AF_%D8%A7%D9%84%D8%B5%D9%85%D8%AF.png',
  },
  {
    filename: 'husary.jpg',
    sheikhName: 'محمود خليل الحصري',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Hussary.jpg',
  },
  {
    filename: 'alafasy.jpg',
    sheikhName: 'مشاري العفاسي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg/400px-%D0%9C%D0%B8%D1%88%D0%B0%D1%80%D0%B8_%D0%A0%D0%B0%D1%88%D0%B8%D0%B4.jpg',
  },
  {
    filename: 'sudais.jpg',
    sheikhName: 'عبد الرحمن السديس',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg/400px-Abdul-Rahman_Al-Sudais_%28Cropped%2C_2011%29.jpg',
  },
  {
    filename: 'shuraim.png',
    sheikhName: 'سعود الشريم',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Saud_Shuraim_doing_the_Khutbah.png/400px-Saud_Shuraim_doing_the_Khutbah.png',
  },
  {
    filename: 'muaiqly.png',
    sheikhName: 'ماهر المعيقلي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Maher_Al_Mueaqly.png',
  },
  {
    filename: 'ghamdi.jpg',
    sheikhName: 'سعد الغامدي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Saad_al_Ghamdi.jpg/400px-Saad_al_Ghamdi.jpg',
  },
  {
    filename: 'dosari.jpg',
    sheikhName: 'ياسر الدوسري',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Yasser_Al-Dosari_%28cropped%29.jpg/400px-Yasser_Al-Dosari_%28cropped%29.jpg',
  },
  {
    filename: 'qatami.jpg',
    sheikhName: 'ناصر القطامي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D9%86%D8%A7%D8%B5%D8%B1_%D8%A7%D9%84%D9%82%D8%B7%D8%A7%D9%85%D9%8A.jpg/400px-%D8%B5%D9%88%D8%B1%D8%A9_%D8%B4%D8%AE%D8%B5%D9%8A%D8%A9_%D8%A7%D9%84%D8%B4%D9%8A%D8%AE_%D9%86%D8%A7%D8%B5%D8%B1_%D8%A7%D9%84%D9%82%D8%B7%D8%A7%D9%85%D9%8A.jpg',
  },
  {
    filename: 'ayyub.jpeg',
    sheikhName: 'محمد أيوب',
    url: 'https://upload.wikimedia.org/wikipedia/ar/6/6f/Muhammad_ayop.jpeg',
  },
  {
    filename: 'ali_jaber.jpg',
    sheikhName: 'علي جابر',
    url: 'https://upload.wikimedia.org/wikipedia/ar/7/76/Ali-jaber-99.jpg',
  },
  {
    filename: 'hudhaifi.jpg',
    sheikhName: 'علي بن عبد الرحمن الحذيفي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Huthaify.jpg',
  },
  {
    filename: 'tablawi.jpeg',
    sheikhName: 'محمد محمود الطبلاوي',
    url: 'https://upload.wikimedia.org/wikipedia/ar/thumb/0/08/%D9%85%D8%AD%D9%85%D8%AF_%D9%85%D8%AD%D9%85%D9%88%D8%AF_%D8%A7%D9%84%D8%B7%D8%A8%D9%84%D8%A7%D9%88%D9%8A.jpeg/400px-%D9%85%D8%AD%D9%85%D8%AF_%D9%85%D8%AD%D9%85%D9%88%D8%AF_%D8%A7%D9%84%D8%B7%D8%A8%D9%84%D8%A7%D9%88%D9%8A.jpeg',
  },
  {
    filename: 'mustafa_ismail.jpg',
    sheikhName: 'مصطفى إسماعيل',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Mostafa_Ismaeel.jpg/400px-Mostafa_Ismaeel.jpg',
  },
  {
    filename: 'banna.jpg',
    sheikhName: 'محمود علي البنا',
    url: 'https://upload.wikimedia.org/wikipedia/ar/2/21/%D9%85%D8%AD%D9%85%D8%AF_%D8%B9%D9%84%D9%8A_%D8%A7%D9%84%D8%A8%D9%86%D8%A7.jpg',
  },
  {
    filename: 'baleela.jpg',
    sheikhName: 'بندر بليلة',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bandar_Baleela.jpg/400px-Bandar_Baleela.jpg',
  },
  {
    filename: 'kalbani.jpg',
    sheikhName: 'عادل الكلباني',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Kalbani.jpg/400px-Kalbani.jpg',
  },
  {
    filename: 'thubaiti.jpg',
    sheikhName: 'عبد البارئ الثبيتي',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Abdulbari_ath-Thubaity_delivering_sermon_at_Prophet%27s_Mosque_Medina.jpg/400px-Abdulbari_ath-Thubaity_delivering_sermon_at_Prophet%27s_Mosque_Medina.jpg',
  },
  {
    filename: 'budair.jpg',
    sheikhName: 'صلاح البدير',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Salah_Ibn_Mohammed_Al_Budair.jpg/400px-Salah_Ibn_Mohammed_Al_Budair.jpg',
  },
  {
    filename: 'juhany.png',
    sheikhName: 'عبد الله الجهني',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Abdullah_Al_Juhany_%28Cropped%29.png/400px-Abdullah_Al_Juhany_%28Cropped%29.png',
  },
  {
    filename: 'jibreel.png',
    sheikhName: 'محمد جبريل',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Qari_Muhammad_Jebril%2C_Ramadan_2019.png',
  },
];

async function downloadPortraits() {
  const dir = path.join(process.cwd(), 'public', 'images', 'sheikhs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Downloading real authentic photographic portraits to public/images/sheikhs/...\n');
  let successCount = 0;

  for (const item of SHEIKH_PORTRAIT_DOWNLOADS) {
    const dest = path.join(dir, item.filename);
    try {
      const res = await fetch(item.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*',
        },
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(dest, buffer);
        console.log(`✓ Saved [${item.sheikhName}] -> ${item.filename} (${buffer.length} bytes)`);
        successCount++;
      } else {
        console.log(`❌ Failed to fetch [${item.sheikhName}]: HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ Error [${item.sheikhName}]: ${e.message}`);
    }
  }

  console.log(`\n🎉 Successfully downloaded ${successCount}/${SHEIKH_PORTRAIT_DOWNLOADS.length} authentic portraits!`);
}

downloadPortraits();
