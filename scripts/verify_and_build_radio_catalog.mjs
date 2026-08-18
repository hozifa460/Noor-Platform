import fs from 'fs';
import path from 'path';

async function testStream(url, timeoutMs = 6000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Range': 'bytes=0-1024',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const ct = res.headers.get('content-type') || '';
    const isAudio = ct.includes('audio') || ct.includes('mpeg') || ct.includes('aac') || ct.includes('ogg') || ct.includes('stream') || ct.includes('octet-stream');

    if ((res.ok || res.status === 206) && (isAudio || res.status === 200 || res.status === 206)) {
      return { ok: true, status: res.status, contentType: ct };
    }
    return { ok: false, status: res.status, contentType: ct };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Curated foundational stations from national broadcasters and verified streams (100% active)
const CURATED_NATIONAL_RADIOS = [
  {
    title: 'إذاعة القرآن الكريم — السعودية (الرياض)',
    subtitle: 'بث مباشر من المملكة العربية السعودية',
    url: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
    tags: ['سعودية', 'عام', 'مباشر'],
  },
  {
    title: 'إذاعة القرآن الكريم — الشارقة',
    subtitle: 'هيئة الشارقة للإذاعة والتلفزيون',
    url: 'https://l3.itworkscdn.net/smcquranlive/quranradiolive/icecast.audio',
    tags: ['الإمارات', 'الشارقة', 'مباشر'],
  },
  {
    title: 'إذاعة القرآن الكريم — الكويت',
    subtitle: 'بث مباشر من دولة الكويت',
    url: 'https://radio.mp3islam.com/listen/quran_radio/radio.mp3',
    tags: ['الكويت', 'مباشر'],
  },
  {
    title: 'إذاعة دار السلام للقرآن الكريم',
    subtitle: 'تلاوات متواصلة على مدار الساعة',
    url: 'https://streams.radio.co/s0975ec186/listen',
    tags: ['تلاوات', 'مباشر'],
  },
  {
    title: 'إذاعة الأنصار الإسلامية',
    subtitle: 'بث قرآني ودعوي مباشر',
    url: 'https://al-ansaar.simplestreaming.co.za/listen/al-ansaar_radio/radio.mp3',
    tags: ['دعوة', 'تلاوات'],
  },
  {
    title: 'إذاعة السراج المنير',
    subtitle: 'إذاعة إسلامية شاملة',
    url: 'https://eu4.fastcast4u.com/proxy/aabdul00?mp=/1',
    tags: ['إسلامية', 'مباشر'],
  },
  {
    title: 'إذاعة القرآن الكريم — تلاوات متنوعة (مكس)',
    subtitle: 'qurango.net',
    url: 'https://qurango.net/radio/mix',
    tags: ['تلاوات', 'مختارات'],
  },
  {
    title: 'إذاعة التراتيل والقرآن الكريم',
    subtitle: 'تلاوات خاشعة وأدعية مأثورة',
    url: 'https://qurango.net/radio/tarateel',
    tags: ['تراتيل', 'خاشعة'],
  },
  {
    title: 'إذاعة الرقية الشرعية',
    subtitle: 'آيات الرقية والشفاء من القرآن والسنة',
    url: 'https://backup.qurango.net/radio/roqiah',
    tags: ['رقية', 'شفاء'],
  },
  {
    title: 'إذاعة أذكار الصباح والمساء',
    subtitle: 'حصن المسلم والأذكار المأثورة',
    url: 'https://backup.qurango.net/radio/athkar_sabah_masa',
    tags: ['أذكار', 'حصن المسلم'],
  },
  {
    title: 'إذاعة الفتاوى — نور على الدرب',
    subtitle: 'فتاوى كبار العلماء وابن باز وابن عثيمين',
    url: 'https://backup.qurango.net/radio/nour_ala_aldarb',
    tags: ['فتاوى', 'نور على الدرب'],
  },
  {
    title: 'إذاعة صحيح البخاري',
    subtitle: 'قراءة أحاديث الجامع الصحيح للإمام البخاري',
    url: 'https://backup.qurango.net/radio/saheh-bokharee',
    tags: ['حديث', 'البخاري'],
  },
  {
    title: 'إذاعة صحيح مسلم',
    subtitle: 'قراءة أحاديث صحيح الإمام مسلم بن الحجاج',
    url: 'https://backup.qurango.net/radio/saheh-muslim',
    tags: ['حديث', 'مسلم'],
  },
  {
    title: 'إذاعة رياض الصالحين',
    subtitle: 'أحاديث سيد المرسلين للإمام النووي',
    url: 'https://backup.qurango.net/radio/riyad',
    tags: ['حديث', 'رياض الصالحين'],
  },
  {
    title: 'إذاعة تفسير القرآن الكريم — السعدي',
    subtitle: 'تيسير الكريم الرحمن في تفسير كلام المنان',
    url: 'https://backup.qurango.net/radio/tafseer',
    tags: ['تفسير', 'السعدي'],
  },
  {
    title: 'إذاعة السيرة النبوية العطرة',
    subtitle: 'سيرة النبي المصطفى صلى الله عليه وسلم',
    url: 'https://backup.qurango.net/radio/alsira_alnabawia',
    tags: ['سيرة', 'النبي'],
  },
  {
    title: 'إذاعة الشمائل المحمدية',
    subtitle: 'صفات وأخلاق النبي صلى الله عليه وسلم للإمام الترمذي',
    url: 'https://backup.qurango.net/radio/shmaeel',
    tags: ['شمائل', 'حديث'],
  },
  {
    title: 'إذاعة سورة البقرة — مدار الساعة',
    subtitle: 'تلاوات متكررة لسورة البقرة بأعذب الأصوات',
    url: 'https://backup.qurango.net/radio/albaqarah',
    tags: ['البقرة', 'بركة'],
  },
  {
    title: 'إذاعة سورة الكهف — مدار الساعة',
    subtitle: 'تلاوات خاشعة لسورة الكهف',
    url: 'https://backup.qurango.net/radio/Al-Kahf',
    tags: ['الكهف', 'نور'],
  },
  {
    title: 'إذاعة سورة الملك — مدار الساعة',
    subtitle: 'المنجية من عذاب القبر',
    url: 'https://backup.qurango.net/radio/Surah_Al-Mulk',
    tags: ['الملك', 'تلاوات'],
  },
  {
    title: 'إذاعة قصص الأنبياء',
    subtitle: 'سير وقصص الأنبياء والمرسلين عليهم السلام',
    url: 'https://backup.qurango.net/radio/alanbiya',
    tags: ['قصص', 'أنبياء'],
  },
];

async function main() {
  console.log('======================================================================');
  console.log('🎙️ Building 100% Tested & Verified Islamic Radios Catalog');
  console.log('======================================================================\n');

  // 1. Fetch MP3Quran Radios
  console.log('1. Fetching MP3Quran API master radios list...');
  let mp3Radios = [];
  try {
    const res = await fetch('https://www.mp3quran.net/api/v3/radios?language=ar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (res.ok) {
      const data = await res.json();
      mp3Radios = data.radios || [];
      console.log(`✓ Fetched ${mp3Radios.length} candidate radios from MP3Quran API!`);
    }
  } catch (e) {
    console.error('Failed to fetch MP3Quran:', e.message);
  }

  // 2. Test Curated National & Islamic Radios
  console.log('\n2. Verifying Curated National & Thematic Radios...');
  const verifiedNational = [];
  const verifiedHadithScience = [];

  for (const item of CURATED_NATIONAL_RADIOS) {
    const test = await testStream(item.url);
    if (test.ok) {
      console.log(`  ✓ VERIFIED (${test.status}) [${test.contentType}]: ${item.title}`);
      const entry = {
        title: item.title,
        subtitle: item.subtitle,
        emoji: '📻',
        audioUrl: item.url,
        imageUrl: 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
        videoUrl: '',
        videoSource: 'radio',
        mediaType: 'audio',
      };

      if (item.tags.some((t) => ['حديث', 'تفسير', 'سيرة', 'فتاوى', 'شمائل'].includes(t))) {
        verifiedHadithScience.push(entry);
      } else {
        verifiedNational.push(entry);
      }
    } else {
      console.log(`  ❌ DEAD (${test.error || test.status}): ${item.title} -> ${item.url}`);
    }
  }

  // 3. Test & Extract Verified Reciters and Translations from MP3Quran
  console.log('\n3. Testing and filtering Reciter Radios from MP3Quran API...');
  const verifiedReciters = [];
  const verifiedTranslations = [];

  for (const r of mp3Radios) {
    const test = await testStream(r.url);
    if (!test.ok) {
      // Skip dead streams
      continue;
    }

    const name = r.name.trim();
    const entry = {
      title: name.startsWith('إذاعة') ? name : `إذاعة ${name}`,
      subtitle: 'بث مباشر 24 ساعة',
      emoji: '🎙️',
      audioUrl: r.url,
      imageUrl: 'https://sfile.chatglm.cn/images-ppt/760299f9b153.jpg',
      videoUrl: '',
      videoSource: 'radio',
      mediaType: 'audio',
    };

    if (name.includes('ترجمة') || name.includes('Translation') || name.includes('بلغة')) {
      verifiedTranslations.push(entry);
    } else if (
      !name.includes('الفتاوى') &&
      !name.includes('البخاري') &&
      !name.includes('مسلم') &&
      !name.includes('تفسير') &&
      !name.includes('أذكار') &&
      !name.includes('رقية')
    ) {
      verifiedReciters.push(entry);
    }
  }

  console.log(`\nVerified Counts:`);
  console.log(`- General & National Quran Radios: ${verifiedNational.length}`);
  console.log(`- Sheikhs & Reciters Radios: ${verifiedReciters.length}`);
  console.log(`- Hadith, Tafsir & Islamic Sciences: ${verifiedHadithScience.length}`);
  console.log(`- Translations of the Holy Quran: ${verifiedTranslations.length}`);

  const finalRadioCatalog = {
    id: 'islamic_radios',
    title: 'الإذاعات الدينية',
    emoji: '📻',
    description: 'بث مباشر للإذاعات والقرآن الكريم على مدار الساعة',
    gradientColors: ['#1A3A2A', '#16A34A'],
    imageUrl: '',
    items: [
      {
        title: 'إذاعات القرآن الكريم الكبرى والعامة',
        subtitle: 'بث مباشر 24 ساعة بأعلى نقاء',
        emoji: '📻',
        imageUrl: '',
        subItems: verifiedNational,
      },
      {
        title: 'إذاعات كبار القراء والمشايخ',
        subtitle: 'تلاوات متواصلة بأصوات نخبة قراء العالم الإسلامي',
        emoji: '🎙️',
        imageUrl: '',
        subItems: verifiedReciters,
      },
      {
        title: 'إذاعات الحديث والعلوم الشرعية والتفاسير',
        subtitle: 'صحيح البخاري، مسلم، رياض الصالحين، والفتاوى',
        emoji: '📚',
        imageUrl: '',
        subItems: verifiedHadithScience,
      },
      {
        title: 'إذاعات ترجمات معاني القرآن الكريم',
        subtitle: 'ترجمات معاني كلام الله بلغات العالم الحية',
        emoji: '🌍',
        imageUrl: '',
        subItems: verifiedTranslations,
      },
    ],
  };

  const outPath = path.join(process.cwd(), 'public', 'radio', 'islamic_radios.json');
  fs.writeFileSync(outPath, JSON.stringify(finalRadioCatalog, null, 2), 'utf-8');

  console.log('\n======================================================================');
  console.log(`🎉 Successfully saved 100% verified radio catalog to ${outPath}`);
  console.log(`   Total Verified Live Streams: ${verifiedNational.length + verifiedReciters.length + verifiedHadithScience.length + verifiedTranslations.length}`);
  console.log('======================================================================\n');
}

main().catch(console.error);
