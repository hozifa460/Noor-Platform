import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const radioJsonPath = path.join(process.cwd(), 'public', 'radio', 'islamic_radios.json');
const radioData = JSON.parse(fs.readFileSync(radioJsonPath, 'utf-8'));

async function checkStreamUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const client = u.protocol === 'https:' ? https : http;

      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Range': 'bytes=0-1024',
          },
          timeout: timeoutMs,
        },
        (res) => {
          const { statusCode, headers } = res;
          const contentType = headers['content-type'] || '';
          // Consume a tiny bit of data to confirm audio stream is flowing
          let bytesReceived = 0;
          res.on('data', (chunk) => {
            bytesReceived += chunk.length;
            if (bytesReceived > 256) {
              req.destroy();
              resolve({
                ok: statusCode >= 200 && statusCode < 400,
                statusCode,
                contentType,
                bytesReceived,
              });
            }
          });
          res.on('end', () => {
            resolve({
              ok: statusCode >= 200 && statusCode < 400,
              statusCode,
              contentType,
              bytesReceived,
            });
          });
          res.on('error', (err) => {
            resolve({ ok: false, error: err.message });
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'TIMEOUT' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function testAllRadios() {
  console.log('======================================================================');
  console.log('📻 Noor Platform — Testing All Islamic Radio Live Streams');
  console.log('======================================================================\n');

  const results = [];
  let totalStreams = 0;
  let workingStreams = 0;
  let deadStreams = 0;

  for (const group of radioData.items || []) {
    console.log(`\n📂 [Category]: ${group.title}`);
    for (const item of group.subItems || []) {
      totalStreams++;
      const url = item.audioUrl || item.videoUrl;
      const res = await checkStreamUrl(url);

      if (res.ok) {
        workingStreams++;
        console.log(`  ✓ ONLINE (${res.statusCode}) [${res.contentType}]: ${item.title} -> ${url}`);
      } else {
        deadStreams++;
        console.log(`  ❌ DEAD (${res.error || res.statusCode}): ${item.title} -> ${url}`);
      }

      results.push({
        groupTitle: group.title,
        item,
        status: res,
      });
    }
  }

  console.log('\n======================================================================');
  console.log(`📊 Streams Audit Summary:`);
  console.log(`   Total Tested: ${totalStreams}`);
  console.log(`   ✓ Active & Working: ${workingStreams}`);
  console.log(`   ❌ Dead / Unreachable: ${deadStreams}`);
  console.log('======================================================================\n');

  return results;
}

testAllRadios().catch(console.error);
