import fs from 'fs';
import path from 'path';

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');
const buildHash = `v2-${Date.now().toString(36)}`;

// Update Service Worker version with unique build hash
const swPath = path.join(root, 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf-8');
  swContent = swContent.replace(/const CACHE_VERSION = ['"][^'"]+['"];/, `const CACHE_VERSION = '${buildHash}';`);
  fs.writeFileSync(swPath, swContent);
  console.log(`✓ Service Worker updated with release cache version: ${buildHash}`);
}

if (fs.existsSync(standaloneDir)) {
  const staticSrc = path.join(root, '.next', 'static');
  const staticDest = path.join(standaloneDir, '.next', 'static');
  const publicSrc = path.join(root, 'public');
  const publicDest = path.join(standaloneDir, 'public');

  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
  }

  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  }

  console.log('✓ Standalone static assets copied successfully (Cross-Platform).');
}
