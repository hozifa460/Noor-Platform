#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const isCloudflare = Boolean(process.env.CF_PAGES || process.env.CLOUDFLARE_PAGES);
const apiDir = join(process.cwd(), 'src', 'app', 'api');
const tempApiDir = join(process.cwd(), 'src', 'app', '_api_cf_temp');

let moved = false;

if (isCloudflare && existsSync(apiDir)) {
  console.log('⚡ [build.mjs] Cloudflare Pages detected: temporarily stashing src/app/api for static export...');
  renameSync(apiDir, tempApiDir);
  moved = true;
}

try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: process.env,
  });
} finally {
  if (moved && existsSync(tempApiDir)) {
    console.log('⚡ [build.mjs] Restoring src/app/api...');
    renameSync(tempApiDir, apiDir);
  }
}
