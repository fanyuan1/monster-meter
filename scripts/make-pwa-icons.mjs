/**
 * Generate favicons and PWA icons from the reference art in /reference.
 * Trimming the white margin recentres each image on its own content.
 *
 * favicon.jpg  -> tab favicons, cut to a circle so the white corners vanish.
 * appicon.jpg  -> apple touch and PWA icons, centred on white. The maskable
 *                 icon is padded so the art stays inside the ~80% safe zone.
 *
 *   node scripts/make-pwa-icons.mjs
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const REF = join(ROOT, "reference");
const WHITE = "#ffffff";

const trim = (file) => sharp(join(REF, file)).trim({ background: WHITE, threshold: 30 }).png().toBuffer();

async function favicon(size, file) {
  const art = await sharp(await trim("favicon.jpg"))
    .resize(size, size, { fit: "fill", kernel: "lanczos3" })
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${(size / 2) * 0.98}"/></svg>`,
  );
  await sharp(art).composite([{ input: mask, blend: "dest-in" }]).png().toFile(join(PUB, file));
}

async function appIcon(size, scale, file) {
  const inner = Math.round(size * scale);
  const art = await sharp(await trim("appicon.jpg"))
    .resize(inner, inner, { fit: "contain", background: WHITE, kernel: "lanczos3" })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: art, gravity: "center" }])
    .flatten({ background: WHITE })
    .png()
    .toFile(join(PUB, file));
}

await favicon(32, "favicon-32.png");
await favicon(96, "favicon.png");
await appIcon(180, 0.9, "favicon-180.png");
await appIcon(192, 0.9, "icon-192.png");
await appIcon(512, 0.9, "icon-512.png");
await appIcon(512, 0.72, "icon-maskable-512.png");
