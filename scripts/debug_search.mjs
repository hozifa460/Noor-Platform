import { fatwaIndexManager } from '../src/lib/fatwa-index.ts';
import fs from 'fs';
import path from 'path';

const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'fatwas_manifest.json'), 'utf8'));
fatwaIndexManager.mergeItems(manifest);

console.log('Total items in index:', manifest.length);

console.log('\n--- Search: أصلي في الطيارة ---');
const r1 = fatwaIndexManager.searchIndex('أصلي في الطيارة');
console.log('Results count:', r1.length);
r1.slice(0, 3).forEach((item, i) => console.log(`  ${i+1}. [${item.id}] ${item.title} (${item.scholar})`));

console.log('\n--- Search: المسح على الشراب ---');
const r2 = fatwaIndexManager.searchIndex('المسح على الشراب');
console.log('Results count:', r2.length);
r2.slice(0, 3).forEach((item, i) => console.log(`  ${i+1}. [${item.id}] ${item.title} (${item.scholar})`));

console.log('\n--- Search: هندسة الفضاء والفيزياء النووية ---');
const r3 = fatwaIndexManager.searchIndex('هندسة الفضاء والفيزياء النووية');
console.log('Results count:', r3.length);
r3.slice(0, 3).forEach((item, i) => console.log(`  ${i+1}. [${item.id}] ${item.title} (${item.scholar})`));
