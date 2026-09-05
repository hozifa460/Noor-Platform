import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(process.cwd(), 'public');
const svg = readFileSync(join(publicDir, 'icon.svg'));

const [buf192, buf512] = await Promise.all([
  sharp(svg).resize(192, 192).png().toBuffer(),
  sharp(svg).resize(512, 512).png().toBuffer(),
]);

writeFileSync(join(publicDir, 'icon-192.png'), buf192);
writeFileSync(join(publicDir, 'icon-512.png'), buf512);

console.log('Icons generated successfully');
