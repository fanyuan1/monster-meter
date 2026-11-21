import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "monsters");
const SIZE = 512;
const FILL = 0.9;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function normalize(file) {
  const input = readFileSync(file);

  const trimmed = await sharp(input).trim({ threshold: 10 }).toBuffer();

  const inner = Math.round(SIZE * FILL);
  const resized = await sharp(trimmed)
    .resize(inner, inner, { fit: "inside", background: TRANSPARENT })
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const left = Math.floor((SIZE - meta.width) / 2);
  const top = Math.floor((SIZE - meta.height) / 2);
  const out = await sharp(resized)
    .extend({
      top,
      bottom: SIZE - meta.height - top,
      left,
      right: SIZE - meta.width - left,
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  writeFileSync(file, out);
  return { w: meta.width, h: meta.height };
}

const files = readdirSync(DIR).filter((f) => /\.png$/i.test(f));
for (const f of files) {
  const { w, h } = await normalize(join(DIR, f));
  console.log(`✓ ${f} — content ${w}x${h} centered on ${SIZE}x${SIZE}`);
}
