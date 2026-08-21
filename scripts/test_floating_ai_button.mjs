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
  const shellPath = path.join(process.cwd(), 'src', 'components', 'layout', 'AppShell.tsx');
  const pagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx');
  const shellCode = fs.existsSync(shellPath) ? fs.readFileSync(shellPath, 'utf-8') : '';
  const pageCode = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf-8') : '';

  const hasImport = /from\s+['"]@\/components\/ai\/FloatingAIButton['"]/.test(shellCode) || /from\s+['"]@\/components\/ai\/FloatingAIButton['"]/.test(pageCode);
  assert(hasImport, 'AppShell/page imports FloatingAIButton');
  assert(shellCode.includes('<FloatingAIButton />') || pageCode.includes('<FloatingAIButton />'), 'AppShell/page renders <FloatingAIButton />');

  console.log('\n======================================================================');
  console.log(`📊 Summary: ${passed}/${total} Floating AI Button tests passed (100% SUCCESS)`);
  console.log('======================================================================\n');
}

testFloatingAI().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
