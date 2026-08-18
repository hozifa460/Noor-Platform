import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function checkStreamUrl(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const client = u.protocol === 'https:' ? https : http;

      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Range': 'bytes=0-1024',
          },
          timeout: timeoutMs,
        },
        (res) => {
          const { statusCode, headers } = res;
          const contentType = headers['content-type'] || '';
          let bytesReceived = 0;
          res.on('data', (chunk) => {
            bytesReceived += chunk.length;
            if (bytesReceived > 128) {
              req.destroy();
              resolve({
                ok: statusCode >= 200 && statusCode < 400,
                statusCode,
                contentType,
              });
            }
          });
          res.on('end', () => {
            resolve({
              ok: statusCode >= 200 && statusCode < 400,
              statusCode,
              contentType,
            });
          });
          res.on('error', (err) => resolve({ ok: false, error: err.message }));
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT' });
      });

      req.on('error', (err) => resolve({ ok: false, error: err.message }));
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function discoverAndVerify() {
  console.log('Fetching official MP3Quran radio catalog...');
  try {
    const mp3Radios = await fetchJson('https://mp3quran.net/api/v3/radios?language=ar');
    console.log(`Found ${mp3Radios?.radios?.length || 0} radios from MP3Quran API!`);

    const verifiedList = [];
    for (const r of (mp3Radios?.radios || []).slice(0, 50)) {
      const test = await checkStreamUrl(r.url);
      if (test.ok) {
        console.log(`  ✓ VERIFIED (${test.statusCode}) [${test.contentType}]: ${r.name} -> ${r.url}`);
        verifiedList.push({
          id: `radio-mp3quran-${r.id}`,
          name: r.name,
          url: r.url,
        });
      } else {
        console.log(`  ❌ FAILED (${test.error || test.statusCode}): ${r.name} -> ${r.url}`);
      }
    }

    console.log(`Total verified from MP3Quran: ${verifiedList.length}`);
  } catch (err) {
    console.error('Failed to query MP3Quran API:', err);
  }
}

discoverAndVerify();
