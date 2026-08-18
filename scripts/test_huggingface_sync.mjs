import { DEFAULT_REPOSITORIES, fileUrl, candidateIndexUrls } from '../src/lib/repositories.ts';
import { fetchMergedIndex, fetchJsonWithFallback } from '../src/lib/fetcher.ts';
import { normalizeContentFile } from '../src/lib/sheikh.ts';
import { validateSafeUrl } from '../src/lib/security.ts';

async function runHuggingFaceSyncTests() {
  console.log('🤗 Starting Hugging Face Repositories Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${details}`);
      failed++;
    }
  }

  // 1. Validate Default Repositories Configuration
  console.log('--- Test Suite 1: Default Repository Configuration ---');
  const dawahRepo = DEFAULT_REPOSITORIES.find((r) => r.id === 'hf-telewat-dawah');
  const fatwaRepo = DEFAULT_REPOSITORIES.find((r) => r.id === 'hf-fatawa');

  assert(Boolean(dawahRepo), 'Hugging Face Telewat & Dawah repo is configured');
  assert(dawahRepo?.owner === 'hozifa1' && dawahRepo?.repo === 'Telewat_Daawa_And_Channels', 'Correct owner & repo for Dawah dataset');
  assert(Boolean(fatwaRepo), 'Hugging Face Fatawa dataset is configured');
  assert(fatwaRepo?.owner === 'hozifa1' && fatwaRepo?.repo === 'fatawaset', 'Correct owner & repo for Fatawa dataset');

  // 2. Validate URL Construction & SSRF Whitelist
  console.log('\n--- Test Suite 2: URL Construction & Security Whitelist ---');
  const sampleUrl = fileUrl(dawahRepo, 'AL-HAFEZ/AL-HAFEZ.videos.json');
  console.log('  Sample Dawah URL:', sampleUrl);
  assert(sampleUrl.startsWith('https://huggingface.co/datasets/hozifa1/Telewat_Daawa_And_Channels/resolve/main/Dawah_And_Channels/AL-HAFEZ/AL-HAFEZ.videos.json'), 'Generates valid HF resolve URL');

  const isSafe = await validateSafeUrl(sampleUrl);
  assert(isSafe, 'Hugging Face resolve URL is allowed through SSRF security guard');

  // 3. Fetch Merged Index from Hugging Face
  console.log('\n--- Test Suite 3: Fetch Merged Index from Hugging Face ---');
  const { files, perRepo } = await fetchMergedIndex(DEFAULT_REPOSITORIES, 15000);
  console.log(`  Discovered ${files.length} total files across repositories.`);
  for (const repo of perRepo) {
    console.log(`    Repo [${repo.repoId}]: ok=${repo.ok}, fileCount=${repo.fileCount} ${repo.error ? `(error: ${repo.error})` : ''}`);
  }

  assert(files.length > 50, `Fetched merged index with ${files.length} files (expected > 50)`);
  assert(perRepo.some((r) => r.repoId === 'hf-telewat-dawah' && r.ok && r.fileCount > 0), 'Dawah repo index fetched successfully');
  assert(perRepo.some((r) => r.repoId === 'hf-fatawa' && r.ok && r.fileCount > 0), 'Fatawa repo index/tree fetched successfully');

  // 4. Fetch and Normalize Sample Dawah File
  console.log('\n--- Test Suite 4: Fetch & Normalize Sample Dawah File ---');
  const sampleDawahFile = files.find((f) => f.includes('AL-HAFEZ') || f.includes('videos.json')) || files[0];
  console.log(`  Fetching sample file: ${sampleDawahFile}`);
  const dawahRes = await fetchJsonWithFallback(DEFAULT_REPOSITORIES, sampleDawahFile, 15000);
  assert(dawahRes.ok && dawahRes.data !== null, 'Fetched sample Dawah JSON file');

  if (dawahRes.data) {
    const { items, sheikhMeta } = normalizeContentFile(dawahRes.data, sampleDawahFile, dawahRes.sourceId);
    assert(items.length > 0, `Normalized ${items.length} media items from sample file`);
    console.log(`  Sample item: "${items[0]?.title}" (Section: ${items[0]?.section}, Sheikh: ${items[0]?.sheikhName})`);
  }

  // 5. Fetch and Normalize Sample Fatwa File
  console.log('\n--- Test Suite 5: Fetch & Normalize Sample Fatwa File ---');
  const sampleFatwaFile = files.find((f) => f.includes('fatawa') || f.includes('فتاوى')) || 'fatawa_binbaz.json';
  console.log(`  Fetching sample fatwa file: ${sampleFatwaFile}`);
  const fatwaRes = await fetchJsonWithFallback(DEFAULT_REPOSITORIES, sampleFatwaFile, 25000);
  assert(fatwaRes.ok && fatwaRes.data !== null, 'Fetched sample Fatwa JSON file from Hugging Face');

  if (fatwaRes.data) {
    const { items } = normalizeContentFile(fatwaRes.data, sampleFatwaFile, fatwaRes.sourceId);
    assert(items.length > 0, `Normalized ${items.length} fatwa items`);
    assert(items[0]?.section === 'fatwa', `Correctly classified as 'fatwa' section (got ${items[0]?.section})`);
    console.log(`  Sample fatwa: "${items[0]?.title?.slice(0, 60)}..." (Scholar: ${items[0]?.sheikhName || 'N/A'})`);
  }

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runHuggingFaceSyncTests().catch((err) => {
  console.error('Hugging Face integration test failed:', err);
  process.exit(1);
});
