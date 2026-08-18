import { execSync } from 'child_process';
import path from 'path';

const testSuites = [
  'scripts/test_arabic_normalizer.mjs',
  'scripts/test_floating_ai_button.mjs',
  'scripts/test_performance_and_hubs.mjs',
];

console.log('🚀 Running Noor Platform Official Test Suite...\n');

let allPassed = true;

for (const suite of testSuites) {
  const fullPath = path.join(process.cwd(), suite);
  console.log(`▶ Executing: ${suite}`);
  try {
    const output = execSync(`node "${fullPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Suite failed: ${suite}`);
    allPassed = false;
  }
  console.log('\n----------------------------------------\n');
}

if (!allPassed) {
  console.error('💥 Test run failed.');
  process.exit(1);
} else {
  console.log('🎉 ALL TEST SUITES PASSED (100% SUCCESS)!');
  process.exit(0);
}
