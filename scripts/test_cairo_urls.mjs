async function testCairoUrls() {
  const candidates = [
    'https://n0a.radiojar.com/0tpy1h0kxtzuv',
    'https://qurango.net/radio/cairo',
    'https://backup.qurango.net/radio/cairo',
    'https://live.radiomasr.net/COR-QURAN',
    'https://audio.masr.me/quran',
    'https://radio.garden/api/ara/content/listen/eOqP6Vj6/channel.mp3',
    'https://stream.eradio.gr/quran-cairo',
    'https://stream.zeno.fm/f3wvbbqmdg8uv',
    'https://stream.zeno.fm/fr5vy088kwzuv',
    'https://streams.radio.co/s0975ec186/listen'
  ];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      });
      clearTimeout(timer);
      console.log(`${res.status} [${res.headers.get('content-type')}]: ${url}`);
    } catch (e) {
      console.log(`ERR (${e.message}): ${url}`);
    }
  }
}

testCairoUrls();
