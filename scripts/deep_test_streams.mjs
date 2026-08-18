import fs from 'fs';
import path from 'path';

async function testEveryStreamDetailed() {
  const radioPath = path.join(process.cwd(), 'public', 'radio', 'islamic_radios.json');
  const catalog = JSON.parse(fs.readFileSync(radioPath, 'utf-8'));

  console.log('Testing all 158 radio streams in catalog with 8s timeout...');
  const deadList = [];
  const aliveList = [];

  for (const cat of catalog.items) {
    for (const r of cat.subItems) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(r.audioUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-512' },
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok || res.status === 206) {
          aliveList.push(r);
        } else {
          console.log(`❌ FAILED (${res.status}): ${r.title} -> ${r.audioUrl}`);
          deadList.push({ ...r, status: res.status });
        }
      } catch (e) {
        console.log(`❌ TIMEOUT/ERROR (${e.message}): ${r.title} -> ${r.audioUrl}`);
        deadList.push({ ...r, error: e.message });
      }
    }
  }

  console.log(`\nResults: ${aliveList.length} ALIVE, ${deadList.length} DEAD`);
  if (deadList.length > 0) {
    console.log('Dead streams:', deadList.map(d => `${d.title}: ${d.audioUrl} (${d.status || d.error})`));
  }
}

testEveryStreamDetailed();
