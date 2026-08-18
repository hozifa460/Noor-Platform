async function testFetch() {
  try {
    const res = await fetch('https://www.mp3quran.net/api/v3/radios?language=ar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body length:', text.length);
    const json = JSON.parse(text);
    console.log('Radios count:', json.radios?.length);
    console.log('Sample radio:', json.radios?.[0]);
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}
testFetch();
