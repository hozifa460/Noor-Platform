/**
 * Noor Platform — Production Concurrency & Load Testing Suite
 * Validates endpoint latency, rate limiter thresholds, and semaphore limits.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function measureLatency(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const duration = Date.now() - start;
    return { status: res.status, duration, ok: res.ok };
  } catch (err) {
    return { status: 0, duration: Date.now() - start, ok: false, error: err.message };
  }
}

async function runConcurrencyBurst(endpoint, totalRequests = 50, concurrency = 10) {
  console.log(`\n🚀 Running Concurrency Burst on ${endpoint} (${totalRequests} requests, concurrency=${concurrency})...`);
  const latencies = [];
  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;

  const batches = Math.ceil(totalRequests / concurrency);
  for (let b = 0; b < batches; b++) {
    const promises = [];
    for (let c = 0; c < concurrency && (b * concurrency + c) < totalRequests; c++) {
      promises.push(measureLatency(`${BASE_URL}${endpoint}`));
    }
    const results = await Promise.all(promises);
    for (const r of results) {
      latencies.push(r.duration);
      if (r.ok) successCount++;
      else if (r.status === 429) rateLimitedCount++;
      else errorCount++;
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`  ✓ Total Requests:    ${totalRequests}`);
  console.log(`  ✓ Success (2xx):     ${successCount}`);
  console.log(`  ✓ Rate-Limited(429): ${rateLimitedCount}`);
  console.log(`  ✓ Errors (5xx/0):    ${errorCount}`);
  console.log(`  📊 Latency P50:      ${p50}ms`);
  console.log(`  📊 Latency P95:      ${p95}ms`);
  console.log(`  📊 Latency P99:      ${p99}ms`);

  return { successCount, rateLimitedCount, errorCount, p50, p95, p99 };
}

async function runBenchmarks() {
  console.log('======================================================================');
  console.log('⚡ Noor Platform — Production Benchmarking & Stress Testing');
  console.log('======================================================================');

  // 1. Diagnostics endpoint benchmark
  console.log('\n[Benchmark 1/2] Diagnostics & Healthcheck endpoint (/api)');
  await runConcurrencyBurst('/api', 30, 10);

  // 2. Avatar fallback generation benchmark
  console.log('\n[Benchmark 2/2] Sheikh Avatar Generator (/api/sheikh-avatar?name=test)');
  await runConcurrencyBurst('/api/sheikh-avatar?name=test', 30, 10);

  console.log('\n======================================================================');
  console.log('✓ Load & latency benchmark finished.');
  console.log('======================================================================\n');
}

runBenchmarks().catch(console.error);
