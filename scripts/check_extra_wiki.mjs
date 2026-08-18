const extra = [
  { id: 'ajmi', name: 'أحمد بن علي العجمي', wiki: 'أحمد_العجمي' },
  { id: 'ayyub', name: 'محمد أيوب', wiki: 'محمد_أيوب' },
  { id: 'ali_jaber', name: 'علي_عبد_الله_جابر', wiki: 'علي_عبد_الله_جابر' },
  { id: 'shatri', name: 'أبو بكر الشاطري', wiki: 'أبو_بكر_الشاطري' },
  { id: 'thubaiti', name: 'عبد البارئ الثبيتي', wiki: 'عبد_الباري_الثبيتي' },
  { id: 'jibreel', name: 'محمد جبريل', wiki: 'محمد_جبريل_(قارئ)' },
  { id: 'fares_abbad', name: 'فارس عباد', wiki: 'فارس_عباد' },
];

async function checkExtra() {
  for (const s of extra) {
    try {
      const url = `https://ar.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(s.wiki)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'NoorPlatform/1.0' } });
      if (res.ok) {
        const data = await res.json();
        const img = data.thumbnail?.source || data.originalimage?.source;
        console.log(`[${s.name}]: ${img || 'NO_IMG'}`);
      } else {
        console.log(`[${s.name}]: HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`[${s.name}]: ${e.message}`);
    }
  }
}
checkExtra();
