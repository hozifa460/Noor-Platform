import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '..', 'public', 'icon.svg'));

const [buf192, buf512] = await Promise.all([
  sharp(svg).resize(192, 192).png().toBuffer(),
  sharp(svg).resize(512, 512).png().toBuffer(),
]);

writeFileSync(join(__dirname, '..', 'public', 'icon-192.png'), buf192);
writeFileSync(join(__dirname, '..', 'public', 'icon-512.png'), buf512);

console.log('Icons generated successfully');
