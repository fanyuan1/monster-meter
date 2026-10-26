/**
 * Generate PWA icons from the favicon.
 *
 * "any" icons keep the transparent background; the maskable icon is padded
 * onto white so the ogre stays inside the ~80% safe zone after OS masking.
 *
 *   node scripts/make-pwa-icons.mjs
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const SRC = join(PUB, "favicon-180.png");

for (const size of [192, 512]) {
  await sharp(SRC).resize(size, size, { kernel: "lanczos3" }).png().toFile(join(PUB, `icon-${size}.png`));
}

const inner = Math.round(512 * 0.7);
const art = await sharp(SRC).resize(inner, inner, { kernel: "lanczos3" }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffffff" } })
  .composite([{ input: art, gravity: "center" }])
  .png()
  .toFile(join(PUB, "icon-maskable-512.png"));
