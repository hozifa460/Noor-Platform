import fs from 'fs';
import path from 'path';
import { getRadioArtwork } from '../src/lib/radio/visual-engine.ts';

const radioJsonPath = path.join(process.cwd(), 'public', 'radio', 'islamic_radios.json');
const catalog = JSON.parse(fs.readFileSync(radioJsonPath, 'utf-8'));

let updatedCount = 0;
for (const cat of catalog.items) {
  for (const item of cat.subItems) {
    const artwork = getRadioArtwork(item.title, item.subtitle);
    item.imageUrl = artwork;
    updatedCount++;
  }
}

fs.writeFileSync(radioJsonPath, JSON.stringify(catalog, null, 2), 'utf-8');
console.log(`✓ Updated ${updatedCount} radio stations with tailored, high-definition scholar portraits and Islamic artworks!`);
