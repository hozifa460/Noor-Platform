#!/usr/bin/env node
/**
 * Noor Platform — Fatwa Browse Index Builder (Phase 3)
 * ====================================================
 * Reads the existing heavy category shards (public/data/shards/*.json, 142MB total)
 * and produces a LIGHT browse index with NO answer bodies:
 *
 *   public/data/fatwa_browse/{category}.json
 *     Array of compact records:
 *       [id, title, scholarIdx, hasAudio]  (tuple arrays keep it tiny)
 *
 *   public/data/fatwa_browse/scholars.json
 *     { "0": "الشيخ عبد العزيز بن باز", ... }  (interned scholar names)
 *
 *   public/data/fatwa_browse/manifest.json
 *     { version, totalCount, updatedAt,
 *       categories: [{ id, count, file, scholars: {idx:count} }] }
 *
 * Result: full-category browsing (all 226,580 items) downloads ~15-20MB of
 * pure index instead of 142MB with answers; answers stream separately via
 * /data/fatwa_answers (phase 1).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SHARDS_DIR = path.join(ROOT, 'public', 'data', 'shards');
const OUT_DIR = path.join(ROOT, 'public', 'data', 'fatwa_browse');

const CATEGORIES = ['salah', 'zakah', 'muamalat', 'aqeedah', 'family', 'contemporary'];

function log(m) {
  console.log(m);
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const scholars = [];
  const scholarIdx = new Map();
  const internScholar = (name) => {
    if (!scholarIdx.has(name)) {
      scholarIdx.set(name, scholars.length);
      scholars.push(name);
    }
    return scholarIdx.get(name);
  };

  const manifest = {
    version: '1.0.0',
    totalCount: 0,
    updatedAt: new Date().toISOString(),
    categories: [],
  };

  let grand = 0;

  for (const cat of CATEGORIES) {
    const srcPath = path.join(SHARDS_DIR, `${cat}.json`);
    if (!fs.existsSync(srcPath)) {
      log(`⚠️ missing shard: ${srcPath} — skipped`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    const tuples = [];
    const catScholarCounts = {};

    for (const it of raw) {
      const id = String(it.id || '');
      if (!id) continue;
      const sIdx = internScholar(String(it.scholar || '').trim() || 'عالم ومفتي');
      catScholarCounts[sIdx] = (catScholarCounts[sIdx] || 0) + 1;
      // tuple: [id, title, scholarIdx, hasAudio(0/1)]
      tuples.push([id, String(it.title || ''), sIdx, it.audioUrl ? 1 : 0]);
    }

    const outFile = path.join(OUT_DIR, `${cat}.json`);
    fs.writeFileSync(outFile, JSON.stringify(tuples), 'utf8');
    const mb = fs.statSync(outFile).size / 1024 / 1024;

    grand += tuples.length;
    manifest.categories.push({
      id: cat,
      count: tuples.length,
      file: `/data/fatwa_browse/${cat}.json`,
      sizeMB: Number(mb.toFixed(2)),
      topScholars: Object.fromEntries(
        Object.entries(catScholarCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
      ),
    });

    log(`✓ ${cat}: ${tuples.length.toLocaleString('en')} items → ${mb.toFixed(2)}MB`);
  }

  const scholarsFile = path.join(OUT_DIR, 'scholars.json');
  fs.writeFileSync(
    scholarsFile,
    JSON.stringify(Object.fromEntries(scholars.map((n, i) => [String(i), n]))),
    'utf8'
  );

  manifest.totalCount = grand;
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1), 'utf8');

  log('');
  log('══════════════════════════════════════════');
  log(`✅ Browse index built: ${grand.toLocaleString('en')} items across ${manifest.categories.length} categories`);
  log(`   scholars.json: ${scholars.length.toLocaleString('en')} unique scholar names`);
}

main();
