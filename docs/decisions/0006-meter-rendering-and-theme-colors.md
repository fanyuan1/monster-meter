# 0006. Meter rendering and theme colors

## Context
The level updates every animation frame. Status bars should blend with the app bars.

## Decision
- Apply each level update straight to the DOM. Do not re-render React per frame. Re-render the monster only when its mood changes.
- `THEME_COLORS` in `src/state/theme.ts` match the `--panel` CSS variable, so system status and nav bars blend into the app bars.

## Consequences
- Change `THEME_COLORS` and `--panel` together.
