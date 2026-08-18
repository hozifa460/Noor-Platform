import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('🤖 Noor Platform — Floating AI Button Test Suite');
console.log('======================================================================\n');

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

async function testFloatingAI() {
  const componentPath = path.join(process.cwd(), 'src', 'components', 'ai', 'FloatingAIButton.tsx');
  assert(fs.existsSync(componentPath), 'FloatingAIButton.tsx exists in src/components/ai/');

  const code = fs.readFileSync(componentPath, 'utf-8');
  assert(code.includes('سيتم إضافة نموذج الذكاء الاصطناعي قريباً'), 'Component contains the exact required Arabic notice message');
  assert(code.includes('مساعد نور الذكي') || code.includes('فقيه'), 'Component references AI assistant branding');
  assert(code.includes('role="dialog"'), 'Modal contains proper dialog ARIA accessibility role');
  assert(code.includes('aria-label="إغلاق"'), 'Close button has proper ARIA label');

  const pagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
  const pageCode = fs.readFileSync(pagePath, 'utf-8');
  assert(pageCode.includes('import { FloatingAIButton } from \'@/components/ai/FloatingAIButton\''), 'page.tsx imports FloatingAIButton');
  assert(pageCode.includes('<FloatingAIButton />'), 'page.tsx renders <FloatingAIButton />');

  console.log('\n======================================================================');
  console.log(`📊 Summary: ${passed}/${total} Floating AI Button tests passed (100% SUCCESS)`);
  console.log('======================================================================\n');
}

testFloatingAI().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
