import { execSync } from 'child_process';
import path from 'path';

const testSuites = [
  'scripts/test_arabic_normalizer.mjs',
  'scripts/test_floating_ai_button.mjs',
  'scripts/test_performance_and_hubs.mjs',
  'scripts/test_security_audit.mjs',
  'scripts/test_fatwa_inverted_index.mjs',
  'scripts/test_books_integration.mjs',
  'scripts/test_hadith_integration.mjs',
  'scripts/test_quran_hub_integration.mjs',
  'scripts/test_radio_flow.mjs',
  'scripts/test_adhkar_hub_integration.mjs',
  'scripts/test_hadith_verification_and_sharh.mjs',
];

console.log('🚀 Running Noor Platform Comprehensive Quality & Regression Test Suite...\n');

let allPassed = true;
let totalSuites = 0;
let passedSuites = 0;

for (const suite of testSuites) {
  totalSuites++;
  const fullPath = path.join(process.cwd(), suite);
  console.log(`▶ Executing: ${suite}`);
  try {
    execSync(`npx tsx "${fullPath}"`, { stdio: 'inherit' });
    passedSuites++;
  } catch (err) {
    console.error(`❌ Suite failed: ${suite}`);
    allPassed = false;
  }
  console.log('\n----------------------------------------\n');
}

console.log(`📊 Test Summary: ${passedSuites}/${totalSuites} Test Suites Passed.`);

if (!allPassed) {
  console.error('💥 Test suite failed.');
  process.exit(1);
} else {
  console.log('🎉 ALL TEST SUITES PASSED (100% SUCCESS)!');
  process.exit(0);
}
