# 0005. Monster artwork pipeline

## Context
Artwork arrives as 2x2 expression sheets with a baked-in transparency checkerboard. Every mood must share one canvas size so the monster does not jump when the mood changes.

## Decision
- Loader (`Monster.tsx`): `import.meta.glob` picks up `src/assets/monsters/<id>-<mood>.png`. A single `<id>.png` is a fallback for every mood. When no file exists, a hand-built SVG renders instead. See `src/assets/monsters/README.md`.
- Mood changes crossfade: `CrossfadeImage` stacks layers and fades the new one in. Older layers are pruned once the newest finishes.
- Run the scripts in this order:
  1. `node scripts/extract-sheets.mjs`: reads each sheet that is not already `<id>-<mood>.png`. Cells are happy (top-left), indifferent (top-right), mad (bottom-left), very mad (bottom-right). It flood-fills from the cell borders to drop the checkerboard, trims to the monster, and centres it on a 512 px transparent square (content fills 0.9). It insets the crop by `GAP` (16 px) to skip separator lines. The id is the filename without non-alphanumerics (`aqua-eye.png` becomes `aquaeye`). It deletes the source sheet.
  2. `node scripts/strip-checkerboard.mjs`: for images that are fully opaque, flood-fills from the borders and clears light neutral pixels (low saturation, min channel at least 180: white about 253 or grey about 202). The monsters have a continuous dark outline, so interior whites (eyes, teeth, steam) stay. It skips images that already have transparency, so it is safe to re-run.
  3. `node scripts/normalize-frames.mjs`: trims each image to its content, scales it to fit 0.9 of 512 px, and centres it on a transparent square. Needs real transparency, so run it after step 2.
- `node scripts/make-pwa-icons.mjs` builds icons from `/reference`. `favicon.jpg` becomes circular tab favicons. `appicon.jpg` becomes the apple touch and PWA icons on white. The maskable icon is padded to stay inside the 80% safe zone. Trimming the white margin recentres each image.

## Consequences
- Scripts change files in `src/assets/monsters/` and `public/`. Commit the results.
