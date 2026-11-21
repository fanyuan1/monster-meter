import { readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "monsters");
const MOODS = ["happy", "indifferent", "mad", "verymad"];
const GAP = 16;
const SIZE = 512;
const FILL = 0.9;
const T = { r: 0, g: 0, b: 0, alpha: 0 };

function isChecker(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 18 && min >= 180;
}

function stripChecker(data, W, H) {
  const visited = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (visited[p]) return;
    visited[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const o = p * 4;
    if (!isChecker(data[o], data[o + 1], data[o + 2])) continue;
    data[o + 3] = 0;
    const x = p % W;
    const y = (p / W) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

async function extractCell(file, region, outName) {
  const { data, info } = await sharp(join(DIR, file))
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  stripChecker(data, info.width, info.height);

  const cellPng = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const trimmed = await sharp(cellPng).trim({ threshold: 10 }).png().toBuffer();

  const inner = Math.round(SIZE * FILL);
  const resized = await sharp(trimmed)
    .resize(inner, inner, { fit: "inside", background: T })
    .png()
    .toBuffer();

  const m = await sharp(resized).metadata();
  const left = Math.floor((SIZE - m.width) / 2);
  const top = Math.floor((SIZE - m.height) / 2);
  const out = await sharp(resized)
    .extend({ top, bottom: SIZE - m.height - top, left, right: SIZE - m.width - left, background: T })
    .png()
    .toBuffer();

  writeFileSync(join(DIR, outName), out);
  return `${m.width}x${m.height}`;
}

async function processSheet(file, id) {
  const meta = await sharp(join(DIR, file)).metadata();
  const W = meta.width;
  const H = meta.height;
  const hw = W >> 1;
  const hh = H >> 1;
  const regions = [
    { left: 0, top: 0, width: hw - GAP, height: hh - GAP },
    { left: hw + GAP, top: 0, width: W - hw - GAP, height: hh - GAP },
    { left: 0, top: hh + GAP, width: hw - GAP, height: H - hh - GAP },
    { left: hw + GAP, top: hh + GAP, width: W - hw - GAP, height: H - hh - GAP },
  ];
  console.log(`${file} -> ${id} (${W}x${H})`);
  for (let i = 0; i < 4; i++) {
    const size = await extractCell(file, regions[i], `${id}-${MOODS[i]}.png`);
    console.log(`  ${id}-${MOODS[i]}.png — content ${size}`);
  }
  unlinkSync(join(DIR, file));
}

const moodRe = new RegExp(`-(${MOODS.join("|")})\\.png$`, "i");
const sheets = readdirSync(DIR).filter((f) => /\.png$/i.test(f) && !moodRe.test(f));

if (sheets.length === 0) {
  console.log("No sheet files found (nothing matching *.png without a -<mood> suffix).");
}
for (const file of sheets) {
  const id = file.replace(/\.png$/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  await processSheet(file, id);
}
