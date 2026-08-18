import fs from 'fs';
import path from 'path';

async function checkTree() {
  const url = 'https://huggingface.co/api/datasets/hozifa1/fatawaset/tree/main?recursive=true';
  const res = await fetch(url);
  const data = await res.json();
  console.log('Total files found in repo:', data.length);
  const jsonFiles = data.filter((d) => d.path.endsWith('.json') || d.path.endsWith('.jsonl'));
  console.log('JSON / JSONL files:');
  for (const f of jsonFiles) {
    console.log(` - ${f.path} (${(f.size / (1024 * 1024)).toFixed(2)} MB)`);
  }
}

checkTree().catch(console.error);
