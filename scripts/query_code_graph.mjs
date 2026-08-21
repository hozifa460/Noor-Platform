#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const graphPath = path.join(root, "docs", "code_knowledge_graph.json");

if (!fs.existsSync(graphPath)) {
  console.error("❌ Code Knowledge Graph not found. Run postbuild first.");
  process.exit(1);
}

const term = process.argv[2];
if (!term) {
  console.log("Usage: node scripts/query_code_graph.mjs <symbol_or_path>");
  process.exit(0);
}

const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
console.log('\n=======================================================');
console.log(`🔎 Noor Platform — Code Graph Query: '${term}'`);
console.log('=======================================================');

// 1. Match Symbols
const matchedSymbols = Object.values(graph.symbols).filter(s => s.name.toLowerCase().includes(term.toLowerCase()));
if (matchedSymbols.length > 0) {
  console.log("\n📌 Matched AST Symbols (" + matchedSymbols.length + "):");
  for (const s of matchedSymbols.slice(0, 15)) {
    console.log("  • [" + s.kind + "] " + s.name + " (in " + s.file + ")");
  }
}

// 2. Match Files
const matchedFiles = Object.keys(graph.files).filter(f => f.toLowerCase().includes(term.toLowerCase()));
if (matchedFiles.length > 0) {
  console.log("\n📁 Matched Source Files (" + matchedFiles.length + "):");
  for (const f of matchedFiles.slice(0, 10)) {
    const fi = graph.files[f];
    console.log("  • " + f + " (" + fi.type + ", " + fi.loc + " LOC, Stores: [" + fi.storesUsed.join(", ") + "])");
  }
}

// 3. Match Callers & Importers
const importers = graph.dependencies.filter(d => d.to.toLowerCase().includes(term.toLowerCase())).map(d => d.from);
if (importers.length > 0) {
  const uniqueImporters = [...new Set(importers)];
  console.log("\n🔗 Imported By (" + uniqueImporters.length + " files):");
  for (const imp of uniqueImporters.slice(0, 15)) {
    console.log("  ↳ " + imp);
  }
}

// 4. Match Zustand Store Callers
const storeCallers = graph.callGraph.filter(c => c.target.toLowerCase().includes(term.toLowerCase())).map(c => c.caller);
if (storeCallers.length > 0) {
  const uniqueStoreCallers = [...new Set(storeCallers)];
  console.log("\n🗄️ Zustand Store Callers (" + uniqueStoreCallers.length + " components):");
  for (const sc of uniqueStoreCallers.slice(0, 15)) {
    console.log("  ↳ " + sc);
  }
}

console.log("\n=======================================================\n");
