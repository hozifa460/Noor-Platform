async function testMoreStreams() {
  const candidates = [
    'https://n0a.radiojar.com/0tpy1h0kxtzuv',
    'https://stream.radiojar.com/0tpy1h0kxtzuv',
    'https://streams.radio.co/s0975ec186/listen',
    'https://al-ansaar.simplestreaming.co.za/listen/al-ansaar_radio/radio.mp3',
    'https://eu4.fastcast4u.com/proxy/aabdul00?mp=/1',
    'https://radio.mp3islam.com/listen/quran_radio/radio.mp3',
    'https://l3.itworkscdn.net/smcquranlive/quranradiolive/icecast.audio',
    'https://qurango.net/radio/mix',
    'https://qurango.net/radio/tarateel',
    'https://backup.qurango.net/radio/mohammad_altablaway',
    'https://backup.qurango.net/radio/mustafa_ismail',
    'https://backup.qurango.net/radio/mahmoud_khalil_alhussary',
    'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
    'https://backup.qurango.net/radio/abdulbasit_abdulsamad_warsh',
    'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi',
    'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad',
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-512' } });
      console.log(`[${res.status}] ${res.headers.get('content-type')}: ${url}`);
    } catch (e) {
      console.log(`[ERR]: ${url}`);
    }
  }
}
testMoreStreams();
