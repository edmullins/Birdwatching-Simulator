// scripts/makeBirdThumbs.js
// Builds small WebP thumbnails of every bird sprite:
//   public/assets/birds/<slug>.png  ->  public/assets/birds/thumbs/<slug>.webp
//
// Why: the full-size sprites are huge (~65 MB total, up to 7 MB each). The
// pet picker shows all of them at once and the companion flies around the
// main menu, so those surfaces use the thumbnails instead. In-game sprites
// and the Field Guide are untouched.
//
// Idempotent: skips a thumbnail that is newer than its source. Re-run
// (npm run thumbs:birds) after adding a bird sprite; commit the output.
// Requires:  npm i -D sharp
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const birdsDir = path.resolve(__dirname, '..', 'public', 'assets', 'birds');
const thumbsDir = path.join(birdsDir, 'thumbs');

// Long side in px. Shown at <=110 CSS px, so 256 stays sharp on 2x screens.
const MAX_SIZE = 256;

async function isUpToDate(src, dest) {
  try {
    const [s, d] = await Promise.all([fs.stat(src), fs.stat(dest)]);
    return d.mtimeMs >= s.mtimeMs;
  } catch {
    return false; // thumbnail doesn't exist yet
  }
}

await fs.mkdir(thumbsDir, { recursive: true });

const entries = await fs.readdir(birdsDir, { withFileTypes: true });
const sprites = entries.filter((e) => e.isFile() && /\.png$/i.test(e.name));

let made = 0;
for (const { name } of sprites) {
  const src = path.join(birdsDir, name);
  const dest = path.join(thumbsDir, `${path.parse(name).name}.webp`);
  if (await isUpToDate(src, dest)) continue;

  await sharp(src)
    .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, alphaQuality: 90 }) // keeps the transparent cut-out
    .toFile(dest);
  made += 1;
}

console.log(`Thumbnails: ${made} created, ${sprites.length - made} already up to date (${sprites.length} sprites)`);